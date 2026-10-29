import type {
  CardOverrun,
  FuelCardTransactionApi
} from '@/modules/fleet/fuel-card-transactions/types/fuelCardTransaction.types'
import {
  closestRefill,
  overruns,
  type OverrunCode
} from '@/modules/fleet/fuel-cards/domain/fuelCard'
import { isDuplicateRefill } from '@/modules/fleet/fuel-refills/domain/refill'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import { minutesBetween, nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { FuelCardRow } from '../../fixtures/fleet/fuelCards'
import type { FuelRefillRow } from '../../fixtures/fleet/fuelRefills'
import {
  readBody,
  registerCrudResource,
  routeParam,
  stampCreated,
  stampModified
} from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readBoolean, readDateTime, readNumber, readString } from '../../http/input'
import { requireReference } from '../../http/references'
import { importRows } from '../../http/importRows'
import { normalizeCardNumber } from '@/modules/fleet/fuel-card-transactions/domain/transactionImport'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import type { MockRequest } from '../../http/types'
import { localize, type MockLanguage } from '../../i18n'
import { FLEET_MESSAGES } from './messages'
import { fleetSettings } from './settings'

const OVERRUN_MESSAGES: Record<OverrunCode, (typeof FLEET_MESSAGES)['overrunZone']> = {
  expired: FLEET_MESSAGES.overrunExpired,
  blocked: FLEET_MESSAGES.overrunBlocked,
  zone: FLEET_MESSAGES.overrunZone,
  hours: FLEET_MESSAGES.overrunHours,
  dailyCount: FLEET_MESSAGES.overrunDailyCount,
  monthlyAmount: FLEET_MESSAGES.overrunMonthlyAmount,
  monthlyVolume: FLEET_MESSAGES.overrunMonthlyVolume
}

/** Refills of the card holder: those of its vehicle, or those its driver made. */
function holderRefills(db: MockDatabase, card: FuelCardRow): FuelRefillRow[] {
  return db.fuelRefills
    .all()
    .filter((refill) =>
      card.holderType === 'vehicle'
        ? refill.vehicleNo === card.vehicleNo
        : refill.driverNo === card.driverNo
    )
}

/** Refills no other transaction holds yet. */
function freeRefills(db: MockDatabase, card: FuelCardRow, transactionNo: string): FuelRefillRow[] {
  const taken = new Set(
    db.fuelCardTransactions
      .all()
      .filter((row) => row.refillNo && row.no !== transactionNo)
      .map((row) => row.refillNo)
  )
  return holderRefills(db, card).filter((refill) => !taken.has(refill.no))
}

export function fuelCardTransactionsApi(
  db: MockDatabase,
  language: MockLanguage
): FuelCardTransactionApi[] {
  const settings = fleetSettings(db).fuel
  const cards = new Map(db.fuelCards.all().map((card) => [card.no, card]))
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  const transactions = db.fuelCardTransactions.all()
  return transactions.map((transaction) => {
    const card = cards.get(transaction.cardNo) as FuelCardRow
    const history = transactions.filter((row) => row.cardNo === transaction.cardNo)
    const codes = overruns(
      transaction,
      {
        expiresOn: card.expiresOn,
        blockedAt: card.blockedAt,
        limits: {
          monthlyAmount: card.monthlyAmount,
          monthlyVolumeL: card.monthlyVolumeL,
          transactionsPerDay: card.transactionsPerDay,
          zones: card.zones,
          startHour: card.startHour,
          endHour: card.endHour
        }
      },
      history
    )
    const detail: CardOverrun[] = codes.map((code) => ({
      code,
      detail: localize(language, OVERRUN_MESSAGES[code], {
        city: transaction.city,
        hour: Number(transaction.transactedAt.slice(11, 13)),
        start: card.startHour ?? 0,
        end: card.endHour ?? 24,
        max: card.transactionsPerDay ?? 0
      })
    }))
    const candidate = transaction.refillNo
      ? null
      : closestRefill(
          transaction,
          freeRefills(db, card, transaction.no),
          settings.matchingToleranceMin,
          settings.matchingTolerancePct
        )
    return {
      ...transaction,
      cardNumber: card.number,
      holderName:
        card.holderType === 'vehicle'
          ? (plates.get(card.vehicleNo ?? '') ?? '')
          : (names.get(card.driverNo ?? '') ?? ''),
      overruns: detail,
      overrunCount: detail.length,
      matched: !!transaction.refillNo,
      candidateNo: candidate?.no ?? null
    }
  })
}

