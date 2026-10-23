import {
  averageLitersPer100,
  consumptionPeriods,
  consumptionReference,
  deductionIssues,
  excessCost,
  gapPercent,
  litersPer100,
  type DeductionIssue
} from '@/modules/fleet/fuel-consumption/domain/consumption'
import type {
  FuelConsumptionApi,
  FuelConsumptionSummary,
  FuelGapFile
} from '@/modules/fleet/fuel-consumption/types/fuelConsumption.types'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import type { FuelGapFileRow } from '../../fixtures/fleet/fuelGapFiles'
import { readBody, registerListResource, routeParam } from '../../http/crudResource'
import { conflict, forbidden, notFound, unprocessable } from '../../http/errors'
import { readBoolean, readNumber, readString } from '../../http/input'
import { requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import type { MockLanguage } from '../../i18n'
import { FLEET_MESSAGES } from './messages'
import { fuelRefillsApi } from './fuelRefills'
import { fleetSettings } from './settings'

const DEDUCTION_MESSAGES: Record<DeductionIssue, (typeof FLEET_MESSAGES)['gapClosed']> = {
  causeNotChargeable: FLEET_MESSAGES.gapDeductionCause,
  aboveExcessCost: FLEET_MESSAGES.gapDeductionAboveExcess,
  aboveCap: FLEET_MESSAGES.gapDeductionAboveCap
}

const EMPTY_FILE: FuelGapFile = {
  causeNo: null,
  comment: '',
  qualifiedBy: null,
  qualifiedAt: null,
  proposedAmount: null,
  proposedBy: null,
  proposedAt: null,
  decisionComment: '',
  decidedBy: null,
  decidedAt: null
}

/** Full-to-full periods of every vehicle, judged against their reference consumption. */
export function fuelConsumptionApi(db: MockDatabase): FuelConsumptionApi[] {
  const settings = fleetSettings(db).fuel
  const vehicles = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle]))
  const types = new Map(db.vehicleTypes.all().map((type) => [type.no, type]))
  const routes = new Map(db.routeTemplates.all().map((route) => [route.no, route]))
  const trips = new Map(db.trips.all().map((trip) => [trip.no, trip]))
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  const causes = new Map(db.fuelGapCauses.all().map((cause) => [cause.no, cause]))
  const files = new Map(db.fuelGapFiles.all().map((file) => [file.no, file]))
  const refills = db.fuelRefills.all()
  const byNo = new Map(refills.map((refill) => [refill.no, refill]))

  return [...new Set(refills.map((refill) => refill.vehicleNo))].flatMap((vehicleNo) => {
    const vehicle = vehicles.get(vehicleNo)
    return consumptionPeriods(refills.filter((refill) => refill.vehicleNo === vehicleNo)).map(
      (period) => {
        const closing = byNo.get(period.closingNo)
        const route = closing?.tripNo
          ? routes.get(trips.get(closing.tripNo)?.routeTemplateNo ?? '')
          : undefined
        const reference = consumptionReference(
          route?.fuelReferenceL100 ?? null,
          (vehicle && types.get(vehicle.vehicleTypeNo)?.fuelReferenceL100) ?? null,
          settings.defaultL100
        )
        const l100 = litersPer100(period.liters, period.km)
        const gapPct = l100 === null ? null : gapPercent(l100, reference.value)
        const no = `${vehicleNo}:${period.closingNo}`
        const file = files.get(no)
        const outOfLine = gapPct !== null && Math.abs(gapPct) > settings.consumptionGapPct
        const cause = file?.causeNo ? causes.get(file.causeNo) : undefined
        return {
          ...EMPTY_FILE,
          ...(file ?? {}),
          no,
          vehicleNo,
          vehiclePlate: vehicle?.plate ?? vehicleNo,
          driverName: closing?.driverNo ? (names.get(closing.driverNo) ?? closing.driverNo) : '',
          openingNo: period.openingNo,
          closingNo: period.closingNo,
          from: period.from,
          to: period.to,
          km: period.km,
          liters: period.liters,
          l100,
          referenceL100: reference.value,
          referenceSource: reference.source,
          gapPct,
          excessCost: excessCost(period, reference.value),
          co2Kg: Math.round((period.liters * settings.co2GramsPerL) / 1000),
          status: file?.status ?? (outOfLine ? 'to_qualify' : 'normal'),
          causeName: cause?.name ?? '',
          chargeable: !!cause?.chargeable
        }
      }
    )
  })
}

export function fuelSummary(db: MockDatabase, language: MockLanguage): FuelConsumptionSummary {
  const refills = fuelRefillsApi(db, language)
  const periods = fuelConsumptionApi(db)
  const liters = refills.reduce((total, refill) => total + refill.liters, 0)
  return {
    liters: Math.round(liters),
    amount: refills.reduce((total, refill) => total + refill.amount, 0),
    averageL100: averageLitersPer100(periods),
    co2Kg: Math.round((liters * fleetSettings(db).fuel.co2GramsPerL) / 1000),
    refillsToQualify: refills.filter((refill) => refill.status === 'anomaly').length,
    gapsToQualify: periods.filter((period) => period.status === 'to_qualify').length
  }
}

