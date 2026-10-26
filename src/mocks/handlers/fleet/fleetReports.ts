import {
  averageLitersPer100,
  gapPercent
} from '@/modules/fleet/fuel-consumption/domain/consumption'
import { isUpheld } from '@/modules/fleet/infractions/domain/infraction'
import { isPending, trainingStatus } from '@/modules/fleet/trainings/domain/training'
import {
  REPORT_KINDS,
  type FleetReportApi,
  type ReportCell,
  type ReportKind,
  type ReportSection
} from '@/modules/fleet/reports/types/fleetReport.types'
import { isUsable } from '@/modules/fleet/vehicles/domain/vehicleStatus'
import { isValidCalendarDateYmd } from '@/utils/calendarDate'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { routeParam } from '../../http/crudResource'
import { notFound, unprocessable } from '../../http/errors'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import type { MockRequest } from '../../http/types'
import { documentsApi, missingDocumentsApi } from './documents'
import { driverScoresApi } from './driverScores'
import { fuelConsumptionApi } from './fuelConsumption'
import { fuelRefillsApi } from './fuelRefills'
import { inspectionsApi } from './inspections'
import { employeeNames, vehiclePlates } from './links'
import { FLEET_MESSAGES } from './messages'
import { routeDeviationsApi } from './routeDeviations'
import { fleetSettings } from './settings'
import { tripsApi } from './trips'
import { vehicleStatuses } from './vehicleState'

interface ReportScope {
  from: string
  to: string
  /** Vehicles and employees of the chosen site, or all of them. */
  vehicles: Set<string>
  employees: Set<string>
  db: MockDatabase
  request: MockRequest
}

const day = (value: string | null | undefined) => (value ?? '').slice(0, 10)

