import { DEVIATION_SEVERITIES } from '@/modules/fleet/deviation-types/types/deviationType.types'
import {
  allowedDecisions,
  complianceRate,
  DEVIATION_DECISIONS,
  DEVIATION_NATURES,
  deviationNature,
  justificationDeadline,
  type QualifiedNature
} from '@/modules/fleet/route-deviations/domain/routeDeviation'
import type {
  RouteDeviationApi,
  RouteDeviationSummary
} from '@/modules/fleet/route-deviations/types/routeDeviation.types'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { RouteDeviationRow } from '../../fixtures/fleet/routeDeviations'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  readDateTime,
  readEnum,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { FLEET_MESSAGES } from './messages'
import { fleetSettings } from './settings'

type EditableFields = Pick<RouteDeviationRow, 'detectedAt' | 'location' | 'measure'>

export function routeDeviationsApi(db: MockDatabase): RouteDeviationApi[] {
  const delay = fleetSettings(db).safety.justificationDelayH
  const types = new Map(db.deviationTypes.all().map((type) => [type.no, type]))
  const trips = new Map(db.trips.all().map((trip) => [trip.no, trip]))
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  return db.routeDeviations.all().map((deviation) => {
    const type = types.get(deviation.deviationTypeNo)
    const trip = trips.get(deviation.tripNo)
    return {
      ...deviation,
      deviationTypeName: type?.name ?? deviation.deviationTypeNo,
      unit: type?.unit ?? null,
      vehiclePlate: trip ? (plates.get(trip.vehicleNo) ?? trip.vehicleNo) : '',
      driverName: trip ? (names.get(trip.driverNo) ?? trip.driverNo) : '',
      nature: deviationNature(deviation.qualification),
      justificationDeadline: justificationDeadline(deviation.detectedAt, delay)
    }
  })
}

/** Deviations still to qualify on a trip: they keep it from being closed. */
export function deviationsToQualify(db: MockDatabase, tripNo: string): number {
  return db.routeDeviations
    .all()
    .filter((deviation) => deviation.tripNo === tripNo && !deviation.qualification).length
}

export function deviationSummary(db: MockDatabase): RouteDeviationSummary {
  const deviations = db.routeDeviations.all()
  const finished = db.trips
    .all()
    .filter((trip) => trip.status === 'completed' || trip.status === 'closed')
    .map((trip) => trip.no)
  const unjustified = deviations.filter((row) => row.qualification?.nature === 'unjustified')
  return {
    toQualify: deviations.filter((row) => !row.qualification).length,
    unjustified: unjustified.length,
    complianceRate: complianceRate(finished, new Set(unjustified.map((row) => row.tripNo)))
  }
}

function deviationApiOf(db: MockDatabase, no: string): RouteDeviationApi | undefined {
  return routeDeviationsApi(db).find((row) => row.no === no)
}

export function registerRouteDeviationsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<EditableFields> = {
    detectedAt: (input) => {
      const value = readDateTime(input, 'detectedAt', { required: true }) ?? ''
      if (value > nowIsoDateTime()) throw unprocessable(FLEET_MESSAGES.dateInFuture)
      return value
    },
    location: (input) => readString(input, 'location'),
    measure: (input) => readNumber(input, 'measure', { min: 0 })
  }

  function toQualify(no: string) {
    const deviation = db.routeDeviations.findOrFail(no)
    if (deviation.qualification) throw conflict(FLEET_MESSAGES.deviationQualified)
    return deviation
  }

  router.get('/fleet/route-deviations/summary', { feature: 'ROUTEDEVIATION', action: 'read' }, () =>
    ok(deviationSummary(db))
  )

  registerCrudResource(router, {
    basePath: '/fleet/route-deviations',
    feature: 'ROUTEDEVIATION',
    collection: db.routeDeviations,
    list: () => routeDeviationsApi(db),
    searchColumns: ['no', 'tripNo', 'vehiclePlate', 'driverName'],
    optionFields: { severity: 'deviationSeverity', nature: 'deviationNature' },
    create: (input) => {
      const tripNo = requireReference(db.trips, input, 'tripNo')
      const trip = db.trips.findOrFail(tripNo)
      if (trip.status === 'closed' || trip.status === 'cancelled') {
        throw conflict(FLEET_MESSAGES.deviationTripOver)
      }
      const deviationTypeNo = requireReference(db.deviationTypes, input, 'deviationTypeNo')
      const type = db.deviationTypes.findOrFail(deviationTypeNo)
      if (!type.active) throw unprocessable(FLEET_MESSAGES.deviationTypeInactive)
      return {
        no: nextNo(
          db.routeDeviations.all().map((row) => row.no),
          'ECA-',
          5
        ),
        tripNo,
        deviationTypeNo,
        severity: readEnum(input, 'severity', DEVIATION_SEVERITIES) ?? type.severity,
        source: 'manual' as const,
        detectedAt: readers.detectedAt(input),
        endedAt: null,
        measure: readers.measure(input),
        location: readers.location(input),
        latitude: null,
        longitude: null,
        justification: '',
        justifiedAt: null,
        justifiedBy: null,
        qualification: null
      }
    },
    update: (existing, input) => {
      toQualify(existing.no)
      return readPatch(input, readers)
    }
  })

  router.post(
    '/fleet/route-deviations/:no/justify',
    { feature: 'ROUTEDEVIATION', action: 'update' },
    (request) => {
      const deviation = toQualify(routeParam(request, 'no'))
      if (deviation.justification) throw conflict(FLEET_MESSAGES.deviationJustified)
      const deadline = justificationDeadline(
        deviation.detectedAt,
        fleetSettings(db).safety.justificationDelayH
      )
      if (nowIsoDateTime() > deadline) throw conflict(FLEET_MESSAGES.deviationJustificationLate)
      const text = readString(readBody(request), 'justification')
      if (!text) throw unprocessable(FLEET_MESSAGES.reasonRequired)
      db.routeDeviations.update(deviation.no, {
        justification: text,
        justifiedAt: nowIsoDateTime(),
        justifiedBy: sessionUser(request).code,
        ...stampModified(request)
      })
      return ok(deviationApiOf(db, deviation.no))
    }
  )

  router.post(
    '/fleet/route-deviations/:no/qualify',
    { feature: 'ROUTEDEVIATION', action: 'execute' },
    (request) => {
      const deviation = toQualify(routeParam(request, 'no'))
      const body = readBody(request)
      const nature = readEnum(body, 'nature', DEVIATION_NATURES, { required: true })
      if (!nature || nature === 'to_qualify')
        throw unprocessable(FLEET_MESSAGES.deviationNatureRequired)
      const decision = readEnum(body, 'decision', DEVIATION_DECISIONS) ?? 'dismissed'
      if (!allowedDecisions(nature as QualifiedNature).includes(decision)) {
        throw unprocessable(FLEET_MESSAGES.deviationDecisionNotAllowed)
      }
      const reason = readString(body, 'reason')
      if (!reason) throw unprocessable(FLEET_MESSAGES.reasonRequired)
      db.routeDeviations.update(deviation.no, {
        qualification: {
          nature: nature as QualifiedNature,
          decision,
          reason,
          by: sessionUser(request).code,
          at: nowIsoDateTime()
        },
        ...stampModified(request)
      })
      return ok(deviationApiOf(db, deviation.no))
    }
  )
}
