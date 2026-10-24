import {
  isDuplicateRefill,
  refillChecks,
  refillStatus,
  REFILL_CHECK_CODES,
  type RefillCheckCode
} from '@/modules/fleet/fuel-refills/domain/refill'
import type {
  FuelRefillApi,
  RefillCheck
} from '@/modules/fleet/fuel-refills/types/fuelRefill.types'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'

import { nowIsoDateTime } from '@/utils/date'
import { distanceKm } from '@/utils/geo'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { FuelRefillRow } from '../../fixtures/fleet/fuelRefills'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  readBoolean,
  readDateTime,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { optionalReference, requireReference, unknownReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { localize, localizeNumber, type MockLanguage } from '../../i18n'
import { fileMetaOf } from '../files'
import { expectedDrivers, tripAt } from './links'
import { FLEET_MESSAGES } from './messages'
import { fleetSettings } from './settings'

type EditableFields = Pick<
  FuelRefillRow,
  | 'refueledAt'
  | 'driverNo'
  | 'stationSiteNo'
  | 'stationName'
  | 'liters'
  | 'unitPrice'
  | 'odometerKm'
  | 'fullTank'
  | 'receiptFileNo'
>

export function fuelRefillsApi(db: MockDatabase, language: MockLanguage): FuelRefillApi[] {
  const settings = fleetSettings(db).fuel
  const vehicles = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle]))
  const sites = new Map(db.sites.all().map((site) => [site.no, site]))
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  const refills = db.fuelRefills.all()
  const transactions = new Map(
    db.fuelCardTransactions
      .all()
      .filter((transaction) => transaction.refillNo)
      .map((transaction) => [transaction.refillNo, transaction.no])
  )
  const byVehicle = new Map<string, FuelRefillRow[]>()
  for (const refill of [...refills].sort((a, b) => a.refueledAt.localeCompare(b.refueledAt))) {
    byVehicle.set(refill.vehicleNo, [...(byVehicle.get(refill.vehicleNo) ?? []), refill])
  }
  const say = (
    text: (typeof FLEET_MESSAGES)['refillCheckTank'],
    params?: Record<string, string | number>
  ) => localize(language, text, params)
  const number = (value: number) => localizeNumber(language, value)

  return refills.map((refill) => {
    const vehicle = vehicles.get(refill.vehicleNo)
    const history = byVehicle.get(refill.vehicleNo) ?? []
    const previous = history[history.findIndex((row) => row.no === refill.no) - 1] ?? null
    const site = refill.stationSiteNo ? sites.get(refill.stationSiteNo) : undefined
    const gpsGapKm =
      site && refill.latitude !== null && refill.longitude !== null
        ? Math.round(
            distanceKm(site, { latitude: refill.latitude, longitude: refill.longitude }) * 10
          ) / 10
        : null
    const expected = expectedDrivers(db, refill.vehicleNo, refill.refueledAt, refill.tripNo)
    const hour = Number(refill.refueledAt.slice(11, 13))
    const results = refillChecks({
      liters: refill.liters,
      tankCapacityL: vehicle?.tankCapacityL ?? null,
      odometerKm: refill.odometerKm,
      previousOdometerKm: previous?.odometerKm ?? null,
      driverNo: refill.driverNo,
      expectedDriverNos: expected,
      hour,
      startHour: settings.refuelStartHour,
      endHour: settings.refuelEndHour,
      gpsGapKm,
      gpsGapMaxKm: settings.gpsGapMaxKm
    })
    const driverName = refill.driverNo ? (names.get(refill.driverNo) ?? refill.driverNo) : ''
    const details: Record<RefillCheckCode, string> = {
      tank:
        vehicle?.tankCapacityL != null
          ? say(FLEET_MESSAGES.refillCheckTank, {
              liters: number(refill.liters),
              capacity: number(vehicle.tankCapacityL)
            })
          : say(FLEET_MESSAGES.refillCheckTankUnknown),
      odometer: previous
        ? say(FLEET_MESSAGES.refillCheckOdometer, {
            odometer: number(refill.odometerKm),
            previous: number(previous.odometerKm)
          })
        : say(FLEET_MESSAGES.refillCheckOdometerFirst, { odometer: number(refill.odometerKm) }),
      driver: !refill.driverNo
        ? say(FLEET_MESSAGES.refillCheckDriverNone)
        : say(
            results.driver
              ? FLEET_MESSAGES.refillCheckDriverOk
              : FLEET_MESSAGES.refillCheckDriverOther,
            {
              name: driverName
            }
          ),
      hours: say(FLEET_MESSAGES.refillCheckHours, {
        time: refill.refueledAt.slice(11, 16),
        start: settings.refuelStartHour,
        end: settings.refuelEndHour
      }),
      gps:
        gpsGapKm === null
          ? say(FLEET_MESSAGES.refillCheckGpsNone)
          : say(FLEET_MESSAGES.refillCheckGps, { gap: number(gpsGapKm), max: settings.gpsGapMaxKm })
    }
    const checks: RefillCheck[] = REFILL_CHECK_CODES.map((code) => ({
      code,
      ok: results[code],
      detail: details[code]
    }))
    return {
      ...refill,
      vehiclePlate: vehicle?.plate ?? refill.vehicleNo,
      driverName,
      stationLabel: site?.name ?? refill.stationName,
      amount: Math.round(refill.liters * refill.unitPrice),
      transactionNo: transactions.get(refill.no) ?? null,
      checks,
      status: refillStatus(results, !!refill.qualification),
      receipt: refill.receiptFileNo ? fileMetaOf(db, refill.receiptFileNo) : null
    }
  })
}