function within(scope: ReportScope, value: string | null | undefined): boolean {
  const date = day(value)
  return !!date && date >= scope.from && date <= scope.to
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

/** Trips of the scope that reached their destination during the period. */
function finishedTrips(scope: ReportScope) {
  return tripsApi(scope.db).filter(
    (trip) =>
      scope.vehicles.has(trip.vehicleNo) &&
      (trip.status === 'completed' || trip.status === 'closed') &&
      within(scope, trip.actualArrival)
  )
}

function unjustifiedDeviations(scope: ReportScope) {
  const trips = new Map(scope.db.trips.all().map((trip) => [trip.no, trip]))
  return routeDeviationsApi(scope.db).filter((deviation) => {
    const trip = trips.get(deviation.tripNo)
    return (
      !!trip &&
      scope.vehicles.has(trip.vehicleNo) &&
      deviation.nature === 'unjustified' &&
      within(scope, deviation.detectedAt)
    )
  })
}

function periods(scope: ReportScope) {
  return fuelConsumptionApi(scope.db).filter(
    (period) => scope.vehicles.has(period.vehicleNo) && within(scope, period.to)
  )
}

function refills(scope: ReportScope) {
  return fuelRefillsApi(scope.db, scope.request.language).filter(
    (refill) => scope.vehicles.has(refill.vehicleNo) && within(scope, refill.refueledAt)
  )
}

function infractions(scope: ReportScope) {
  return scope.db.infractions
    .all()
    .filter(
      (infraction) =>
        scope.vehicles.has(infraction.vehicleNo) && within(scope, infraction.occurredAt)
    )
}

function summary(scope: ReportScope): ReportSection[] {
  const trips = finishedTrips(scope)
  const deviated = new Set(unjustifiedDeviations(scope).map((deviation) => deviation.tripNo))
  const fuel = refills(scope)
  const liters = sum(fuel.map((refill) => refill.liters))
  const recorded = infractions(scope)
  const statuses = vehicleStatuses(scope.db)
  const vehicles = [...scope.vehicles]
  const scores = driverScoresApi(scope.db).filter((score) => scope.employees.has(score.driverNo))
  const indicators: [string, ReportCell, string][] = [
    ['tripsFinished', trips.length, 'count'],
    ['kmDriven', sum(trips.map((trip) => trip.distanceKm ?? 0)), 'km'],
    [
      'tripComplianceRate',
      trips.length
        ? Math.round((trips.filter((trip) => !deviated.has(trip.no)).length * 100) / trips.length)
        : null,
      'percent'
    ],
    ['fuelLiters', Math.round(liters), 'liters'],
    ['fuelAmount', sum(fuel.map((refill) => refill.amount)), 'amount'],
    ['averageL100', averageLitersPer100(periods(scope)), 'l100'],
    ['co2Kg', Math.round((liters * fleetSettings(scope.db).fuel.co2GramsPerL) / 1000), 'kg'],
    ['refillAnomalies', fuel.filter((refill) => refill.status === 'anomaly').length, 'count'],
    ['infractionsRecorded', recorded.length, 'count'],
    [
      'infractionsUpheld',
      recorded.filter((infraction) => isUpheld(infraction.outcome)).length,
      'count'
    ],
    [
      'trainingsAttended',
      scope.db.trainings
        .all()
        .filter(
          (training) =>
            scope.employees.has(training.employeeNo) && within(scope, training.attendedOn)
        ).length,
      'count'
    ],
    [
      'availabilityToday',
      vehicles.length
        ? Math.round(
            (vehicles.filter((no) => isUsable(statuses.get(no)?.status ?? 'available')).length *
              100) /
              vehicles.length
          )
        : null,
      'percent'
    ],
    [
      'averageDriverScore',
      scores.length ? Math.round(sum(scores.map((score) => score.score)) / scores.length) : null,
      'points'
    ]
  ]
  return [
    {
      key: 'indicators',
      columns: [
        { key: 'indicator', type: 'indicator' },
        { key: 'value', type: 'measure' }
      ],
      rows: indicators.map(([indicator, value, unit]) => ({ indicator, value, unit }))
    },
    {
      key: 'orders',
      columns: [
        { key: 'tripNo', type: 'text' },
        { key: 'orderNos', type: 'text' }
      ],
      rows: trips
        .map((trip) => ({
          tripNo: trip.no,
          orderNos: scope.db.transportOrders
            .all()
            .filter((order) => order.tripNo === trip.no)
            .map((order) => order.no)
            .join(', ')
        }))
        .filter((row) => row.orderNos !== '')
    }
  ]
}

function fuelReport(scope: ReportScope): ReportSection[] {
  const plates = vehiclePlates(scope.db)
  const fuel = refills(scope)
  const consumption = periods(scope)
  const byVehicle = [...new Set(fuel.map((refill) => refill.vehicleNo))]
    .sort((a, b) => (plates.get(a) ?? a).localeCompare(plates.get(b) ?? b))
    .map((vehicleNo) => {
      const own = fuel.filter((refill) => refill.vehicleNo === vehicleNo)
      const ownPeriods = consumption.filter((period) => period.vehicleNo === vehicleNo)
      const l100 = averageLitersPer100(ownPeriods)
      const reference = ownPeriods.at(-1)?.referenceL100 ?? null
      return {
        plate: plates.get(vehicleNo) ?? vehicleNo,
        refills: own.length,
        liters: Math.round(sum(own.map((refill) => refill.liters))),
        amount: sum(own.map((refill) => refill.amount)),
        km: sum(ownPeriods.map((period) => Math.max(0, period.km))),
        l100,
        referenceL100: reference,
        gapPct: l100 !== null && reference ? gapPercent(l100, reference) : null
      }
    })
  const months = [...new Set(fuel.map((refill) => refill.refueledAt.slice(0, 7)))].sort()
  return [
    {
      key: 'byVehicle',
      columns: [
        { key: 'plate', type: 'text' },
        { key: 'refills', type: 'integer' },
        { key: 'liters', type: 'integer' },
        { key: 'amount', type: 'amount' },
        { key: 'km', type: 'integer' },
        { key: 'l100', type: 'decimal' },
        { key: 'referenceL100', type: 'decimal' },
        { key: 'gapPct', type: 'percent' }
      ],
      rows: byVehicle
    },
    {
      key: 'byMonth',
      columns: [
        { key: 'month', type: 'text' },
        { key: 'liters', type: 'integer' },
        { key: 'amount', type: 'amount' }
      ],
      rows: months.map((month) => {
        const own = fuel.filter((refill) => refill.refueledAt.startsWith(month))
        return {
          month,
          liters: Math.round(sum(own.map((refill) => refill.liters))),
          amount: sum(own.map((refill) => refill.amount))
        }
      })
    },
    {
      key: 'gaps',
      columns: [
        { key: 'plate', type: 'text' },
        { key: 'from', type: 'date' },
        { key: 'to', type: 'date' },
        { key: 'l100', type: 'decimal' },
        { key: 'referenceL100', type: 'decimal' },
        { key: 'gapPct', type: 'percent' },
        { key: 'status', type: 'option', optionsKey: 'fuelGapStatus' }
      ],
      rows: consumption
        .filter((period) => period.status !== 'normal')
        .map((period) => ({
          plate: period.vehiclePlate,
          from: day(period.from),
          to: day(period.to),
          l100: period.l100,
          referenceL100: period.referenceL100,
          gapPct: period.gapPct,
          status: period.status
        }))
    }
  ]
}

function driversReport(scope: ReportScope): ReportSection[] {
  const trips = finishedTrips(scope)
  const deviations = unjustifiedDeviations(scope)
  const tripDrivers = new Map(scope.db.trips.all().map((trip) => [trip.no, trip.driverNo]))
  const recorded = infractions(scope)
  const trainings = scope.db.trainings.all()
  return [
    {
      key: 'byDriver',
      columns: [
        { key: 'driverName', type: 'text' },
        { key: 'score', type: 'integer' },
        { key: 'trips', type: 'integer' },
        { key: 'km', type: 'integer' },
        { key: 'unjustifiedDeviations', type: 'integer' },
        { key: 'infractionsUpheld', type: 'integer' },
        { key: 'trainingsPending', type: 'integer' }
      ],
      rows: driverScoresApi(scope.db)
        .filter((score) => scope.employees.has(score.driverNo))
        .sort((a, b) => a.score - b.score || a.fullName.localeCompare(b.fullName))
        .map((score) => {
          const own = trips.filter((trip) => trip.driverNo === score.driverNo)
          return {
            driverName: score.fullName,
            score: score.score,
            trips: own.length,
            km: sum(own.map((trip) => trip.distanceKm ?? 0)),
            unjustifiedDeviations: deviations.filter(
              (deviation) => tripDrivers.get(deviation.tripNo) === score.driverNo
            ).length,
            infractionsUpheld: recorded.filter(
              (infraction) => infraction.driverNo === score.driverNo && isUpheld(infraction.outcome)
            ).length,
            trainingsPending: trainings.filter(
              (training) =>
                training.employeeNo === score.driverNo && isPending(trainingStatus(training))
            ).length
          }
        })
    }
  ]
}

function auditReport(scope: ReportScope): ReportSection[] {
  const inScope = (target: string, subjectNo: string) =>
    target === 'vehicle' ? scope.vehicles.has(subjectNo) : scope.employees.has(subjectNo)
  const names = employeeNames(scope.db)
  const plates = vehiclePlates(scope.db)
  const tripRows = new Map(scope.db.trips.all().map((trip) => [trip.no, trip]))
  return [
    {
      key: 'documents',
      columns: [
        { key: 'subjectName', type: 'text' },
        { key: 'documentTypeName', type: 'text' },
        { key: 'state', type: 'option', optionsKey: 'auditDocumentState' },
        { key: 'expiryDate', type: 'date' }
      ],
      rows: [
        ...documentsApi(scope.db)
          .filter(
            (document) =>
              document.current &&
              document.mandatory &&
              (document.state === 'expired' || document.state === 'expiring') &&
              inScope(document.target, document.subjectNo)
          )
          .map((document) => ({
            subjectName: document.subjectName,
            documentTypeName: document.documentTypeName,
            state: document.state,
            expiryDate: document.expiryDate
          })),
        ...missingDocumentsApi(scope.db)
          .filter((gap) => gap.reason === 'missing' && inScope(gap.target, gap.subjectNo))
          .map((gap) => ({
            subjectName: gap.subjectName,
            documentTypeName: gap.documentTypeName,
            state: 'missing',
            expiryDate: null
          }))
      ]
    },
    {
      key: 'inspections',
      columns: [
        { key: 'plate', type: 'text' },
        { key: 'inspectedOn', type: 'date' },
        { key: 'result', type: 'option', optionsKey: 'inspectionResult' }
      ],
      rows: inspectionsApi(scope.db)
        .filter(
          (inspection) =>
            scope.vehicles.has(inspection.vehicleNo) && within(scope, inspection.inspectedOn)
        )
        .map((inspection) => ({
          plate: inspection.vehiclePlate,
          inspectedOn: inspection.inspectedOn,
          result: inspection.result
        }))
    },
    {
      key: 'deviations',
      columns: [
        { key: 'tripNo', type: 'text' },
        { key: 'plate', type: 'text' },
        { key: 'driverName', type: 'text' },
        { key: 'deviationTypeName', type: 'text' },
        { key: 'detectedAt', type: 'date' }
      ],
      rows: unjustifiedDeviations(scope).map((deviation) => {
        const trip = tripRows.get(deviation.tripNo)
        return {
          tripNo: deviation.tripNo,
          plate: plates.get(trip?.vehicleNo ?? '') ?? deviation.vehiclePlate,
          driverName: names.get(trip?.driverNo ?? '') ?? deviation.driverName,
          deviationTypeName: deviation.deviationTypeName,
          detectedAt: day(deviation.detectedAt)
        }
      })
    }
  ]
}

const BUILDERS: Record<ReportKind, (scope: ReportScope) => ReportSection[]> = {
  summary,
  fuel: fuelReport,
  drivers: driversReport,
  audit: auditReport
}

const isReportKind = (value: string): value is ReportKind =>
  (REPORT_KINDS as readonly string[]).includes(value)

export function fleetReport(
  db: MockDatabase,
  request: MockRequest,
  kind: ReportKind
): FleetReportApi {
  const today = todayIso()
  const read = (key: string) => (typeof request.query[key] === 'string' ? request.query[key] : '')
  const from = read('from') || `${today.slice(0, 7)}-01`
  const to = read('to') || today
  if (!isValidCalendarDateYmd(from) || !isValidCalendarDateYmd(to) || from > to) {
    throw unprocessable(FLEET_MESSAGES.reportPeriodInvalid)
  }
  const siteNo = read('siteNo') || null
  const site = siteNo ? db.sites.findOrFail(siteNo) : null
  const scope: ReportScope = {
    from,
    to,
    db,
    request,
    vehicles: new Set(
      db.vehicles
        .all()
        .filter((vehicle) => !site || vehicle.homeSiteNo === site.no)
        .map((vehicle) => vehicle.no)
    ),
    employees: new Set(
      db.employees
        .all()
        .filter((employee) => !site || employee.siteCode === site.no)
        .map((employee) => employee.no)
    )
  }
  return {
    kind,
    from,
    to,
    siteNo,
    siteName: site?.name ?? '',
    sections: BUILDERS[kind](scope)
  }
}

export function registerFleetReportsHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/fleet/reports/:kind', { feature: 'FLEETREPORT', action: 'read' }, (request) => {
    const kind = routeParam(request, 'kind')
    if (!isReportKind(kind)) throw notFound()
    return ok(fleetReport(db, request, kind))
  })
}
