import {
  minutesBetween,
  mobileInterventionStatus,
  mobileKpis
} from '@/modules/maintenance/mobile-interventions/domain/mobileIntervention'
import type {
  MobileInterventionApi,
  MobileTeamSummary
} from '@/modules/maintenance/mobile-interventions/types/mobileIntervention.types'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readBoolean, readDateTime, readNumber, readString, readStringList } from '../../http/input'
import { requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { MAINTENANCE_MESSAGES } from './messages'
import { maintenanceSettings } from './settings'
import { techniciansApi } from './technicians'
import { createWorkOrder } from './workOrders'

/** Shortest observation accepted when a mission could not solve the problem. */
const MIN_TEXT = 10

export function mobileInterventionsApi(db: MockDatabase): MobileInterventionApi[] {
  const types = new Map(db.missionTypes.all().map((type) => [type.no, type]))
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const names = new Map(
    techniciansApi(db).map((technician) => [technician.no, technician.fullName])
  )
  return db.mobileInterventions.all().map((row) => ({
    ...row,
    missionTypeName: types.get(row.missionTypeNo)?.name ?? row.missionTypeNo,
    isControl: types.get(row.missionTypeNo)?.isControl ?? false,
    vehiclePlate: plates.get(row.vehicleNo) ?? row.vehicleNo,
    crewNames: row.crewNos.map((no) => names.get(no) ?? no).join(', '),
    delayMin: minutesBetween(row.departedAt, row.arrivedAt),
    status: mobileInterventionStatus(row)
  }))
}

export function mobileTeamSummary(db: MockDatabase, month: string): MobileTeamSummary {
  return {
    month,
    kpis: mobileKpis(mobileInterventionsApi(db), month),
    targets: maintenanceSettings(db).mobileTeam
  }
}

export function registerMobileInterventionsHandlers(router: MockRouter, db: MockDatabase): void {
  const respond = (no: string) => ok(mobileInterventionsApi(db).find((row) => row.no === no))

  function open(no: string) {
    const row = db.mobileInterventions.findOrFail(no)
    if (row.closedAt) throw conflict(MAINTENANCE_MESSAGES.interventionClosed)
    return row
  }

  // Static path first: it must not be read as an intervention number.
  router.get(
    '/maintenance/mobile-interventions/summary',
    { feature: 'MOBILEINTERVENTION', action: 'read' },
    (request) => {
      const month = typeof request.query.month === 'string' ? request.query.month : ''
      return ok(mobileTeamSummary(db, /^\d{4}-\d{2}$/.test(month) ? month : todayIso().slice(0, 7)))
    }
  )

  registerCrudResource(router, {
    basePath: '/maintenance/mobile-interventions',
    feature: 'MOBILEINTERVENTION',
    collection: db.mobileInterventions,
    list: () => mobileInterventionsApi(db),
    searchColumns: ['no', 'vehiclePlate', 'location'],
    optionFields: { status: 'mobileInterventionStatus' },
    create: (input) => {
      const missionTypeNo = requireReference(db.missionTypes, input, 'missionTypeNo')
      if (!db.missionTypes.findOrFail(missionTypeNo).active) {
        throw unprocessable(MAINTENANCE_MESSAGES.missionTypeInactive)
      }
      const vehicle = db.vehicles.findOrFail(requireReference(db.vehicles, input, 'vehicleNo'))
      if (vehicle.removal) throw unprocessable(MAINTENANCE_MESSAGES.vehicleRemoved)
      const busy = db.mobileInterventions
        .all()
        .find((row) => row.vehicleNo === vehicle.no && !row.closedAt)
      if (busy) throw conflict(MAINTENANCE_MESSAGES.interventionInProgress, { no: busy.no })
      const location = readString(input, 'location', { required: true })
      const departedAt = readDateTime(input, 'departedAt') ?? nowIsoDateTime()
      if (departedAt > nowIsoDateTime()) throw unprocessable(MAINTENANCE_MESSAGES.dateInFuture)
      const crewNos = [...new Set(readStringList(input, 'crewNos'))]
      if (!crewNos.length) throw unprocessable(MAINTENANCE_MESSAGES.crewMissing)
      for (const no of crewNos) {
        if (!db.technicians.findOrFail(no).active) {
          throw unprocessable(MAINTENANCE_MESSAGES.technicianInactive)
        }
      }
      return {
        no: nextNo(
          db.mobileInterventions.all().map((row) => row.no),
          `IM-${departedAt.slice(0, 4)}-`,
          4
        ),
        missionTypeNo,
        vehicleNo: vehicle.no,
        location,
        departedAt,
        crewNos,
        arrivedAt: null,
        closedAt: null,
        closedBy: null,
        resolved: null,
        observation: '',
        checkCount: null,
        positiveCount: null,
        checkComment: '',
        workOrderNo: null
      }
    },
    update: () => {
      throw conflict(MAINTENANCE_MESSAGES.interventionUseActions)
    }
  })

  router.post(
    '/maintenance/mobile-interventions/:no/arrive',
    { feature: 'MOBILEINTERVENTION', action: 'update' },
    (request) => {
      const row = open(routeParam(request, 'no'))
      const arrivedAt = readDateTime(readBody(request), 'arrivedAt') ?? nowIsoDateTime()
      if (arrivedAt > nowIsoDateTime() || arrivedAt < row.departedAt) {
        throw unprocessable(MAINTENANCE_MESSAGES.arrivalInvalid)
      }
      db.mobileInterventions.update(row.no, { arrivedAt, ...stampModified(request) })
      return respond(row.no)
    }
  )

  router.post(
    '/maintenance/mobile-interventions/:no/checks',
    { feature: 'MOBILEINTERVENTION', action: 'update' },
    (request) => {
      const row = open(routeParam(request, 'no'))
      if (!db.missionTypes.find(row.missionTypeNo)?.isControl) {
        throw conflict(MAINTENANCE_MESSAGES.notAControlMission)
      }
      const body = readBody(request)
      const checkCount = readNumber(body, 'checkCount', { required: true, min: 0 }) ?? 0
      const positiveCount = readNumber(body, 'positiveCount', { required: true, min: 0 }) ?? 0
      if (
        !Number.isInteger(checkCount) ||
        !Number.isInteger(positiveCount) ||
        positiveCount > checkCount
      ) {
        throw unprocessable(MAINTENANCE_MESSAGES.checkCountsInvalid)
      }
      db.mobileInterventions.update(row.no, {
        checkCount,
        positiveCount,
        checkComment: readString(body, 'checkComment'),
        ...stampModified(request)
      })
      return respond(row.no)
    }
  )

  // An unsolved breakdown can go on to the workshop: the order is opened here, with the same rules as by hand.
  router.post(
    '/maintenance/mobile-interventions/:no/close',
    { feature: 'MOBILEINTERVENTION', action: 'update' },
    (request) => {
      const row = open(routeParam(request, 'no'))
      if (!row.arrivedAt) throw unprocessable(MAINTENANCE_MESSAGES.arrivalMissing)
      const body = readBody(request)
      const resolved = readBoolean(body, 'resolved')
      const observation = readString(body, 'observation')
      if (!resolved && observation.length < MIN_TEXT) {
        throw unprocessable(MAINTENANCE_MESSAGES.observationTooShort, { min: MIN_TEXT })
      }
      const order =
        !resolved && readBoolean(body, 'openWorkOrder')
          ? createWorkOrder(
              db,
              {
                vehicleNo: row.vehicleNo,
                maintenanceType: 'corrective',
                severity: 'major',
                origin: 'mobile_team',
                originNo: row.no,
                symptom: observation,
                declaredAt: nowIsoDateTime()
              },
              request
            )
          : null
      db.mobileInterventions.update(row.no, {
        closedAt: nowIsoDateTime(),
        closedBy: sessionUser(request).code,
        resolved,
        observation,
        workOrderNo: order?.no ?? null,
        ...stampModified(request)
      })
      return respond(row.no)
    }
  )
}