function refillApiOf(db: MockDatabase, no: string, language: MockLanguage) {
  return fuelRefillsApi(db, language).find((row) => row.no === no)
}

export function registerFuelRefillsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<EditableFields> = {
    refueledAt: (input) => {
      const value = readDateTime(input, 'refueledAt', { required: true }) ?? ''
      if (value > nowIsoDateTime()) throw unprocessable(FLEET_MESSAGES.dateInFuture)
      return value
    },
    driverNo: (input) => optionalReference(db.employees, input, 'driverNo'),
    stationSiteNo: (input) => optionalReference(db.sites, input, 'stationSiteNo'),
    stationName: (input) => readString(input, 'stationName'),
    liters: (input) => readNumber(input, 'liters', { required: true, min: 0.1 }) ?? 0,
    unitPrice: (input) => readNumber(input, 'unitPrice', { required: true, min: 1 }) ?? 0,
    odometerKm: (input) => readNumber(input, 'odometerKm', { required: true, min: 0 }) ?? 0,
    fullTank: (input) => readBoolean(input, 'fullTank', true),
    receiptFileNo: (input) => {
      const fileNo = readString(input, 'receiptFileNo')
      if (!fileNo) return null
      if (!db.files.exists(fileNo)) throw unknownReference('receiptFileNo')
      return fileNo
    }
  }

  function assertNotDuplicate(
    refill: Pick<FuelRefillRow, 'no' | 'vehicleNo' | 'liters' | 'refueledAt'>
  ) {
    const twin = db.fuelRefills
      .all()
      .find((row) => row.no !== refill.no && isDuplicateRefill(row, refill))
    if (twin) throw conflict(FLEET_MESSAGES.refillDuplicate, { no: twin.no })
  }

  registerCrudResource(router, {
    basePath: '/fleet/fuel-refills',
    feature: 'FUELREFILL',
    collection: db.fuelRefills,
    list: (request) => fuelRefillsApi(db, request.language),
    searchColumns: ['no', 'vehiclePlate', 'driverName', 'stationLabel'],
    optionFields: { status: 'refillStatus', channel: 'refillChannel' },
    create: (input) => {
      const vehicleNo = requireReference(db.vehicles, input, 'vehicleNo')
      const fields = {
        refueledAt: readers.refueledAt(input),
        driverNo: readers.driverNo(input),
        stationSiteNo: readers.stationSiteNo(input),
        stationName: readers.stationName(input),
        liters: readers.liters(input),
        unitPrice: readers.unitPrice(input),
        odometerKm: readers.odometerKm(input),
        fullTank: readers.fullTank(input),
        receiptFileNo: readers.receiptFileNo(input)
      }
      const trip = tripAt(db, vehicleNo, fields.refueledAt)
      // Left empty, the driver is the one assigned to the vehicle that day, or the one on the trip.
      const driverNo =
        fields.driverNo ??
        expectedDrivers(db, vehicleNo, fields.refueledAt, trip?.no ?? null)[0] ??
        null
      const refill = {
        no: nextNo(
          db.fuelRefills.all().map((row) => row.no),
          'RCH-',
          5
        ),
        vehicleNo,
        ...fields,
        driverNo,
        tripNo: trip?.no ?? null,
        latitude: readNumber(input, 'latitude', { min: -90, max: 90 }),
        longitude: readNumber(input, 'longitude', { min: -180, max: 180 }),
        channel: 'manual' as const,
        qualification: null
      }
      assertNotDuplicate(refill)
      return refill
    },
    update: (existing, input) => {
      if (existing.qualification) throw conflict(FLEET_MESSAGES.refillQualified)
      const patch = readPatch(input, readers)
      assertNotDuplicate({ ...existing, ...patch })
      return patch
    }
  })

  router.post(
    '/fleet/fuel-refills/:no/qualify',
    { feature: 'FUELREFILL', action: 'update' },
    (request) => {
      const refill = refillApiOf(db, routeParam(request, 'no'), request.language)
      if (!refill) throw unknownReference('no')
      if (refill.status !== 'anomaly') throw conflict(FLEET_MESSAGES.refillNotAnomaly)
      const body = readBody(request)
      const causeNo = requireReference(db.fuelGapCauses, body, 'causeNo')
      if (!db.fuelGapCauses.findOrFail(causeNo).active)
        throw unprocessable(FLEET_MESSAGES.fuelCauseInactive)
      const comment = readString(body, 'comment')
      if (!comment) throw unprocessable(FLEET_MESSAGES.reasonRequired)
      db.fuelRefills.update(refill.no, {
        qualification: { causeNo, comment, by: sessionUser(request).code, at: nowIso() },
        ...stampModified(request)
      })
      return ok(refillApiOf(db, refill.no, request.language))
    }
  )
}
