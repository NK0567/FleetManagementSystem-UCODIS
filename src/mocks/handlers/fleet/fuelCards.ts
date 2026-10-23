import {
  CARD_HOLDER_TYPES,
  cardStatus,
  normalizeCardNumber
} from '@/modules/fleet/fuel-cards/domain/fuelCard'
import type { CardEvent, FuelCardApi } from '@/modules/fleet/fuel-cards/types/fuelCard.types'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import { todayIso } from '@/utils/date'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { FuelCardRow } from '../../fixtures/fleet/fuelCards'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  readAll,
  readDate,
  readEnum,
  readNumber,
  readPatch,
  readString,
  readStringList,
  type FieldReaders
} from '../../http/input'
import { optionalReference, requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { FLEET_MESSAGES } from './messages'

type EditableFields = Pick<
  FuelCardRow,
  | 'number'
  | 'supplierNo'
  | 'vehicleNo'
  | 'driverNo'
  | 'expiresOn'
  | 'monthlyAmount'
  | 'monthlyVolumeL'
  | 'transactionsPerDay'
  | 'zones'
  | 'startHour'
  | 'endHour'
>

const LIMIT_FIELDS = [
  'monthlyAmount',
  'monthlyVolumeL',
  'transactionsPerDay',
  'zones',
  'startHour',
  'endHour'
] as const

export function fuelCardsApi(db: MockDatabase): FuelCardApi[] {
  const today = todayIso()
  const month = today.slice(0, 7)
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  const suppliers = new Map(db.providers.all().map((provider) => [provider.no, provider.name]))
  const transactions = db.fuelCardTransactions.all()
  return db.fuelCards.all().map((card) => {
    const thisMonth = transactions.filter(
      (transaction) => transaction.cardNo === card.no && transaction.transactedAt.startsWith(month)
    )
    const monthAmount = thisMonth.reduce((total, transaction) => total + transaction.amount, 0)
    const monthLiters = thisMonth.reduce((total, transaction) => total + transaction.liters, 0)
    const usagePct = card.monthlyAmount
      ? Math.round((monthAmount / card.monthlyAmount) * 100)
      : card.monthlyVolumeL
        ? Math.round((monthLiters / card.monthlyVolumeL) * 100)
        : null
    return {
      ...card,
      holderName:
        card.holderType === 'vehicle'
          ? (plates.get(card.vehicleNo ?? '') ?? card.vehicleNo ?? '')
          : (names.get(card.driverNo ?? '') ?? card.driverNo ?? ''),
      supplierName: suppliers.get(card.supplierNo) ?? card.supplierNo,
      status: cardStatus(card, today),
      monthAmount,
      monthLiters,
      usagePct
    }
  })
}

function cardApiOf(db: MockDatabase, no: string) {
  return fuelCardsApi(db).find((row) => row.no === no)
}

function cardEvent(request: MockRequest, kind: CardEvent['kind'], comment = ''): CardEvent {
  return { at: nowIso(), by: sessionUser(request).code, kind, comment }
}

export function registerFuelCardsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<EditableFields> = {
    number: (input) => readString(input, 'number', { required: true }),
    supplierNo: (input) => {
      const no = requireReference(db.providers, input, 'supplierNo')
      const supplier = db.providers.findOrFail(no)
      if (supplier.providerType !== 'fuel_supplier' || !supplier.authorized) {
        throw unprocessable(FLEET_MESSAGES.cardSupplierInvalid)
      }
      return no
    },
    vehicleNo: (input) => optionalReference(db.vehicles, input, 'vehicleNo'),
    driverNo: (input) => optionalReference(db.employees, input, 'driverNo'),
    expiresOn: (input) => readDate(input, 'expiresOn', { required: true }) ?? '',
    monthlyAmount: (input) => readNumber(input, 'monthlyAmount', { min: 0 }),
    monthlyVolumeL: (input) => readNumber(input, 'monthlyVolumeL', { min: 0 }),
    transactionsPerDay: (input) => readNumber(input, 'transactionsPerDay', { min: 1, max: 20 }),
    zones: (input) => readStringList(input, 'zones'),
    startHour: (input) => readNumber(input, 'startHour', { min: 0, max: 23 }),
    endHour: (input) => readNumber(input, 'endHour', { min: 0, max: 24 })
  }

  /** One number per card, a holder of the right kind, one active card per holder and supplier. */
  function assertConsistent(
    card: Omit<FuelCardRow, 'createdAt' | 'createdBy' | 'modifiedAt' | 'modifiedBy'>
  ) {
    const others = db.fuelCards.all().filter((row) => row.no !== card.no)
    const twin = others.find(
      (row) => normalizeCardNumber(row.number) === normalizeCardNumber(card.number)
    )
    if (twin) throw conflict(FLEET_MESSAGES.cardNumberTaken, { no: twin.no })
    const holder = card.holderType === 'vehicle' ? card.vehicleNo : card.driverNo
    if (!holder) throw unprocessable(FLEET_MESSAGES.cardHolderRequired)
    const today = todayIso()
    const same = others.find(
      (row) =>
        row.supplierNo === card.supplierNo &&
        row.holderType === card.holderType &&
        (row.holderType === 'vehicle' ? row.vehicleNo : row.driverNo) === holder &&
        cardStatus(row, today) === 'active'
    )
    if (same && cardStatus(card, today) === 'active') {
      throw conflict(FLEET_MESSAGES.cardHolderHasCard, { no: same.no })
    }
  }

  registerCrudResource(router, {
    basePath: '/fleet/fuel-cards',
    feature: 'FUELCARD',
    collection: db.fuelCards,
    list: () => fuelCardsApi(db),
    searchColumns: ['no', 'number', 'holderName'],
    optionFields: { holderType: 'cardHolderType', status: 'cardStatus' },
    create: (input, request) => {
      const holderType =
        readEnum(input, 'holderType', CARD_HOLDER_TYPES, { required: true }) ?? 'vehicle'
      const fields = readAll(input, readers)
      const card = {
        no: nextNo(
          db.fuelCards.all().map((row) => row.no),
          'CC-',
          4
        ),
        holderType,
        ...fields,
        vehicleNo: holderType === 'vehicle' ? fields.vehicleNo : null,
        driverNo: holderType === 'driver' ? fields.driverNo : null,
        blockedAt: null,
        blockReason: '',
        history: [cardEvent(request, 'created')]
      }
      assertConsistent(card)
      return card
    },
    update: (existing, input, request) => {
      const patch = readPatch(input, readers)
      const next = { ...existing, ...patch }
      assertConsistent(next)
      const limitsChanged = LIMIT_FIELDS.some(
        (field) =>
          field in patch && JSON.stringify(patch[field]) !== JSON.stringify(existing[field])
      )
      return limitsChanged
        ? { ...patch, history: [...existing.history, cardEvent(request, 'limits')] }
        : patch
    }
  })

  router.post(
    '/fleet/fuel-cards/:no/block',
    { feature: 'FUELCARD', action: 'update' },
    (request) => {
      const card = db.fuelCards.findOrFail(routeParam(request, 'no'))
      if (cardStatus(card, todayIso()) !== 'active') throw conflict(FLEET_MESSAGES.cardNotActive)
      const reason = readString(readBody(request), 'reason')
      if (!reason) throw unprocessable(FLEET_MESSAGES.reasonRequired)
      db.fuelCards.update(card.no, {
        blockedAt: nowIso(),
        blockReason: reason,
        history: [...card.history, cardEvent(request, 'blocked', reason)],
        ...stampModified(request)
      })
      return ok(cardApiOf(db, card.no))
    }
  )

  router.post(
    '/fleet/fuel-cards/:no/unblock',
    { feature: 'FUELCARD', action: 'update' },
    (request) => {
      const card = db.fuelCards.findOrFail(routeParam(request, 'no'))
      const status = cardStatus(card, todayIso())
      if (status === 'expired') throw conflict(FLEET_MESSAGES.cardExpired)
      if (status !== 'blocked') throw conflict(FLEET_MESSAGES.cardNotBlocked)
      const comment = readString(readBody(request), 'comment')
      db.fuelCards.update(card.no, {
        blockedAt: null,
        blockReason: '',
        history: [...card.history, cardEvent(request, 'unblocked', comment)],
        ...stampModified(request)
      })
      return ok(cardApiOf(db, card.no))
    }
  )
}