export function registerFuelConsumptionHandlers(router: MockRouter, db: MockDatabase): void {
  function periodOf(request: MockRequest) {
    const period = fuelConsumptionApi(db).find((row) => row.no === routeParam(request, 'no'))
    if (!period || period.status === 'normal') throw notFound()
    return period
  }

  function save(period: FuelConsumptionApi, patch: Partial<FuelGapFileRow>, request: MockRequest) {
    const stamp = { modifiedAt: nowIso(), modifiedBy: sessionUser(request).code }
    if (db.fuelGapFiles.exists(period.no)) {
      db.fuelGapFiles.update(period.no, { ...patch, ...stamp })
    } else {
      db.fuelGapFiles.insert({
        ...EMPTY_FILE,
        status: 'qualified',
        ...patch,
        no: period.no,
        createdAt: stamp.modifiedAt,
        createdBy: stamp.modifiedBy,
        ...stamp
      })
    }
    return ok(fuelConsumptionApi(db).find((row) => row.no === period.no))
  }

  router.get(
    '/fleet/fuel-consumption/summary',
    { feature: 'FUELCONSUMPTION', action: 'read' },
    (request) => ok(fuelSummary(db, request.language))
  )

  registerListResource(router, {
    basePath: '/fleet/fuel-consumption',
    feature: 'FUELCONSUMPTION',
    rows: () => fuelConsumptionApi(db),
    searchColumns: ['vehiclePlate', 'driverName'],
    optionFields: { status: 'fuelGapStatus', referenceSource: 'fuelReferenceSource' }
  })

  router.post(
    '/fleet/fuel-consumption/:no/qualify',
    { feature: 'FUELCONSUMPTION', action: 'update' },
    (request) => {
      const period = periodOf(request)
      if (period.status !== 'to_qualify') throw conflict(FLEET_MESSAGES.gapNotToQualify)
      const body = readBody(request)
      const causeNo = requireReference(db.fuelGapCauses, body, 'causeNo')
      if (!db.fuelGapCauses.findOrFail(causeNo).active)
        throw unprocessable(FLEET_MESSAGES.fuelCauseInactive)
      const comment = readString(body, 'comment')
      if (!comment) throw unprocessable(FLEET_MESSAGES.reasonRequired)
      return save(
        period,
        {
          status: 'qualified',
          causeNo,
          comment,
          qualifiedBy: sessionUser(request).code,
          qualifiedAt: nowIso()
        },
        request
      )
    }
  )

  router.post(
    '/fleet/fuel-consumption/:no/propose',
    { feature: 'FUELCONSUMPTION', action: 'update' },
    (request) => {
      const period = periodOf(request)
      if (period.status !== 'qualified') throw conflict(FLEET_MESSAGES.gapNotQualified)
      const amount = readNumber(readBody(request), 'amount', { required: true, min: 1 }) ?? 0
      const [issue] = deductionIssues(
        amount,
        period.chargeable,
        period.excessCost,
        fleetSettings(db).fuel.deductionCapAmount
      )
      if (issue) throw unprocessable(DEDUCTION_MESSAGES[issue])
      return save(
        period,
        {
          status: 'deduction_proposed',
          proposedAmount: amount,
          proposedBy: sessionUser(request).code,
          proposedAt: nowIso()
        },
        request
      )
    }
  )

  router.post(
    '/fleet/fuel-consumption/:no/decide',
    { feature: 'FUELCONSUMPTION', action: 'execute' },
    (request) => {
      const period = periodOf(request)
      if (period.status !== 'deduction_proposed') throw conflict(FLEET_MESSAGES.gapNotProposed)
      const code = sessionUser(request).code
      if (period.proposedBy === code) throw forbidden(FLEET_MESSAGES.gapOwnProposal)
      const body = readBody(request)
      const approve = readBoolean(body, 'approve')
      const comment = readString(body, 'comment')
      if (!approve && !comment) throw unprocessable(FLEET_MESSAGES.reasonRequired)
      return save(
        period,
        {
          status: approve ? 'deduction_approved' : 'deduction_rejected',
          decisionComment: comment,
          decidedBy: code,
          decidedAt: nowIso()
        },
        request
      )
    }
  )

  router.post(
    '/fleet/fuel-consumption/:no/dismiss',
    { feature: 'FUELCONSUMPTION', action: 'update' },
    (request) => {
      const period = periodOf(request)
      if (period.status !== 'to_qualify' && period.status !== 'qualified') {
        throw conflict(FLEET_MESSAGES.gapClosed)
      }
      const comment = readString(readBody(request), 'comment')
      if (!comment) throw unprocessable(FLEET_MESSAGES.reasonRequired)
      return save(period, { status: 'dismissed', decisionComment: comment }, request)
    }
  )
}
