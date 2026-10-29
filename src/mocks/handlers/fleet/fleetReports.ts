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
import { averageAgeYears } from '@/modules/fleet/dashboard/domain/park'
import { addDays, daysBetween, minutesBetween, todayIso } from '@/utils/date'
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
import { SUPERVISION_MESSAGES } from './supervisionMessages'
import { tripsApi } from './trips'
import { alertsApi } from './alerts'
import { tyresApi } from '../maintenance/tyres'
import { vehicleStatuses } from './vehicleState'

interface ReportScope {
  from: string
  to: string
  /** Vehicles and employees of the chosen site, or all of them. */
  vehicles: Set<string>
  employees: Set<string>
  db: MockDatabase
  request: MockRequest
  /** The second period or site the summary is compared with. */
  compare?: ReportScope
  /** How the performance of the drivers is grouped. */
  groupBy?: 'day' | 'week'
}

const day = (value: string | null | undefined) => (value ?? '').slice(0, 10)

function scopeVehicles(scope: ReportScope) {
  return scope.db.vehicles
    .all()
    .filter((vehicle) => scope.vehicles.has(vehicle.no) && !vehicle.removal)
}

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

/** The indicators of the summary for one scope: key, value and unit. */
function summaryIndicators(scope: ReportScope): [string, ReportCell, string][] {
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
    ],
    ['averageFleetAge', averageAgeYears(scopeVehicles(scope), scope.to), 'years']
  ]
  return indicators
}

const difference = (a: ReportCell, b: ReportCell) =>
  typeof a === 'number' && typeof b === 'number' ? Math.round((a - b) * 10) / 10 : null

function summary(scope: ReportScope): ReportSection[] {
  const trips = finishedTrips(scope)
  const indicators = summaryIndicators(scope)
  // Compared with a second period or a second site: the same indicators side by side.
  const other = scope.compare
    ? new Map(summaryIndicators(scope.compare).map(([key, value]) => [key, value]))
    : null
  return [
    {
      key: 'indicators',
      columns: [
        { key: 'indicator', type: 'indicator' },
        { key: 'value', type: 'measure' },
        ...(other
          ? [
              { key: 'compareValue', type: 'measure' as const },
              { key: 'gap', type: 'measure' as const }
            ]
          : [])
      ],
      rows: indicators.map(
        ([indicator, value, unit]): Record<string, ReportCell> =>
          other
            ? {
                indicator,
                value,
                unit,
                compareValue: other.get(indicator) ?? null,
                gap: difference(value, other.get(indicator) ?? null)
              }
            : { indicator, value, unit }
      )
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
        gapPct: l100 !== null && reference ? gapPercent(l100, reference) : null,
        anomalies: own.filter((refill) => refill.status === 'anomaly').length
      }
    })
  const months = [...new Set(fuel.map((refill) => refill.refueledAt.slice(0, 7)))].sort()
  const drivers = [...new Set(fuel.map((refill) => refill.driverName))].sort((a, b) =>
    (a || '￿').localeCompare(b || '￿')
  )
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
        { key: 'gapPct', type: 'percent' },
        { key: 'anomalies', type: 'integer' }
      ],
      rows: byVehicle
    },
    {
      key: 'byDriver',
      columns: [
        { key: 'driverName', type: 'text' },
        { key: 'refills', type: 'integer' },
        { key: 'liters', type: 'integer' },
        { key: 'amount', type: 'amount' },
        { key: 'anomalies', type: 'integer' }
      ],
      rows: drivers.map((driverName) => {
        const own = fuel.filter((refill) => refill.driverName === driverName)
        return {
          driverName: driverName || null,
          refills: own.length,
          liters: Math.round(sum(own.map((refill) => refill.liters))),
          amount: sum(own.map((refill) => refill.amount)),
          anomalies: own.filter((refill) => refill.status === 'anomaly').length
        }
      })
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
    },
    tyreComparison(scope, 'make'),
    tyreComparison(scope, 'supplierName')
  ]
}

/**
 * Tyres compared by make or by supplier: what they cost, how far they ran, their cost per km
 * and the life of those already scrapped. Every tyre that ran on a vehicle of the scope counts,
 * whatever the period: a tyre lives longer than a report.
 */
