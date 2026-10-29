import { blockingAnomalies } from '@/modules/fleet/check-points/domain/checkResult'
import {
  departureActivation,
  longestRestHours,
  readyToLeave,
  restBeforeHours,
  type DepartureCheck,
  type WorkPeriod
} from '@/modules/fleet/departure-authorizations/domain/departure'
import type { DepartureAuthorizationApi } from '@/modules/fleet/departure-authorizations/types/departureAuthorization.types'
import { driverIneligibility } from '@/modules/fleet/drivers/domain/driver'
import { isUsable } from '@/modules/fleet/vehicles/domain/vehicleStatus'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import { equipmentApi } from './vehicles'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { DepartureAuthorizationRow } from '../../fixtures/fleet/departureAuthorizations'
import type { TripRow } from '../../fixtures/fleet/trips'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readString } from '../../http/input'
import { requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { localize, type MockLanguage } from '../../i18n'
import { readCheckResults } from './checkPoints'
import { documentCompliance, gapsText } from './documentCompliance'
import { driverFacts, ineligibilityText } from './drivers'
import { FLEET_MESSAGES } from './messages'
import { departureChecklist } from './roadChecklists'
import { fleetSettings } from './settings'
import { statusReason, vehicleStatuses } from './vehicleState'

/** The driver's trips that actually ran, as stretches of work. */
function workPeriods(db: MockDatabase, driverNo: string): WorkPeriod[] {
  const now = nowIsoDateTime()
  return db.trips
    .all()
    .filter((trip) => trip.driverNo === driverNo && trip.actualDeparture)
    .map((trip) => ({
      start: trip.actualDeparture ?? '',
      end:
        trip.actualArrival ?? (trip.status === 'in_progress' ? now : (trip.actualDeparture ?? ''))
    }))
}

/** Everything that must hold for the trip to leave, checked live while the request is pending. */
export function departureChecks(
  db: MockDatabase,
  authorization: Pick<DepartureAuthorizationRow, 'tripNo' | 'driverChecks'>,
  language: MockLanguage
): DepartureCheck[] {
  const trip = db.trips.findOrFail(authorization.tripNo)
  const say = (
    text: (typeof FLEET_MESSAGES)['checkNoTrailer'],
    params?: Record<string, string | number>
  ) => localize(language, text, params)
  const statuses = vehicleStatuses(db)
  const vehicleCheck = (no: string) => {
    const vehicle = db.vehicles.findOrFail(no)
    const result = statuses.get(no)
    const usable = !result || isUsable(result.status)
    return {
      ok: usable,
      detail: usable
        ? say(FLEET_MESSAGES.checkVehicleOk, { plate: vehicle.plate })
        : say(FLEET_MESSAGES.checkVehicleKo, {
            plate: vehicle.plate,
            reason: statusReason(result?.cause ?? null, vehicle, language)
          })
    }
  }

  const checklist = departureChecklist(db, trip.no)
  const blocking = checklist ? blockingAnomalies(checklist.results) : []

  const compliance = documentCompliance(db).vehicles
  const gaps = [trip.vehicleNo, trip.trailerNo]
    .filter((no): no is string => !!no)
    .flatMap((no) => compliance.get(no) ?? [])

  const day = trip.plannedDeparture.slice(0, 10)
  const employee = db.employees.findOrFail(trip.driverNo)
  const reasons = driverIneligibility(driverFacts(db, employee, day))

  const settings = fleetSettings(db).drivingTime
  const periods = workPeriods(db, trip.driverNo)
  const rest = restBeforeHours(periods, trip.plannedDeparture)
  const weekly = longestRestHours(periods, trip.plannedDeparture)

  const failedDriverChecks = blockingAnomalies(authorization.driverChecks)

  return [
    {
      code: 'checklist',
      ok: !!checklist && blocking.length === 0,
      detail: !checklist
        ? say(FLEET_MESSAGES.checkChecklistMissing)
        : blocking.length
          ? say(FLEET_MESSAGES.checkChecklistBlocking, {
              points: blocking.map((point) => point.label).join(', ')
            })
          : say(FLEET_MESSAGES.checkChecklistOk, { no: checklist.no })
    },
    { code: 'vehicle', ...vehicleCheck(trip.vehicleNo) },
    trip.trailerNo
      ? { code: 'trailer', ...vehicleCheck(trip.trailerNo) }
      : { code: 'trailer', ok: true, detail: say(FLEET_MESSAGES.checkNoTrailer) },
    {
      code: 'vehicleDocuments',
      ok: gaps.length === 0,
      detail: gaps.length ? gapsText(db, gaps, language) : say(FLEET_MESSAGES.checkDocumentsOk)
    },
    {
      code: 'driver',
      ok: reasons.length === 0,
      detail: reasons.length
        ? ineligibilityText(language, reasons)
        : say(FLEET_MESSAGES.checkDriverOk, { name: employeeFullName(employee) })
    },
    {
      code: 'rest',
      ok: rest === null || rest >= settings.restBeforeDepartureMinH,
      detail:
        rest === null
          ? say(FLEET_MESSAGES.checkRestNone)
          : say(FLEET_MESSAGES.checkRestOk, {
              hours: Math.floor(rest),
              min: settings.restBeforeDepartureMinH
            })
    },
    {
      code: 'weeklyRest',
      ok: weekly >= settings.weeklyRestMinH,
      detail: say(FLEET_MESSAGES.checkWeeklyRest, {
        hours: Math.floor(weekly),
        min: settings.weeklyRestMinH
      })
    },
    {
      code: 'driverChecks',
      ok: failedDriverChecks.length === 0,
      detail: failedDriverChecks.length
        ? say(FLEET_MESSAGES.checkDriverChecksBlocking, {
            points: failedDriverChecks.map((point) => point.label).join(', ')
          })
        : say(FLEET_MESSAGES.checkDriverChecksOk)
    }
  ]
}

export function departureAuthorizationsApi(
  db: MockDatabase,
  language: MockLanguage
): DepartureAuthorizationApi[] {
  const trips = new Map(db.trips.all().map((trip) => [trip.no, trip]))
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  return db.departureAuthorizations.all().map((authorization) => {
    const trip = trips.get(authorization.tripNo) as TripRow
    const checks = authorization.checksSnapshot ?? departureChecks(db, authorization, language)
    return {
      ...authorization,
      plannedDeparture: trip.plannedDeparture,
      vehicleNo: trip.vehicleNo,
      vehiclePlate: plates.get(trip.vehicleNo) ?? trip.vehicleNo,
      trailerPlate: trip.trailerNo ? (plates.get(trip.trailerNo) ?? trip.trailerNo) : '',
      driverNo: trip.driverNo,
      driverName: names.get(trip.driverNo) ?? trip.driverNo,
      checks,
      ready: readyToLeave(checks),
      checklistNo: departureChecklist(db, trip.no)?.no ?? null,
      activation: authorization.activation ?? null
    }
  })
}

/** The request that decides whether a trip may leave: the latest one not refused. */
export function tripAuthorization(
  db: MockDatabase,
  tripNo: string
): DepartureAuthorizationRow | null {
  return (
    db.departureAuthorizations
      .all()
      .filter((authorization) => authorization.tripNo === tripNo)
      .sort((a, b) => b.no.localeCompare(a.no))
      .find((authorization) => authorization.decision !== 'refused') ?? null
  )
}

export function registerDepartureAuthorizationsHandlers(
  router: MockRouter,
  db: MockDatabase
): void {
  function pending(no: string) {
    const authorization = db.departureAuthorizations.findOrFail(no)
    if (authorization.decision !== 'pending') throw conflict(FLEET_MESSAGES.departureNotPending)
    return authorization
  }

  const respond = (no: string, language: MockLanguage) =>
    ok(departureAuthorizationsApi(db, language).find((row) => row.no === no))

  registerCrudResource(router, {
    basePath: '/fleet/departure-authorizations',
    feature: 'DEPARTUREAUTHORIZATION',
    collection: db.departureAuthorizations,
    list: (request) => departureAuthorizationsApi(db, request.language),
    searchColumns: ['no', 'tripNo', 'vehiclePlate', 'driverName'],
    optionFields: { decision: 'departureDecision' },
    create: (input) => {
      const tripNo = requireReference(db.trips, input, 'tripNo')
      if (db.trips.findOrFail(tripNo).status !== 'planned') {
        throw conflict(FLEET_MESSAGES.departureTripNotPlanned)
      }
      const existing = tripAuthorization(db, tripNo)
      if (existing) throw conflict(FLEET_MESSAGES.departureAlreadyRequested, { no: existing.no })
      return {
        no: nextNo(
          db.departureAuthorizations.all().map((row) => row.no),
          `AUT-${todayIso().slice(0, 4)}-`,
          4
        ),
        tripNo,
        driverChecks: readCheckResults(db, input, 'driver', 'driverChecks'),
        decision: 'pending' as const,
        decidedBy: null,
        decidedAt: null,
        refusalReason: '',
        checksSnapshot: null
      }
    },
    update: (existing, input) => {
      pending(existing.no)
      return { driverChecks: readCheckResults(db, input, 'driver', 'driverChecks') }
    }
  })

  router.post(
    '/fleet/departure-authorizations/:no/grant',
    { feature: 'DEPARTUREAUTHORIZATION', action: 'execute' },
    (request) => {
      const authorization = pending(routeParam(request, 'no'))
      if (db.trips.findOrFail(authorization.tripNo).status !== 'planned') {
        throw conflict(FLEET_MESSAGES.departureTripNotPlanned)
      }
      const checks = departureChecks(db, authorization, request.language)
      const failed = checks.filter((check) => !check.ok)
      if (failed.length) {
        throw unprocessable(FLEET_MESSAGES.departureNotReady, {
          checks: failed.map((check) => check.detail).join(' ')
        })
      }
      const trip = db.trips.findOrFail(authorization.tripNo)
      const capabilities = new Set(
        equipmentApi(db)
          .filter((item) => item.vehicleNo === trip.vehicleNo && item.state === 'operational')
          .map((item) => item.capability)
      )
      const decidedAt = nowIso()
      db.departureAuthorizations.update(authorization.no, {
        decision: 'granted',
        decidedBy: sessionUser(request).code,
        decidedAt,
        checksSnapshot: checks,
        // The grant switches on the tracking of the vehicle and its camera (simulated).
        activation: departureActivation(
          { hasTracker: capabilities.has('tracker'), hasCamera: capabilities.has('camera') },
          decidedAt
        ),
        ...stampModified(request)
      })
      return respond(authorization.no, request.language)
    }
  )

  router.post(
    '/fleet/departure-authorizations/:no/refuse',
    { feature: 'DEPARTUREAUTHORIZATION', action: 'execute' },
    (request) => {
      const authorization = pending(routeParam(request, 'no'))
      const reason = readString(readBody(request), 'reason')
      if (!reason) throw unprocessable(FLEET_MESSAGES.reasonRequired)
      db.departureAuthorizations.update(authorization.no, {
        decision: 'refused',
        decidedBy: sessionUser(request).code,
        decidedAt: nowIso(),
        refusalReason: reason,
        checksSnapshot: departureChecks(db, authorization, request.language),
        ...stampModified(request)
      })
      return respond(authorization.no, request.language)
    }
  )
}
