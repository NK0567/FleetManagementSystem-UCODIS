import {
  INFRACTION_LEVELS,
  PLAN_STOP_KINDS,
  debriefStatus,
  infractionRate,
  infractionTotal,
  tripDistanceKm,
  type InfractionLevel,
  type PlanStop,
  type PlanStopKind
} from '@/modules/fleet/trip-debriefs/domain/tripDebrief'
import type { TripDebriefApi } from '@/modules/fleet/trip-debriefs/types/tripDebrief.types'
import { DEFAULT_FLEET_SETTINGS } from '@/modules/fleet/fleet-settings/domain/fleetSettings'
import { employeeFullName, isOnStaff } from '@/modules/hr/employees/domain/employee'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { TripDebriefRow } from '../../fixtures/fleet/tripDebriefs'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  readDate,
  readEnum,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'
import { fleetSettings } from './settings'

export function tripDebriefsApi(db: MockDatabase): TripDebriefApi[] {
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  const baseKm =
    fleetSettings(db).safety.infractionRateBaseKm ??
    DEFAULT_FLEET_SETTINGS.safety.infractionRateBaseKm
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  return db.tripDebriefs.all().map((row) => {
    const total = infractionTotal(row)
    const distanceKm = tripDistanceKm(row.startKm, row.endKm)
    return {
      ...row,
      employeeName: names.get(row.employeeNo) ?? row.employeeNo,
      vehiclePlate: plates.get(row.vehicleNo) ?? row.vehicleNo,
      distanceKm,
      infractionTotal: total,
      infractionRate: infractionRate(total, distanceKm, baseKm),
      status: debriefStatus(row)
    }
  })
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

function readPlan(input: Record<string, unknown>): PlanStop[] {
  const raw = input.plan
  if (raw == null) return []
  if (!Array.isArray(raw) || raw.length > 60)
    throw unprocessable(FLEET_MESSAGES.tripDebriefPlanInvalid)
  return raw.map((entry) => {
    const stop = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>
    const plannedTime = readString(stop, 'plannedTime')
    const actualTime = readString(stop, 'actualTime')
    if ((plannedTime && !TIME.test(plannedTime)) || (actualTime && !TIME.test(actualTime))) {
      throw unprocessable(FLEET_MESSAGES.tripDebriefPlanInvalid)
    }
    const place = readString(stop, 'place', { required: true })
    return {
      place,
      plannedTime,
      actualTime,
      allowed: (readEnum(stop, 'allowed', PLAN_STOP_KINDS) ?? 'none') as PlanStopKind,
      observation: readString(stop, 'observation')
    }
  })
}

function readCounts(input: Record<string, unknown>) {
  return Object.fromEntries(
    INFRACTION_LEVELS.map((level) => [
      level,
      Math.trunc(readNumber(input, level, { min: 0, max: 999 }) ?? 0)
    ])
  ) as Record<InfractionLevel, number>
}

interface Facts {
  loadedOn: string | null
  unloadedOn: string | null
  startKm: number | null
  endKm: number | null
  actionDueOn: string | null
}

function checkFacts(facts: Facts): void {
  const today = todayIso()
  if (
    (facts.loadedOn && facts.loadedOn > today) ||
    (facts.unloadedOn && facts.unloadedOn > today)
  ) {
    throw unprocessable(FLEET_MESSAGES.tripDebriefInFuture)
  }
  if (facts.loadedOn && facts.unloadedOn && facts.unloadedOn < facts.loadedOn) {
    throw unprocessable(FLEET_MESSAGES.tripDebriefDateOrder)
  }
  if (facts.startKm !== null && facts.endKm !== null && facts.endKm < facts.startKm) {
    throw unprocessable(FLEET_MESSAGES.tripDebriefKmOrder)
  }
}

type EditableFields = Pick<
  TripDebriefRow,
  | 'voucherNo'
  | 'vehicleNo'
  | 'tankNo'
  | 'deliveryPlace'
  | 'gainLoss'
  | 'loadedOn'
  | 'unloadedOn'
  | 'startKm'
  | 'endKm'
  | 'plan'
  | 'events'
  | 'actionText'
  | 'actionOwner'
  | 'actionDueOn'
  | InfractionLevel
>

const countReader = (level: InfractionLevel) => (input: Record<string, unknown>) =>
  Math.trunc(readNumber(input, level, { min: 0, max: 999 }) ?? 0)

const readers: FieldReaders<EditableFields> = {
  voucherNo: (input) => readString(input, 'voucherNo', { required: true }),
  vehicleNo: (input) => readString(input, 'vehicleNo', { required: true }),
  tankNo: (input) => readString(input, 'tankNo'),
  deliveryPlace: (input) => readString(input, 'deliveryPlace'),
  gainLoss: (input) => readNumber(input, 'gainLoss', { min: -100000, max: 100000 }),
  loadedOn: (input) => readDate(input, 'loadedOn'),
  unloadedOn: (input) => readDate(input, 'unloadedOn'),
  startKm: (input) => readNumber(input, 'startKm', { min: 0 }),
  endKm: (input) => readNumber(input, 'endKm', { min: 0 }),
  plan: readPlan,
  events: (input) => readString(input, 'events'),
  actionText: (input) => readString(input, 'actionText'),
  actionOwner: (input) => readString(input, 'actionOwner'),
  actionDueOn: (input) => readDate(input, 'actionDueOn'),
  nightDriving: countReader('nightDriving'),
  dailyWork: countReader('dailyWork'),
  dailyDriving: countReader('dailyDriving'),
  continuousDriving: countReader('continuousDriving'),
  weeklyRest: countReader('weeklyRest'),
  dailyRest: countReader('dailyRest'),
  overspeed: countReader('overspeed'),
  harshAcceleration: countReader('harshAcceleration'),
  harshBraking: countReader('harshBraking')
}

export function registerTripDebriefsHandlers(router: MockRouter, db: MockDatabase): void {
  function editable(no: string) {
    const row = db.tripDebriefs.findOrFail(no)
    if (row.closedOn) throw conflict(FLEET_MESSAGES.tripDebriefClosed)
    return row
  }

  function voucherTaken(voucherNo: string, except = ''): boolean {
    return db.tripDebriefs.all().some((row) => row.voucherNo === voucherNo && row.no !== except)
  }

  function apiOf(no: string) {
    return tripDebriefsApi(db).find((row) => row.no === no)
  }

  registerCrudResource(router, {
    basePath: '/fleet/trip-debriefs',
    feature: 'TRIPDEBRIEF',
    collection: db.tripDebriefs,
    list: () => tripDebriefsApi(db),
    searchColumns: ['no', 'voucherNo', 'employeeName', 'vehiclePlate'],
    optionFields: { status: 'tripDebriefStatus' },
    create: (input) => {
      const employeeNo = requireReference(db.employees, input, 'employeeNo')
      if (!isOnStaff(db.employees.findOrFail(employeeNo).status)) {
        throw unprocessable(FLEET_MESSAGES.notOnStaff)
      }
      const vehicleNo = requireReference(db.vehicles, input, 'vehicleNo')
      const voucherNo = readString(input, 'voucherNo', { required: true })
      if (voucherTaken(voucherNo)) {
        throw conflict(FLEET_MESSAGES.tripDebriefVoucherUsed, { voucherNo })
      }
      const facts: Facts = {
        loadedOn: readDate(input, 'loadedOn'),
        unloadedOn: readDate(input, 'unloadedOn'),
        startKm: readNumber(input, 'startKm', { min: 0 }),
        endKm: readNumber(input, 'endKm', { min: 0 }),
        actionDueOn: readDate(input, 'actionDueOn')
      }
      checkFacts(facts)
      return {
        no: nextNo(
          db.tripDebriefs.all().map((row) => row.no),
          'DEB-',
          5
        ),
        voucherNo,
        employeeNo,
        vehicleNo,
        tankNo: readString(input, 'tankNo'),
        deliveryPlace: readString(input, 'deliveryPlace'),
        gainLoss: readNumber(input, 'gainLoss', { min: -100000, max: 100000 }),
        ...facts,
        ...readCounts(input),
        plan: readPlan(input),
        events: readString(input, 'events'),
        actionText: readString(input, 'actionText'),
        actionOwner: readString(input, 'actionOwner'),
        driverSignedOn: null,
        managerSignedOn: null,
        closedOn: null
      }
    },
    update: (existing, input) => {
      editable(existing.no)
      const patch = readPatch(input, readers)
      if (patch.voucherNo && voucherTaken(patch.voucherNo, existing.no)) {
        throw conflict(FLEET_MESSAGES.tripDebriefVoucherUsed, { voucherNo: patch.voucherNo })
      }
      if ('vehicleNo' in input) requireReference(db.vehicles, input, 'vehicleNo')
      checkFacts({ ...existing, ...patch })
      /* A signature vouches for the content it was given on: any change calls for new ones. */
      return { ...patch, driverSignedOn: null, managerSignedOn: null }
    }
  })

  router.post(
    '/fleet/trip-debriefs/:no/sign',
    { feature: 'TRIPDEBRIEF', action: 'update' },
    (request) => {
      const row = editable(routeParam(request, 'no'))
      const party = readEnum(readBody(request), 'party', ['driver', 'manager'] as const, {
        required: true
      })
      const field = party === 'driver' ? 'driverSignedOn' : 'managerSignedOn'
      if (row[field]) throw conflict(FLEET_MESSAGES.tripDebriefAlreadySigned)
      if (row.startKm === null || row.endKm === null) {
        throw unprocessable(FLEET_MESSAGES.tripDebriefKmMissing)
      }
      db.tripDebriefs.update(row.no, { [field]: todayIso(), ...stampModified(request) })
      return ok(apiOf(row.no))
    }
  )

  router.post(
    '/fleet/trip-debriefs/:no/close',
    { feature: 'TRIPDEBRIEF', action: 'update' },
    (request) => {
      const row = editable(routeParam(request, 'no'))
      if (!row.driverSignedOn || !row.managerSignedOn) {
        throw conflict(FLEET_MESSAGES.tripDebriefNotSigned)
      }
      db.tripDebriefs.update(row.no, { closedOn: todayIso(), ...stampModified(request) })
      return ok(apiOf(row.no))
    }
  )
}