function transactionApiOf(db: MockDatabase, no: string, language: MockLanguage) {
  return fuelCardTransactionsApi(db, language).find((row) => row.no === no)
}

export function registerFuelCardTransactionsHandlers(router: MockRouter, db: MockDatabase): void {
  const respond = (no: string, request: MockRequest) =>
    ok(transactionApiOf(db, no, request.language))

  function unmatched(no: string) {
    const transaction = db.fuelCardTransactions.findOrFail(no)
    if (transaction.refillNo) throw conflict(FLEET_MESSAGES.transactionMatched)
    return transaction
  }

  /** One way to build a transaction, typed in or imported from the supplier's statement. */
  function buildTransaction(input: Record<string, unknown>, cardNo: string) {
    const transactedAt = readDateTime(input, 'transactedAt', { required: true }) ?? ''
    if (transactedAt > nowIsoDateTime()) throw unprocessable(FLEET_MESSAGES.dateInFuture)
    const transaction = {
      no: nextNo(
        db.fuelCardTransactions.all().map((row) => row.no),
        'TX-',
        5
      ),
      cardNo,
      transactedAt,
      station: readString(input, 'station', { required: true }),
      city: readString(input, 'city', { required: true }),
      liters: readNumber(input, 'liters', { required: true, min: 0.1 }) ?? 0,
      amount: readNumber(input, 'amount', { required: true, min: 1 }) ?? 0,
      refillNo: null,
      matchMode: null
    }
    // The supplier's file may be imported twice: same card, same minute, same litres.
    const twin = db.fuelCardTransactions
      .all()
      .find(
        (row) =>
          row.cardNo === cardNo &&
          row.transactedAt.slice(0, 16) === transactedAt.slice(0, 16) &&
          row.liters === transaction.liters
      )
    if (twin) throw conflict(FLEET_MESSAGES.transactionDuplicate, { no: twin.no })
    return transaction
  }

  /** Matches every transaction still alone with the closest refill of its holder. */
  function matchAll(request: MockRequest): number {
    const settings = fleetSettings(db).fuel
    let matched = 0
    // Detached transactions were judged by someone: an automatic match leaves them alone.
    for (const transaction of db.fuelCardTransactions
      .all()
      .filter((row) => !row.refillNo && !row.matchMode)) {
      const card = db.fuelCards.findOrFail(transaction.cardNo)
      const refill = closestRefill(
        transaction,
        freeRefills(db, card, transaction.no),
        settings.matchingToleranceMin,
        settings.matchingTolerancePct
      )
      if (!refill) continue
      db.fuelCardTransactions.update(transaction.no, {
        refillNo: refill.no,
        matchMode: 'auto',
        ...stampModified(request)
      })
      matched++
    }
    return matched
  }

  // The supplier's statement: each line goes through the same rules, then is matched with the refills.
  router.post(
    '/fleet/fuel-card-transactions/import',
    { feature: 'FUELCARD', action: 'insert' },
    (request) => {
      const cards = new Map(
        db.fuelCards.all().map((card) => [normalizeCardNumber(card.number), card.no])
      )
      const report = importRows(readBody(request).rows, request, (input) => {
        const number = readString(input, 'cardNumber', { required: true })
        const cardNo = cards.get(normalizeCardNumber(number))
        if (!cardNo) throw unprocessable(FLEET_MESSAGES.cardNumberUnknown, { number })
        return db.fuelCardTransactions.insert(
          stampCreated(buildTransaction(input, cardNo), request)
        ).no
      })
      return ok({ ...report, matched: report.created ? matchAll(request) : 0 })
    }
  )

  registerCrudResource(router, {
    basePath: '/fleet/fuel-card-transactions',
    feature: 'FUELCARD',
    collection: db.fuelCardTransactions,
    list: (request) => fuelCardTransactionsApi(db, request.language),
    searchColumns: ['no', 'cardNumber', 'station', 'city'],
    create: (input) => buildTransaction(input, requireReference(db.fuelCards, input, 'cardNo'))
  })

  router.post(
    '/fleet/fuel-card-transactions/match-all',
    { feature: 'FUELCARD', action: 'update' },
    (request) => ok({ matched: matchAll(request) })
  )

  router.post(
    '/fleet/fuel-card-transactions/:no/match',
    { feature: 'FUELCARD', action: 'update' },
    (request) => {
      const transaction = unmatched(routeParam(request, 'no'))
      const card = db.fuelCards.findOrFail(transaction.cardNo)
      const refillNo = requireReference(db.fuelRefills, readBody(request), 'refillNo')
      if (db.fuelCardTransactions.all().some((row) => row.refillNo === refillNo)) {
        throw conflict(FLEET_MESSAGES.transactionRefillTaken)
      }
      const refill = holderRefills(db, card).find((row) => row.no === refillNo)
      const tolerance = fleetSettings(db).fuel.matchingToleranceMin
      if (
        !refill ||
        Math.abs(minutesBetween(transaction.transactedAt, refill.refueledAt)) > tolerance
      ) {
        throw unprocessable(FLEET_MESSAGES.transactionRefillInvalid)
      }
      db.fuelCardTransactions.update(transaction.no, {
        refillNo,
        matchMode: 'manual',
        ...stampModified(request)
      })
      return respond(transaction.no, request)
    }
  )

  router.post(
    '/fleet/fuel-card-transactions/:no/detach',
    { feature: 'FUELCARD', action: 'update' },
    (request) => {
      const transaction = db.fuelCardTransactions.findOrFail(routeParam(request, 'no'))
      if (!transaction.refillNo) throw conflict(FLEET_MESSAGES.transactionNotMatched)
      db.fuelCardTransactions.update(transaction.no, {
        refillNo: null,
        matchMode: 'detached',
        ...stampModified(request)
      })
      return respond(transaction.no, request)
    }
  )

  router.post(
    '/fleet/fuel-card-transactions/:no/refill',
    { feature: 'FUELCARD', action: 'update' },
    (request) => {
      const transaction = unmatched(routeParam(request, 'no'))
      const card = db.fuelCards.findOrFail(transaction.cardNo)
      const day = transaction.transactedAt.slice(0, 10)
      const assignment = db.driverAssignments
        .all()
        .find(
          (row) =>
            (card.holderType === 'vehicle'
              ? row.vehicleNo === card.vehicleNo
              : row.employeeNo === card.driverNo) &&
            row.startDate <= day &&
            (!row.endDate || row.endDate >= day)
        )
      const vehicleNo = card.vehicleNo ?? assignment?.vehicleNo ?? null
      if (!vehicleNo) throw unprocessable(FLEET_MESSAGES.cardNoVehicle)
      const body = readBody(request)
      const refill: Omit<FuelRefillRow, 'createdAt' | 'createdBy' | 'modifiedAt' | 'modifiedBy'> = {
        no: nextNo(
          db.fuelRefills.all().map((row) => row.no),
          'RCH-',
          5
        ),
        refueledAt: transaction.transactedAt,
        vehicleNo,
        driverNo: card.driverNo ?? assignment?.employeeNo ?? null,
        tripNo: null,
        stationSiteNo: null,
        stationName: transaction.station,
        latitude: null,
        longitude: null,
        liters: transaction.liters,
        unitPrice: Math.round(transaction.amount / transaction.liters),
        odometerKm: readNumber(body, 'odometerKm', { required: true, min: 0 }) ?? 0,
        fullTank: readBoolean(body, 'fullTank', true),
        channel: 'card',
        receiptFileNo: null,
        qualification: null
      }
      const twin = db.fuelRefills.all().find((row) => isDuplicateRefill(row, refill))
      if (twin) throw conflict(FLEET_MESSAGES.refillDuplicate, { no: twin.no })
      db.fuelRefills.insert(stampCreated(refill, request))
      db.fuelCardTransactions.update(transaction.no, {
        refillNo: refill.no,
        matchMode: 'manual',
        ...stampModified(request)
      })
      return respond(transaction.no, request)
    }
  )
}