function tyreComparison(scope: ReportScope, by: 'make' | 'supplierName'): ReportSection {
  const tyres = tyresApi(scope.db).filter(
    (tyre) =>
      !tyre.stints.length || tyre.stints.some((stint) => scope.vehicles.has(stint.vehicleNo))
  )
  const names = [...new Set(tyres.map((tyre) => tyre[by]))].sort((a, b) =>
    (a || '￿').localeCompare(b || '￿')
  )
  return {
    key: by === 'make' ? 'tyresByMake' : 'tyresBySupplier',
    columns: [
      { key: by, type: 'text' },
      { key: 'tyres', type: 'integer' },
      { key: 'tyreCost', type: 'amount' },
      { key: 'tyreKm', type: 'integer' },
      { key: 'costPerKm', type: 'decimal' },
      { key: 'scrapped', type: 'integer' },
      { key: 'averageLifeKm', type: 'integer' }
    ],
    rows: names.map((name) => {
      const own = tyres.filter((tyre) => tyre[by] === name)
      const cost = sum(own.map((tyre) => tyre.totalCost))
      const km = sum(own.map((tyre) => tyre.kmRun))
      const scrapped = own.filter((tyre) => tyre.scrappedAt)
      return {
        [by]: name || null,
        tyres: own.length,
        tyreCost: cost,
        tyreKm: km,
        costPerKm: km ? Math.round((cost / km) * 100) / 100 : null,
        scrapped: scrapped.length,
        averageLifeKm: scrapped.length
          ? Math.round(sum(scrapped.map((tyre) => tyre.kmRun)) / scrapped.length)
          : null
      }
    })
  }
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
    },
    ...driverDashboard(scope)
  ]
}

/** The Monday of the week of a day, or the day itself, as the key of a performance line. */
function periodStart(value: string, groupBy: 'day' | 'week'): string {
  const date = day(value)
  if (groupBy === 'day') return date
  const weekday = (new Date(`${date}T12:00:00`).getDay() + 6) % 7
  return addDays(date, -weekday)
}

/**
 * The drivers dashboard (FLT07-US05): their performance by day or by week, the documents coming
 * due, the vehicles they hold today and the alerts that concern them.
 */
function driverDashboard(scope: ReportScope): ReportSection[] {
  const groupBy = scope.groupBy ?? 'week'
  const drivers = driverScoresApi(scope.db).filter((score) => scope.employees.has(score.driverNo))
  const driverNos = new Set(drivers.map((score) => score.driverNo))
  const names = new Map(drivers.map((score) => [score.driverNo, score.fullName]))
  const tripDrivers = new Map(scope.db.trips.all().map((trip) => [trip.no, trip.driverNo]))
  const lines = new Map<string, Record<string, ReportCell> & { driverNo: string }>()
  const line = (driverNo: string, at: string) => {
    const start = periodStart(at, groupBy)
    const key = `${driverNo}|${start}`
    const current = lines.get(key) ?? {
      driverNo,
      driverName: names.get(driverNo) ?? driverNo,
      periodStart: start,
      trips: 0,
      km: 0,
      hours: 0,
      unjustifiedDeviations: 0,
      infractions: 0,
      telematicsEvents: 0
    }
    lines.set(key, current)
    return current
  }
  const add = (row: Record<string, ReportCell>, field: string, value: number) => {
    row[field] = Math.round((Number(row[field] ?? 0) + value) * 10) / 10
  }
  for (const trip of finishedTrips(scope).filter((row) => driverNos.has(row.driverNo))) {
    const row = line(trip.driverNo, trip.actualArrival as string)
    add(row, 'trips', 1)
    add(row, 'km', trip.distanceKm ?? 0)
    if (trip.actualDeparture && trip.actualArrival) {
      add(row, 'hours', minutesBetween(trip.actualDeparture, trip.actualArrival) / 60)
    }
  }
  for (const deviation of unjustifiedDeviations(scope)) {
    const driverNo = tripDrivers.get(deviation.tripNo)
    if (driverNo && driverNos.has(driverNo))
      add(line(driverNo, deviation.detectedAt), 'unjustifiedDeviations', 1)
  }
  for (const infraction of infractions(scope)) {
    if (infraction.driverNo && driverNos.has(infraction.driverNo)) {
      add(line(infraction.driverNo, infraction.occurredAt), 'infractions', 1)
    }
  }
  for (const event of scope.db.telematicsEvents.all()) {
    if (event.driverNo && driverNos.has(event.driverNo) && within(scope, event.occurredAt)) {
      add(line(event.driverNo, event.occurredAt), 'telematicsEvents', 1)
    }
  }

  // Documents of the drivers expired, missing, or coming due by the end of the period.
  const documents = [
    ...documentsApi(scope.db)
      .filter(
        (document) =>
          document.current &&
          document.target !== 'vehicle' &&
          driverNos.has(document.subjectNo) &&
          (document.state === 'expired' ||
            document.state === 'expiring' ||
            (!!document.expiryDate && document.expiryDate <= scope.to))
      )
      .map((document) => ({
        driverName: names.get(document.subjectNo) ?? document.subjectName,
        documentTypeName: document.documentTypeName,
        expiryDate: document.expiryDate,
        state: document.state === 'valid' ? 'expiring' : document.state
      })),
    ...missingDocumentsApi(scope.db)
      .filter(
        (gap) =>
          gap.reason === 'missing' && gap.target !== 'vehicle' && driverNos.has(gap.subjectNo)
      )
      .map((gap) => ({
        driverName: names.get(gap.subjectNo) ?? gap.subjectName,
        documentTypeName: gap.documentTypeName,
        expiryDate: null,
        state: 'missing'
      }))
  ].sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''))

  const plates = vehiclePlates(scope.db)
  const assignments = scope.db.driverAssignments
    .all()
    .filter((assignment) => !assignment.endDate && driverNos.has(assignment.employeeNo))
    .map((assignment) => ({
      driverName: names.get(assignment.employeeNo) ?? assignment.employeeNo,
      plate: plates.get(assignment.vehicleNo) ?? assignment.vehicleNo,
      startDate: assignment.startDate
    }))
    .sort((a, b) => String(a.driverName).localeCompare(String(b.driverName)))

  // The alerts not resolved whose subject is one of the drivers, or whose detail names one.
  const driverNames = [...names.values()]
  const alerts = alertsApi(scope.db, scope.request)
    .filter((alert) => alert.status !== 'resolved' && alert.since.slice(0, 10) <= scope.to)
    .filter((alert) =>
      driverNames.some((name) => alert.subject === name || alert.detail.includes(name))
    )
    .map((alert) => ({
      category: alert.category,
      subject: alert.subject,
      detail: alert.detail,
      since: day(alert.since)
    }))

  return [
    {
      key: groupBy === 'day' ? 'performanceByDay' : 'performanceByWeek',
      columns: [
        { key: 'driverName', type: 'text' },
        { key: groupBy === 'day' ? 'day' : 'weekOf', type: 'date' },
        { key: 'trips', type: 'integer' },
        { key: 'km', type: 'integer' },
        { key: 'hours', type: 'decimal' },
        { key: 'unjustifiedDeviations', type: 'integer' },
        { key: 'infractions', type: 'integer' },
        { key: 'telematicsEvents', type: 'integer' }
      ],
      rows: [...lines.values()]
        .sort(
          (a, b) =>
            String(a.driverName).localeCompare(String(b.driverName)) ||
            String(a.periodStart).localeCompare(String(b.periodStart))
        )
        .map((row): Record<string, ReportCell> => {
          const { driverNo, periodStart: start, ...cells } = row
          void driverNo
          return { ...cells, [groupBy === 'day' ? 'day' : 'weekOf']: start ?? null }
        })
    },
    {
      key: 'documentsDue',
      columns: [
        { key: 'driverName', type: 'text' },
        { key: 'documentTypeName', type: 'text' },
        { key: 'expiryDate', type: 'date' },
        { key: 'state', type: 'option', optionsKey: 'auditDocumentState' }
      ],
      rows: documents
    },
    {
      key: 'assignments',
      columns: [
        { key: 'driverName', type: 'text' },
        { key: 'plate', type: 'text' },
        { key: 'startDate', type: 'date' }
      ],
      rows: assignments
    },
    {
      key: 'alerts',
      columns: [
        { key: 'category', type: 'option', optionsKey: 'alertCategory' },
        { key: 'subject', type: 'text' },
        { key: 'detail', type: 'text' },
        { key: 'since', type: 'date' }
      ],
      rows: alerts
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
  const scopeOf = (period: { from: string; to: string }, at: typeof site): ReportScope => ({
    ...period,
    db,
    request,
    vehicles: new Set(
      db.vehicles
        .all()
        .filter((vehicle) => !at || vehicle.homeSiteNo === at.no)
        .map((vehicle) => vehicle.no)
    ),
    employees: new Set(
      db.employees
        .all()
        .filter((employee) => !at || employee.siteCode === at.no)
        .map((employee) => employee.no)
    )
  })
  const scope = scopeOf({ from, to }, site)
  scope.groupBy = read('groupBy') === 'day' ? 'day' : 'week'

  // The summary compares with the previous period, another period, or another site.
  let comparison: FleetReportApi['comparison'] = null
  const compare = kind === 'summary' ? read('compare') : ''
  if (compare === 'previous' || compare === 'period') {
    const length = daysBetween(from, to)
    const other =
      compare === 'previous'
        ? { from: addDays(from, -length - 1), to: addDays(from, -1) }
        : { from: read('compareFrom'), to: read('compareTo') }
    if (
      !other.from ||
      !other.to ||
      !isValidCalendarDateYmd(other.from) ||
      !isValidCalendarDateYmd(other.to) ||
      other.from > other.to
    ) {
      throw unprocessable(SUPERVISION_MESSAGES.comparisonInvalid)
    }
    scope.compare = scopeOf(other, site)
    comparison = { ...other, siteNo, siteName: site?.name ?? '' }
  } else if (compare === 'site') {
    const otherNo = read('compareSiteNo') || null
    const other = otherNo ? db.sites.findOrFail(otherNo) : null
    scope.compare = scopeOf({ from, to }, other)
    comparison = { from, to, siteNo: otherNo, siteName: other?.name ?? '' }
  } else if (compare) {
    throw unprocessable(SUPERVISION_MESSAGES.comparisonInvalid)
  }
  return {
    kind,
    from,
    to,
    siteNo,
    siteName: site?.name ?? '',
    comparison,
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
