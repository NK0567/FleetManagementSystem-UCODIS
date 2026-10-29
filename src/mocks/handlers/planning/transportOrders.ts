import {
  allocate,
  compartmentsOf,
  familyAllowed,
  type CompartmentIssue
} from '@/modules/fleet/vehicles/domain/compartments'
import {
  plannedSchedule,
  type RouteStop
} from '@/modules/fleet/route-templates/domain/routeTemplate'
import { forbiddenTogether } from '@/modules/planning/product-compatibilities/domain/productCompatibility'
import {
  awaitingClosing,
  canCancel,
  canEditLines,
  canEditSchedule,
  canPlan,
  isExpired,
  loadFill,
  loadIssue,
  pointIssue,
  transportOrderStatus,
  TRANSPORT_MEANS,
  TRANSPORT_MODES,
  type LoadIssue,
  type LoadLine,
  type PointIssue,
  type TransportMeans,
  type TransportOrderEventKind
} from '@/modules/planning/transport-orders/domain/transportOrder'
import type {
  TransportOrderApi,
  TransportOrderLineApi
} from '@/modules/planning/transport-orders/types/transportOrder.types'
import {
  emptyFollowUp,
  lineOutOfTour,
  firstArrivalMarked,
  linesConfirmed,
  opaqueToken,
  trackingExpiry
} from '@/modules/planning/customer-confirmations/domain/confirmation'
import { loadingReady } from '@/modules/planning/loading/domain/loading'
import { linesDelivered } from '@/modules/planning/execution/domain/execution'
import { emptyQuality } from '@/modules/planning/delivery-quality/domain/quality'
import { emptyDossier } from '@/modules/planning/closing/domain/closing'
import { combinationCapacity, type LoadCapacity } from '@/modules/fleet/vehicles/domain/capacity'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import { distanceKm } from '@/utils/geo'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { TripRow } from '../../fixtures/fleet/trips'
import type {
  TransportOrderEventRow,
  TransportOrderLineRow,
  TransportOrderRow
} from '../../fixtures/planning/transportOrders'
import {
  readBody,
  registerCrudResource,
  routeParam,
  stampCreated,
  stampModified
} from '../../http/crudResource'
import { conflict, notFound, unprocessable } from '../../http/errors'
import {
  invalidField,
  readDateTime,
  readEnum,
  readNumber,
  readString,
  readStringList
} from '../../http/input'
import { optionalReference, requireReference, unknownReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { localize, toMockLanguage, type MockLanguage } from '../../i18n'
import { orderPlace, visibleTo } from './perimeter'
import { notifyDriver } from './notifications'
import { messageRecipients } from './recipientMessages'
import { buildTrip, overlapWarnings } from '../fleet/trips'
import { equipmentApi } from '../fleet/vehicles'
import { employeeNames, vehiclePlates } from '../fleet/links'
import { plannedArrival } from '../fleet/tripIndex'
import {
  deliveryRequestStatus,
  linesSummary,
  requestLines
} from '@/modules/planning/delivery-requests/domain/deliveryRequest'
import type { DeliveryRequestRow } from '../../fixtures/planning/deliveryRequests'
import { nextDeliveryRequestNo } from './deliveryRequests'
import { PLANNING_MESSAGES } from './messages'
import { readReason } from './planningReasons'
import { planningSettings } from './settings'
import { CIRCUIT_MESSAGES } from './circuitMessages'
import { checkDeliveryRequest, newDeliveryRequest, recipientPreferences } from './deliveryRequests'
import { routePlanOf } from './routePlan'
import { offeredChannels } from '@/modules/planning/planning-settings/domain/planningSettings'

const BASE_PATH = '/planning/transport-orders'

const shown = (value: number) => Math.round(value * 10) / 10

export function nextTransportOrderNo(db: MockDatabase): string {
  return nextNo(
    db.transportOrders.all().map((row) => row.no),
    `TR-${todayIso().slice(0, 4)}-`,
    4
  )
}

export function transportOrdersApi(db: MockDatabase, userCode?: string): TransportOrderApi[] {
  const routes = new Map(db.routeTemplates.all().map((route) => [route.no, route]))
  const trips = new Map(db.trips.all().map((trip) => [trip.no, trip]))
  const points = new Map(db.deliveryPoints.all().map((point) => [point.no, point]))
  const products = new Map(db.products.all().map((product) => [product.no, product]))
  const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
  const carriers = new Map(db.providers.all().map((provider) => [provider.no, provider.name]))
  const reasons = new Map(db.planningReasons.all().map((reason) => [reason.no, reason.name]))
  const requests = new Map(db.deliveryRequests.all().map((request) => [request.no, request]))
  const plates = vehiclePlates(db)
  const names = employeeNames(db)
  const today = todayIso()

  return db.transportOrders
    .all()
    .filter((row) => !userCode || visibleTo(db, userCode, orderPlace(db, row)))
    .map((row) => {
      const trip = row.tripNo ? trips.get(row.tripNo) : undefined
      const routeNo = trip?.routeTemplateNo ?? row.routeTemplateNo
      const route = routeNo ? routes.get(routeNo) : undefined
      const departure = trip?.plannedDeparture ?? row.plannedDeparture
      const lines = row.lines.map((line): TransportOrderLineApi => {
        const point = points.get(line.deliveryPointNo)
        const product = products.get(line.productNo)
        const source = requests.get(line.deliveryRequestNo ?? '')
        return {
          ...line,
          volumeM3: line.volumeM3 ?? null,
          externalReference: source?.externalReference ?? '',
          replannedOn: line.replannedOn ?? null,
          replannedToOrderNo: line.replannedToOrderNo ?? null,
          replannedFrom: line.replannedFrom ?? null,
          unavailabilityReasonName: reasons.get(line.unavailabilityReasonNo ?? '') ?? '',
          postponementReasonName: reasons.get(line.postponementReasonNo ?? '') ?? '',
          undeliveredReasonName: reasons.get(line.undeliveredReasonNo ?? '') ?? '',
          deliveryPointName: point?.name ?? '',
          recipientName: customers.get(point?.customerNo ?? '') ?? '',
          productName: product?.name ?? '',
          unit: product?.unit ?? '',
          contestReasonName: reasons.get(line.contestReasonNo ?? '') ?? '',
          // Goods coming back: why, and how the warehouse found them (TRS04-US01).
          returnReasonName:
            reasons.get(
              line.refusalReasonNo ??
                line.undeliveredReasonNo ??
                (line.returnedAt ? line.postponementReasonNo : null) ??
                ''
            ) ??
            line.incident?.comment ??
            '',
          returnNonconformityReasonName: reasons.get(line.returnNonconformityReasonNo ?? '') ?? ''
        }
      })
      const recipients: string[] = []
      for (const line of lines) {
        if (line.recipientName && !recipients.includes(line.recipientName)) {
          recipients.push(line.recipientName)
        }
      }
      // The load is the sum of the lines still in the order (TRS01-US08).
      const inOrder = row.lines.filter((line) => !lineOutOfTour(line))
      const weights = inOrder
        .map((line) => line.weightKg)
        .filter((weight): weight is number => weight !== null)
      const volumes = inOrder
        .map((line) => line.volumeM3 ?? null)
        .filter((volume): volume is number => volume !== null)
      const fuelLiters = inOrder.reduce((total, line) => {
        const product = products.get(line.productNo)
        return total + (product?.isFuel ? line.quantity : 0)
      }, 0)
      const capacity = capacityOfOrder(db, row, trip)
      const status = statusOf(db, row)
      return {
        no: row.no,
        routeTemplateNo: routeNo,
        routeName: route?.name ?? '',
        plannedDeparture: departure,
        plannedArrival: arrivalOf(departure, route?.stops, trip),
        comment: row.comment,
        lines,
        lineCount: lines.length,
        recipientSummary: recipients.join(', '),
        totalWeightKg: weights.length ? weights.reduce((total, weight) => total + weight, 0) : null,
        totalVolumeM3: volumes.length
          ? Math.round(volumes.reduce((total, volume) => total + volume, 0) * 1000) / 1000
          : null,
        totalFuelL: fuelLiters > 0 ? fuelLiters : null,
        capacity,
        fill: loadFill(asLoad(db, inOrder), capacity),
        transportMode: row.transportMode ?? 'road',
        expired: isExpired(status, departure, today),
        replanDate: row.replanDate ?? null,
        proposedVehicleNo: row.proposedVehicleNo ?? null,
        proposedTrailerNo: row.proposedTrailerNo ?? null,
        proposedCarrierNo: row.proposedCarrierNo ?? null,
        routePlan: routeNo ? routePlanOf(db, routeNo, departure, row) : null,
        routeHistory: (row.routeHistory ?? []).map((item) => ({
          at: item.at,
          by: item.by,
          reason: item.reason,
          routeName: routes.get(item.routeTemplateNo ?? '')?.name ?? ''
        })),
        means: row.means,
        tripNo: row.tripNo,
        tripStatus: trip?.status ?? null,
        vehicleNo: trip?.vehicleNo ?? null,
        vehiclePlate: trip ? (plates.get(trip.vehicleNo) ?? '') : '',
        trailerNo: trip?.trailerNo ?? null,
        trailerPlate: trip?.trailerNo ? (plates.get(trip.trailerNo) ?? '') : '',
        compartmentPlan: trip
          ? compartmentPlan(db, row.lines, trip.vehicleNo, trip.trailerNo ?? null)
          : null,
        vehicleProductFamilies: trip
          ? goodsCarriers(db, trip.vehicleNo, trip.trailerNo ?? null).flatMap(
              (vehicle) => vehicle.productFamilies ?? []
            )
          : [],
        driverNo: trip?.driverNo ?? null,
        driverName: trip ? (names.get(trip.driverNo) ?? '') : '',
        carrierNo: row.carrierNo,
        carrierName: carriers.get(row.carrierNo ?? '') ?? '',
        carrierVehiclePlate: row.carrierVehiclePlate,
        carrierDriverName: row.carrierDriverName,
        cancellationReasonNo: row.cancellationReasonNo,
        cancellationReasonName: reasons.get(row.cancellationReasonNo ?? '') ?? '',
        cancellationComment: row.cancellationComment,
        cancelledAt: row.cancelledAt,
        cancelledBy: row.cancelledBy,
        events: row.events,
        status: statusOf(db, row),
        awaitingClosing: awaitingClosing(statusOf(db, row), linesDelivered(row.lines)),
        archived: statusOf(db, row) === 'completed',
        // The recipients' answers are on the lines; the orderers' ones on their orders (TRS04-US07).
        ordererSurveys: [
          ...new Set(row.lines.map((line) => line.deliveryRequestNo).filter(Boolean))
        ]
          .map((no) => db.deliveryRequests.find(no!))
          .filter((request) => !!request?.ordererSurvey)
          .map((request) => ({
            requestNo: request!.no,
            ordererName: customers.get(request!.ordererNo) ?? request!.ordererNo,
            ...request!.ordererSurvey!
          })),
        // A planned order still waiting for recipients to confirm shows an icon in the list.
        awaitingConfirmations:
          statusOf(db, row) === 'planned'
            ? row.lines.filter((line) => !line.confirmedAt && !lineOutOfTour(line)).length
            : 0,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
        modifiedAt: row.modifiedAt,
        modifiedBy: row.modifiedBy
      }
    })
}

function arrivalOf(
  departure: string | null,
  stops: readonly RouteStop[] | undefined,
  trip: TripRow | undefined
): string | null {
  if (trip) return plannedArrival(trip)
  if (!departure || !stops?.length) return null
  return plannedSchedule(departure, stops).at(-1) ?? departure
}

function oneOf(db: MockDatabase, no: string): TransportOrderApi {
  const order = transportOrdersApi(db).find((item) => item.no === no)
  if (!order) throw notFound()
  return order
}

/** The capacity the load is compared with: the planned combination, else the proposed one. */
function capacityOfOrder(
  db: MockDatabase,
  row: TransportOrderRow,
  trip: TripRow | undefined
): LoadCapacity | null {
  const vehicleNo = trip?.vehicleNo ?? (row.means ? null : (row.proposedVehicleNo ?? null))
  if (!vehicleNo || !db.vehicles.exists(vehicleNo)) return null
  const trailerNo = trip ? (trip.trailerNo ?? null) : (row.proposedTrailerNo ?? null)
  return serving(db, vehicleNo, trailerNo && db.vehicles.exists(trailerNo) ? trailerNo : null)
    .capacity
}

function statusOf(db: MockDatabase, row: TransportOrderRow) {
  const trip = row.tripNo ? db.trips.find(row.tripNo) : undefined
  return transportOrderStatus({
    cancelledAt: row.cancelledAt,
    means: row.means,
    tripStatus: trip?.status ?? null,
    linesConfirmed: linesConfirmed(row.lines),
    firstArrival: firstArrivalMarked(row.lines),
    loadingReady: loadingReady(row.lines),
    carrierDeparted: row.carrierDepartedAt !== null,
    linesDelivered: linesDelivered(row.lines),
    closedAt: row.closedAt
  })
}

function readRoute(db: MockDatabase, input: Record<string, unknown>): string | null {
  const no = optionalReference(db.routeTemplates, input, 'routeTemplateNo')
  if (no && !db.routeTemplates.findOrFail(no).active) {
    throw unprocessable(PLANNING_MESSAGES.orderRouteInactive)
  }
  return no
}

function readDeparture(input: Record<string, unknown>): string | null {
  const value = readDateTime(input, 'plannedDeparture')
  if (value && value.slice(0, 10) < todayIso()) {
    throw unprocessable(PLANNING_MESSAGES.orderDepartureInPast)
  }
  return value
}

function readLimited(input: Record<string, unknown>, field: string, max: number): string {
  const value = readString(input, field)
  if (value.length > max) throw invalidField(field)
  return value
}

interface RawLine {
  deliveryRequestNo: string | null
  /** A part of the order's lines; empty takes them all. */
  requestLineNos?: number[]
  deliveryPointNo: string
  productNo: string
  quantity: number
  weightKg: number | null
  volumeM3?: number | null
  /** A reduced quantity for some lines of the order taken (TRS01-US17). */
  lineQuantities?: Map<number, number>
  /** An order keyed in the transport order: its orderer (TRS01-US06). */
  ordererNo?: string
  /** A line already in the order without an order behind it, kept as it stands. */
  keepLineNo?: number
}

function readLines(input: Record<string, unknown>): RawLine[] {
  const raw = input.lines
  if (!Array.isArray(raw)) throw invalidField('lines')
  return raw.map((item) => {
    if (!item || typeof item !== 'object') throw invalidField('lines')
    const row = item as Record<string, unknown>
    const deliveryRequestNo = readString(row, 'deliveryRequestNo') || null
    if (deliveryRequestNo) {
      const picked = row.requestLineNos
      if (
        picked != null &&
        (!Array.isArray(picked) || picked.some((no) => !Number.isInteger(no)))
      ) {
        throw invalidField('requestLineNos')
      }
      const reduced = row.lineQuantities
      if (reduced != null && (typeof reduced !== 'object' || Array.isArray(reduced))) {
        throw invalidField('lineQuantities')
      }
      const lineQuantities = new Map<number, number>()
      for (const [key, value] of Object.entries((reduced ?? {}) as Record<string, unknown>)) {
        const quantity = Number(value)
        if (!Number.isInteger(Number(key)) || !Number.isFinite(quantity)) {
          throw invalidField('lineQuantities')
        }
        lineQuantities.set(Number(key), quantity)
      }
      return {
        deliveryRequestNo,
        requestLineNos: (picked as number[] | undefined) ?? [],
        lineQuantities,
        deliveryPointNo: '',
        productNo: '',
        quantity: 0,
        weightKg: null
      }
    }
    const keepLineNo = readNumber(row, 'lineNo', { min: 1 })
    return {
      deliveryRequestNo: null,
      keepLineNo: keepLineNo ?? undefined,
      ordererNo: readString(row, 'ordererNo'),
      deliveryPointNo: readString(row, 'deliveryPointNo', { required: true }),
      productNo: readString(row, 'productNo', { required: true }),
      quantity:
        readNumber(row, 'quantity', { required: true, min: 0.001, max: 1_000_000_000 }) ?? 0,
      weightKg: readNumber(row, 'weightKg', { min: 0, max: 1_000_000 }),
      volumeM3: readNumber(row, 'volumeM3', { min: 0, max: 10_000 })
    }
  })
}

/**
 * A request can join an order while pending. Past its validity it is blocked when the company
 * blocks expired orders, and otherwise taken after a warning to the planner (TRS07-US07).
 */
function assertRequestTakeable(
  db: MockDatabase,
  request: DeliveryRequestRow,
  orderNo: string | null,
  language: MockLanguage = 'fr'
): string | null {
  if (request.transportOrderNo && request.transportOrderNo !== orderNo) {
    throw conflict(PLANNING_MESSAGES.orderRequestTaken, { no: request.no })
  }
  if (request.cancelledAt || request.rejectedAt) {
    throw unprocessable(PLANNING_MESSAGES.orderRequestUnavailable, { no: request.no })
  }
  const status = deliveryRequestStatus(request, todayIso())
  if (status === 'planned' && request.transportOrderNo === orderNo) return null
  if (status === 'expired' && planningSettings(db).requests.expiredDateMode === 'block') {
    throw unprocessable(PLANNING_MESSAGES.orderRequestExpired, { no: request.no })
  }
  if (status !== 'pending' && status !== 'expired') {
    throw unprocessable(PLANNING_MESSAGES.orderRequestUnavailable, { no: request.no })
  }
  return status === 'expired'
    ? localize(language, CIRCUIT_MESSAGES.requestExpiredAlert, { no: request.no })
    : null
}

function assertActiveGoods(db: MockDatabase, deliveryPointNo: string, productNo: string): void {
  if (!db.deliveryPoints.exists(deliveryPointNo)) throw unknownReference('deliveryPointNo')
  if (!db.products.exists(productNo)) throw unknownReference('productNo')
  if (!db.deliveryPoints.findOrFail(deliveryPointNo).active) {
    throw unprocessable(PLANNING_MESSAGES.orderPointInactive)
  }
  if (!db.products.findOrFail(productNo).active) {
    throw unprocessable(PLANNING_MESSAGES.orderProductInactive)
  }
}

/** Part of an order (commande) taken: the lines left behind become a new order, still pending. */
interface RequestSplit {
  requestNo: string
  keep: number[]
  /** Lines taken with a reduced quantity: the rest of each stays on the new order. */
  reduced?: Map<number, number>
}

/** An order keyed by the planner in the transport order, recorded once the warnings are accepted. */
interface ManualEntry {
  lineIndex: number
  ordererNo: string
}

/** A share of a weight or a volume, for a part of the quantity. */
const prorata = (value: number | null | undefined, part: number, whole: number) =>
  value == null || whole <= 0 ? null : Math.round(((value * part) / whole) * 1000) / 1000

/**
 * Lines as they will be stored. An order supplies its own point, products and quantities, one
 * line of the transport order per line of the order; taking only some of its lines, or less of a
 * line, shares it. A line keyed without an order becomes an order issued by the planner, when the
 * company allows it (TRS01-US06).
 */
function resolveLines(
  db: MockDatabase,
  orderNo: string | null,
  rawLines: RawLine[],
  language: MockLanguage = 'fr',
  previous: readonly TransportOrderLineRow[] = []
): {
  lines: TransportOrderLineRow[]
  splits: RequestSplit[]
  warnings: string[]
  manual: ManualEntry[]
} {
  const seen = new Set<string>()
  const splits: RequestSplit[] = []
  const warnings: string[] = []
  const manual: ManualEntry[] = []
  const resolved: Omit<TransportOrderLineRow, 'lineNo'>[] = []
  for (const raw of rawLines) {
    if (raw.deliveryRequestNo) {
      if (seen.has(raw.deliveryRequestNo)) {
        throw unprocessable(PLANNING_MESSAGES.orderRequestRepeated, { no: raw.deliveryRequestNo })
      }
      seen.add(raw.deliveryRequestNo)
      if (!db.deliveryRequests.exists(raw.deliveryRequestNo)) {
        throw unknownReference('deliveryRequestNo')
      }
      const request = db.deliveryRequests.findOrFail(raw.deliveryRequestNo)
      const expired = assertRequestTakeable(db, request, orderNo, language)
      if (expired) warnings.push(expired)
      const all = requestLines(request)
      const wanted = raw.requestLineNos?.length
        ? all.filter((line) => raw.requestLineNos!.includes(line.lineNo))
        : all
      if (!wanted.length || wanted.length !== (raw.requestLineNos?.length || all.length)) {
        throw invalidField('requestLineNos')
      }
      // A quantity may be reduced: never above what was ordered, never down to nothing.
      const reduced = new Map<number, number>()
      for (const [lineNo, quantity] of raw.lineQuantities ?? []) {
        const line = wanted.find((item) => item.lineNo === lineNo)
        if (!line || quantity <= 0 || quantity > line.quantity) {
          throw unprocessable(CIRCUIT_MESSAGES.partialQuantity, { no: request.no, line: lineNo })
        }
        if (quantity < line.quantity) reduced.set(lineNo, quantity)
      }
      if (wanted.length < all.length || reduced.size) {
        splits.push({ requestNo: request.no, keep: wanted.map((line) => line.lineNo), reduced })
        // Full delivery is a preference: the planner is warned, never blocked (TRS01-US17).
        if (request.fullDeliveryRequired && wanted.length < all.length) {
          warnings.push(
            localize(language, PLANNING_MESSAGES.fullDeliveryPartial, { no: request.no })
          )
        }
        if (request.fullDeliveryRequired && reduced.size) {
          warnings.push(
            localize(language, CIRCUIT_MESSAGES.fullDeliveryReduced, { no: request.no })
          )
        }
      }
      for (const line of wanted) {
        assertActiveGoods(db, request.deliveryPointNo, line.productNo)
        const quantity = reduced.get(line.lineNo) ?? line.quantity
        resolved.push({
          deliveryRequestNo: request.no,
          requestLineNo: line.lineNo,
          deliveryPointNo: request.deliveryPointNo,
          productNo: line.productNo,
          quantity,
          weightKg:
            quantity === line.quantity
              ? line.weightKg
              : prorata(line.weightKg, quantity, line.quantity),
          volumeM3:
            quantity === line.quantity
              ? line.volumeM3
              : prorata(line.volumeM3, quantity, line.quantity),
          ...emptyFollowUp(),
          ...emptyQuality()
        })
      }
      continue
    }
    // A line kept from before, without an order behind it, stays as it is.
    const kept =
      raw.keepLineNo !== undefined
        ? previous.find((line) => line.lineNo === raw.keepLineNo && !line.deliveryRequestNo)
        : undefined
    if (
      kept &&
      kept.deliveryPointNo === raw.deliveryPointNo &&
      kept.productNo === raw.productNo &&
      kept.quantity === raw.quantity
    ) {
      resolved.push({ ...kept })
      continue
    }
    if (!planningSettings(db).intake.plannerDirectEntry) {
      throw unprocessable(CIRCUIT_MESSAGES.plannerEntryClosed)
    }
    assertActiveGoods(db, raw.deliveryPointNo, raw.productNo)
    const point = db.deliveryPoints.findOrFail(raw.deliveryPointNo)
    const ordererNo =
      raw.ordererNo || (db.customers.find(point.customerNo)?.isOrderer ? point.customerNo : '')
    if (!ordererNo || !db.customers.exists(ordererNo)) {
      throw unprocessable(CIRCUIT_MESSAGES.manualLineNeedsOrderer)
    }
    if (!(Number(raw.weightKg) > 0)) throw unprocessable(CIRCUIT_MESSAGES.requestWeightRequired)
    manual.push({ lineIndex: resolved.length, ordererNo })
    resolved.push({
      deliveryRequestNo: null,
      deliveryPointNo: raw.deliveryPointNo,
      productNo: raw.productNo,
      quantity: raw.quantity,
      weightKg: raw.weightKg,
      volumeM3: raw.volumeM3 ?? null,
      ...emptyFollowUp(),
      ...emptyQuality()
    })
  }
  return {
    lines: resolved.map((line, index) => ({ ...line, lineNo: index + 1 })),
    splits,
    warnings,
    manual
  }
}

/**
 * The lines keyed in the order become orders issued by the planner, attached at once
 * (TRS01-US06): checked as any order, for the day of the transport order.
 */
function recordManualRequests(
  db: MockDatabase,
  lines: TransportOrderLineRow[],
  manual: readonly ManualEntry[],
  day: string | null,
  request: MockRequest
): TransportOrderLineRow[] {
  const next = [...lines]
  for (const item of manual) {
    const line = next[item.lineIndex]!
    const prefs = recipientPreferences(db, line.deliveryPointNo)
    const entry = {
      kind: 'sale' as const,
      pickupPointNo: null,
      content: '',
      unitCount: null,
      requiredEquipmentTypeNo: null,
      ordererNo: item.ordererNo,
      deliveryPointNo: line.deliveryPointNo,
      desiredDate: (day ?? todayIso()).slice(0, 10),
      validUntil: null,
      externalReference: '',
      freightPayer: planningSettings(db).billing.defaultFreightPayer,
      comment: '',
      lines: [
        {
          lineNo: 1,
          productNo: line.productNo,
          quantity: line.quantity,
          weightKg: line.weightKg,
          volumeM3: line.volumeM3 ?? null
        }
      ],
      ...linesSummary([
        {
          lineNo: 1,
          productNo: line.productNo,
          quantity: line.quantity,
          weightKg: line.weightKg,
          volumeM3: line.volumeM3 ?? null
        }
      ]),
      ...prefs,
      notificationChannel: offeredChannels(planningSettings(db).channels).includes(
        prefs.notificationChannel as never
      )
        ? prefs.notificationChannel
        : ('none' as const),
      fullDeliveryRequired: false
    }
    checkDeliveryRequest(db, entry, undefined, { weightRequired: true })
    const no = nextDeliveryRequestNo(db)
    db.deliveryRequests.insert(stampCreated(newDeliveryRequest(no, entry, 'planner'), request))
    next[item.lineIndex] = { ...line, deliveryRequestNo: no, requestLineNo: 1 }
  }
  return next
}

/** Shares each order partly taken: the lines kept stay on it, the others go to a new order. */
function applySplits(db: MockDatabase, splits: readonly RequestSplit[], request: MockRequest) {
  for (const split of splits) {
    const row = db.deliveryRequests.findOrFail(split.requestNo)
    const all = requestLines(row)
    const reduced = split.reduced ?? new Map<number, number>()
    const kept = all
      .filter((line) => split.keep.includes(line.lineNo))
      .map((line) => {
        const quantity = reduced.get(line.lineNo)
        return quantity === undefined
          ? line
          : {
              ...line,
              quantity,
              weightKg: prorata(line.weightKg, quantity, line.quantity),
              volumeM3: prorata(line.volumeM3, quantity, line.quantity)
            }
      })
    // What is left behind: the lines not taken, and the rest of each reduced line.
    const left = [
      ...all.filter((line) => !split.keep.includes(line.lineNo)),
      ...all
        .filter((line) => reduced.has(line.lineNo))
        .map((line) => {
          const rest = line.quantity - reduced.get(line.lineNo)!
          return {
            ...line,
            quantity: rest,
            weightKg: prorata(line.weightKg, rest, line.quantity),
            volumeM3: prorata(line.volumeM3, rest, line.quantity)
          }
        })
    ].map((line, index) => ({ ...line, lineNo: index + 1 }))
    if (!left.length) continue
    const no = nextDeliveryRequestNo(db)
    db.deliveryRequests.insert(
      stampCreated(
        {
          ...row,
          no,
          externalReference: '',
          parentNo: row.parentNo ?? row.no,
          transportOrderNo: null,
          lines: left,
          ...linesSummary(left)
        },
        request
      )
    )
    db.deliveryRequests.update(row.no, {
      lines: kept,
      ...linesSummary(kept),
      ...stampModified(request)
    })
  }
}

function keepFollowUp(
  previous: readonly TransportOrderLineRow[],
  lines: TransportOrderLineRow[]
): TransportOrderLineRow[] {
  // A kept line keeps its number: the array order is the execution order, the number identifies it.
  let nextLineNo = previous.reduce((max, line) => Math.max(max, line.lineNo), 0)
  return lines.map((line) => {
    const kept = line.deliveryRequestNo
      ? previous.find(
          (item) =>
            item.deliveryRequestNo === line.deliveryRequestNo &&
            (item.requestLineNo ?? 1) === (line.requestLineNo ?? 1)
        )
      : undefined
    if (!kept) return { ...line, lineNo: ++nextLineNo }
    return {
      ...kept,
      deliveryPointNo: line.deliveryPointNo,
      productNo: line.productNo,
      quantity: line.quantity,
      weightKg: line.weightKg,
      volumeM3: line.volumeM3 ?? null
    }
  })
}

/**
 * A line whose order asks for no availability confirmation is confirmed as soon as the transport
 * order is planned; the others wait for their recipient. Before planning, nothing is confirmed.
 */
function autoConfirm(
  db: MockDatabase,
  order: Pick<TransportOrderRow, 'means'>,
  lines: readonly TransportOrderLineRow[]
): TransportOrderLineRow[] {
  if (!order.means) return [...lines]
  return lines.map((line) => {
    if (line.confirmedAt || confirmationRequiredOf(db, line)) return line
    return { ...line, confirmedAt: nowIsoDateTime(), confirmedBy: 'auto' }
  })
}

/** The order's own preference, else the recipient's. */
function confirmationRequiredOf(db: MockDatabase, line: TransportOrderLineRow): boolean {
  const request = line.deliveryRequestNo ? db.deliveryRequests.find(line.deliveryRequestNo) : null
  if (request) return request.confirmationRequired ?? true
  const point = db.deliveryPoints.find(line.deliveryPointNo)
  const customer = point ? db.customers.find(point.customerNo) : undefined
  return customer?.confirmationRequired ?? true
}

function issueTokens(lines: readonly TransportOrderLineRow[]): TransportOrderLineRow[] {
  return lines.map((line) =>
    line.trackingToken
      ? line
      : { ...line, trackingToken: opaqueToken(), trackingExpiresOn: trackingExpiry(todayIso()) }
  )
}

function syncRequests(
  db: MockDatabase,
  orderNo: string,
  previous: readonly string[],
  next: readonly string[],
  request: MockRequest
): void {
  const kept = new Set(next)
  for (const no of previous) {
    if (kept.has(no)) continue
    const row = db.deliveryRequests.find(no)
    if (row?.transportOrderNo === orderNo) {
      db.deliveryRequests.update(no, { transportOrderNo: null, ...stampModified(request) })
    }
  }
  for (const no of next) {
    const row = db.deliveryRequests.find(no)
    if (row && row.transportOrderNo !== orderNo) {
      db.deliveryRequests.update(no, { transportOrderNo: orderNo, ...stampModified(request) })
    }
  }
}

/** The orders the lines hold; a line replanned into another order no longer holds its order. */
function requestNos(lines: readonly TransportOrderLineRow[]): string[] {
  return lines
    .filter((line) => !line.replannedToOrderNo)
    .map((line) => line.deliveryRequestNo)
    .filter((no): no is string => !!no)
}

function eventOf(
  request: MockRequest,
  kind: TransportOrderEventKind,
  detail = ''
): TransportOrderEventRow {
  return { at: nowIsoDateTime(), by: sessionUser(request).code, kind, detail }
}

function litersOf(vehicle: { compartments: { volumeL: number }[] }): number {
  return vehicle.compartments.reduce((total, item) => total + item.volumeL, 0)
}

function combinationHasPump(
  db: MockDatabase,
  vehicleNo: string,
  trailerNo: string | null
): boolean {
  const nos = new Set([vehicleNo, trailerNo].filter((no): no is string => !!no))
  return equipmentApi(db).some(
    (item) => item.state === 'operational' && item.capability === 'pump' && nos.has(item.vehicleNo)
  )
}

export function serving(
  db: MockDatabase,
  vehicleNo: string,
  trailerNo: string | null
): { typeNo: string; capacity: LoadCapacity | null; hasPump: boolean } {
  const vehicle = db.vehicles.findOrFail(vehicleNo)
  const vehicleType = db.vehicleTypes.findOrFail(vehicle.vehicleTypeNo)
  const trailer = trailerNo ? db.vehicles.findOrFail(trailerNo) : null
  const trailerType = trailer ? db.vehicleTypes.findOrFail(trailer.vehicleTypeNo) : null
  return {
    typeNo: trailer?.vehicleTypeNo ?? vehicle.vehicleTypeNo,
    capacity: combinationCapacity(
      {
        carriesGoods: vehicleType.carriesGoods,
        maxLoadKg: vehicle.maxLoadKg,
        maxVolumeM3: vehicle.maxVolumeM3,
        totalCapacityL: litersOf(vehicle)
      },
      trailer && trailerType
        ? {
            carriesGoods: trailerType.carriesGoods,
            maxLoadKg: trailer.maxLoadKg,
            maxVolumeM3: trailer.maxVolumeM3,
            totalCapacityL: litersOf(trailer)
          }
        : null
    ),
    hasPump: combinationHasPump(db, vehicleNo, trailerNo)
  }
}

function asLoad(db: MockDatabase, lines: readonly TransportOrderLineRow[]): LoadLine[] {
  return lines.map((line) => ({
    weightKg: line.weightKg,
    quantity: line.quantity,
    fuel: db.products.find(line.productNo)?.isFuel ?? false,
    volumeM3: line.volumeM3 ?? null
  }))
}

function refuseLoad(issue: LoadIssue): never {
  switch (issue.code) {
    case 'nothingToCarry':
      throw unprocessable(PLANNING_MESSAGES.orderNothingToCarry)
    case 'payloadUnknown':
      throw unprocessable(PLANNING_MESSAGES.orderPayloadUnknown)
    case 'overWeight':
    case 'overVolume':
    case 'overFuel':
      // Strict capacity: refused while the excess remains, with the way out (TRS01-US08).
      throw unprocessable({ fr: loadWarning('fr', issue)!, en: loadWarning('en', issue)! })
  }
}

/**
 * An excess of weight or volume, read out with how to remedy it (TRS01-US08): a warning unless
 * the capacity check is strict.
 */
export function loadWarning(language: MockLanguage, issue: LoadIssue): string | null {
  const remedy = localize(language, CIRCUIT_MESSAGES.overloadRemedy)
  if (issue.code === 'overWeight') {
    return `${localize(language, PLANNING_MESSAGES.orderOverWeight, {
      weightKg: shown(issue.weightKg),
      maxLoadKg: shown(issue.maxLoadKg)
    })} ${remedy}`
  }
  if (issue.code === 'overVolume') {
    return `${localize(language, CIRCUIT_MESSAGES.overVolume, {
      volume: shown(issue.volumeM3),
      max: shown(issue.maxVolumeM3)
    })} ${remedy}`
  }
  if (issue.code === 'overFuel') {
    return `${localize(language, PLANNING_MESSAGES.orderOverFuel, {
      liters: shown(issue.liters),
      capacityL: shown(issue.capacityL)
    })} ${remedy}`
  }
  return null
}

/**
 * The planner decides on a warning (excess of capacity, overlap in the calendar): the first call
 * returns the warnings, the call that confirms them sends force.
 */
function confirmWarnings(warnings: readonly string[], body: Record<string, unknown>): void {
  if (!warnings.length || body.force === true) return
  throw conflict(
    PLANNING_MESSAGES.planningWarnings,
    { details: warnings.join(' ') },
    { errorCode: 'PLANNING_WARNINGS' }
  )
}

function refusePoint(issue: PointIssue): never {
  const text =
    issue.code === 'pumpRequired'
      ? PLANNING_MESSAGES.orderPumpRequired
      : PLANNING_MESSAGES.orderVehicleTypeRefused
  throw unprocessable(text, { point: issue.point })
}

function assertCompatible(db: MockDatabase, lines: readonly TransportOrderLineRow[]): void {
  const [rule] = forbiddenTogether(
    db.productCompatibilities.all(),
    lines.map((line) => line.productNo)
  )
  if (!rule) return
  const name = (no: string) => db.products.find(no)?.name ?? no
  throw unprocessable(PLANNING_MESSAGES.orderProductsIncompatible, {
    productA: name(rule.productANo),
    productB: name(rule.productBNo)
  })
}

/**
 * Compatibility and the delivery points always hold. An excess of capacity is refused only when
 * the capacity check is strict; otherwise it comes back as a warning.
 */
function servedWarnings(
  db: MockDatabase,
  lines: readonly TransportOrderLineRow[],
  vehicleNo: string,
  trailerNo: string | null,
  language: MockLanguage
): string[] {
  const served = serving(db, vehicleNo, trailerNo)
  assertCompatible(db, lines)
  const points = lines.map((line) => {
    const point = db.deliveryPoints.findOrFail(line.deliveryPointNo)
    return {
      name: point.name,
      pumpRequired: point.pumpRequired,
      acceptedVehicleTypeNos: point.acceptedVehicleTypeNos
    }
  })
  const place = pointIssue(points, served.typeNo, served.hasPump)
  if (place) refusePoint(place)
  assertEquipment(db, lines, vehicleNo, trailerNo)
  assertFamilies(db, lines, vehicleNo, trailerNo)
  // A compartment rule (here, a compartment to fill completely) is never broken (TRS07-US04);
  // what finds no room is a matter of capacity, warned unless the capacity check is strict.
  const issues = compartmentIssues(db, lines, vehicleNo, trailerNo)
  const broken = issues.filter((issue) => issue.code === 'notFull')
  if (broken.length) {
    const text = broken.map((issue) => compartmentText('fr', issue)).join(' ')
    const textEn = broken.map((issue) => compartmentText('en', issue)).join(' ')
    throw unprocessable({ fr: text, en: textEn })
  }
  const compartmentWarnings = issues.map((issue) => compartmentText(language, issue))
  if (compartmentWarnings.length && planningSettings(db).controls.strictCapacity) {
    throw unprocessable({ fr: compartmentWarnings.join(' '), en: compartmentWarnings.join(' ') })
  }
  const load = loadIssue(asLoad(db, lines), served.capacity)
  if (!load) return compartmentWarnings
  const warning = loadWarning(language, load)
  if (!warning || planningSettings(db).controls.strictCapacity) refuseLoad(load)
  return [warning, ...compartmentWarnings]
}

/** An order may require a vehicle fitted with some equipment, a pump for instance (TRS01-US02). */
export function missingEquipment(
  db: MockDatabase,
  lines: readonly { deliveryRequestNo: string | null }[],
  vehicleNo: string,
  trailerNo: string | null
): { requestNo: string; equipment: string } | null {
  const nos = new Set([vehicleNo, trailerNo].filter((no): no is string => !!no))
  const fitted = equipmentApi(db).filter(
    (item) => item.state === 'operational' && nos.has(item.vehicleNo)
  )
  for (const line of lines) {
    const request = line.deliveryRequestNo ? db.deliveryRequests.find(line.deliveryRequestNo) : null
    const wanted = request?.requiredEquipmentTypeNo
    if (!wanted || fitted.some((item) => item.equipmentTypeNo === wanted)) continue
    return {
      requestNo: request!.no,
      equipment: db.equipmentTypes.find(wanted)?.name ?? wanted
    }
  }
  return null
}

function assertEquipment(
  db: MockDatabase,
  lines: readonly TransportOrderLineRow[],
  vehicleNo: string,
  trailerNo: string | null
): void {
  const missing = missingEquipment(db, lines, vehicleNo, trailerNo)
  if (missing) {
    throw unprocessable(CIRCUIT_MESSAGES.equipmentRequired, {
      no: missing.requestNo,
      equipment: missing.equipment
    })
  }
}

/** The vehicles of the combination that carry the goods: the trailer, else the vehicle itself. */
export function goodsCarriers(db: MockDatabase, vehicleNo: string, trailerNo: string | null) {
  return [vehicleNo, trailerNo]
    .filter((no): no is string => !!no)
    .map((no) => db.vehicles.findOrFail(no))
    .filter((vehicle) => db.vehicleTypes.find(vehicle.vehicleTypeNo)?.carriesGoods)
}

/** A vehicle kept for some product categories refuses the others; that is never a warning. */
function assertFamilies(
  db: MockDatabase,
  lines: readonly TransportOrderLineRow[],
  vehicleNo: string,
  trailerNo: string | null
): void {
  for (const vehicle of goodsCarriers(db, vehicleNo, trailerNo)) {
    for (const line of lines) {
      const product = db.products.find(line.productNo)
      if (!product || familyAllowed(vehicle.productFamilies ?? [], product.family)) continue
      throw unprocessable(PLANNING_MESSAGES.orderFamilyRefused, {
        plate: vehicle.plate,
        family: product.family,
        product: product.name
      })
    }
  }
}

/** Litres of a line, when its product is counted in litres; otherwise unknown. */
function litresOfLine(db: MockDatabase, line: TransportOrderLineRow): number | null {
  const unit = (db.products.find(line.productNo)?.unit ?? '').toLowerCase()
  return unit === 'litre' || unit === 'l' ? line.quantity : null
}

/** The lines placed in the compartments of the combination; nothing for a vehicle without any. */
export function compartmentPlan(
  db: MockDatabase,
  lines: readonly TransportOrderLineRow[],
  vehicleNo: string,
  trailerNo: string | null
) {
  const compartments = compartmentsOf(
    goodsCarriers(db, vehicleNo, trailerNo).flatMap((vehicle) => vehicle.compartments),
    null
  )
  if (!compartments.length) return null
  const plan = allocate(
    compartments,
    lines.map((line) => {
      const product = db.products.find(line.productNo)
      return {
        lineNo: line.lineNo,
        productNo: line.productNo,
        productName: product?.name ?? line.productNo,
        family: product?.family ?? '',
        volumeL: litresOfLine(db, line)
      }
    })
  )
  return { compartments, ...plan }
}

function compartmentIssues(
  db: MockDatabase,
  lines: readonly TransportOrderLineRow[],
  vehicleNo: string,
  trailerNo: string | null
): CompartmentIssue[] {
  return compartmentPlan(db, lines, vehicleNo, trailerNo)?.issues ?? []
}

function compartmentText(language: MockLanguage, issue: CompartmentIssue): string {
  return issue.code === 'noRoom'
    ? localize(language, PLANNING_MESSAGES.compartmentNoRoom, { product: issue.productName })
    : localize(language, PLANNING_MESSAGES.compartmentNotFull, {
        no: issue.no,
        used: shown(issue.usedL),
        volume: shown(issue.volumeL)
      })
}

/** Every line of the non-cancelled orders already on the trip, plus the lines being checked. */
function tripLines(
  db: MockDatabase,
  tripNo: string,
  orderNo: string,
  lines: readonly TransportOrderLineRow[]
): TransportOrderLineRow[] {
  const others = db.transportOrders
    .all()
    .filter((order) => order.tripNo === tripNo && order.no !== orderNo && !order.cancelledAt)
    .flatMap((order) => order.lines)
  return [...others, ...lines]
}

function assertSchedule(order: TransportOrderRow): void {
  if (!order.routeTemplateNo || !order.plannedDeparture) {
    throw unprocessable(PLANNING_MESSAGES.orderScheduleMissing)
  }
}

function blankCarrier(): Pick<
  TransportOrderRow,
  | 'carrierNo'
  | 'carrierVehiclePlate'
  | 'carrierDriverName'
  | 'carrierDepartedAt'
  | 'carrierArrivedAt'
> {
  return {
    carrierNo: null,
    carrierVehiclePlate: '',
    carrierDriverName: '',
    carrierDepartedAt: null,
    carrierArrivedAt: null
  }
}

export function registerTransportOrdersHandlers(router: MockRouter, db: MockDatabase): void {
  registerCrudResource(router, {
    basePath: BASE_PATH,
    feature: 'TRANSPORTORDER',
    collection: db.transportOrders,
    list: (request) => transportOrdersApi(db, sessionUser(request).code),
    searchColumns: ['no', 'routeName', 'recipientSummary', 'carrierName', 'tripNo'],
    optionFields: { status: 'transportOrderStatus', means: 'transportMeans' },
    create: (input, request) => {
      const routeTemplateNo = 'routeTemplateNo' in input ? readRoute(db, input) : null
      const plannedDeparture = 'plannedDeparture' in input ? readDeparture(input) : null
      const comment = readLimited(input, 'comment', 500)
      // Whole orders by their numbers, or lines that may take only part of an order.
      const raw = Array.isArray(input.lines)
        ? readLines(input)
        : readStringList(input, 'deliveryRequestNos').map((deliveryRequestNo) => ({
            deliveryRequestNo,
            deliveryPointNo: '',
            productNo: '',
            quantity: 0,
            weightKg: null
          }))
      const transportMode = readEnum(input, 'transportMode', TRANSPORT_MODES) ?? 'road'
      const resolved = resolveLines(db, null, raw, toMockLanguage(request.language))
      confirmWarnings(resolved.warnings, input)
      applySplits(db, resolved.splits, request)
      const lines = recordManualRequests(
        db,
        resolved.lines,
        resolved.manual,
        plannedDeparture,
        request
      )
      const no = nextTransportOrderNo(db)
      syncRequests(db, no, [], requestNos(lines), request)
      return {
        no,
        routeTemplateNo,
        plannedDeparture,
        comment,
        lines,
        transportMode,
        means: null,
        tripNo: null,
        ...blankCarrier(),
        ...emptyDossier(),
        cancellationReasonNo: null,
        cancellationComment: '',
        cancelledAt: null,
        cancelledBy: null,
        events: [eventOf(request, 'created')]
      }
    },
    update: (existing, input) => {
      if (!canEditLines(statusOf(db, existing))) {
        throw conflict(PLANNING_MESSAGES.orderNotEditable)
      }
      const patch: Partial<TransportOrderRow> = {}
      if ('comment' in input) patch.comment = readLimited(input, 'comment', 500)
      if ('transportMode' in input) {
        const mode = readEnum(input, 'transportMode', TRANSPORT_MODES) ?? 'road'
        // The mode is chosen before planning; once planned it follows the means.
        if (mode !== (existing.transportMode ?? 'road') && !canPlan(statusOf(db, existing))) {
          throw conflict(PLANNING_MESSAGES.orderScheduleLocked)
        }
        patch.transportMode = mode
      }
      if ('routeTemplateNo' in input || 'plannedDeparture' in input) {
        if (!canEditSchedule(statusOf(db, existing))) {
          throw conflict(PLANNING_MESSAGES.orderScheduleLocked)
        }
        if ('routeTemplateNo' in input) patch.routeTemplateNo = readRoute(db, input)
        if ('plannedDeparture' in input) patch.plannedDeparture = readDeparture(input)
      }
      return patch
    }
  })

  const orderOf = (request: MockRequest) => db.transportOrders.findOrFail(routeParam(request, 'no'))

  router.put(
    `${BASE_PATH}/:no/lines`,
    { feature: 'TRANSPORTORDER', action: 'update' },
    (request) => {
      const order = orderOf(request)
      if (!canEditLines(statusOf(db, order))) throw conflict(PLANNING_MESSAGES.orderLinesLocked)
      const language = toMockLanguage(request.language)
      // A line replanned into another order stays here as history and is never sent again.
      const replanned = order.lines.filter((line) => line.replannedToOrderNo)
      const movedAway = new Set(
        replanned
          .map((line) => line.deliveryRequestNo)
          .filter(
            (no): no is string =>
              !!no && db.deliveryRequests.find(no)?.transportOrderNo !== order.no
          )
      )
      const sent = readLines(readBody(request)).filter(
        (raw) => !raw.deliveryRequestNo || !movedAway.has(raw.deliveryRequestNo)
      )
      const resolved = resolveLines(
        db,
        order.no,
        sent,
        language,
        order.lines.filter((line) => !line.replannedToOrderNo)
      )
      const kept = keepFollowUp(order.lines, resolved.lines)
      const lines = autoConfirm(db, order, [
        ...kept,
        ...replanned.filter((line) => !kept.some((item) => item.lineNo === line.lineNo))
      ])
      const warnings = [...resolved.warnings]
      if (order.means === 'fleet' && order.tripNo) {
        const trip = db.trips.findOrFail(order.tripNo)
        warnings.push(
          ...servedWarnings(
            db,
            tripLines(
              db,
              trip.no,
              order.no,
              lines.filter((line) => !lineOutOfTour(line))
            ),
            trip.vehicleNo,
            trip.trailerNo,
            language
          )
        )
      }
      if (order.means === 'carrier') assertCompatible(db, lines)
      confirmWarnings(warnings, readBody(request))
      applySplits(db, resolved.splits, request)
      const recorded = recordManualRequests(
        db,
        lines,
        resolved.manual,
        order.plannedDeparture,
        request
      )
      // A recipient added to a planned order gets his link and his notification (TRS01-US14).
      const before = new Set(order.lines.map((line) => line.lineNo))
      const added = recorded.filter((line) => !before.has(line.lineNo))
      const final = order.means ? issueTokens(recorded) : recorded
      syncRequests(db, order.no, requestNos(order.lines), requestNos(final), request)
      const events = [...order.events, eventOf(request, 'lines_changed', String(final.length))]
      const notified = order.means
        ? notifyRecipients(db, { ...order, lines: added }, request)
        : null
      db.transportOrders.update(order.no, {
        lines: final,
        events: notified ? [...events, notified] : events,
        ...stampModified(request)
      })
      if (order.means && added.length) {
        const addedNos = new Set(added.map((line) => line.lineNo))
        messageRecipients(db, order.no, 'planned', (line) => addedNos.has(line.lineNo))
      }
      return ok(oneOf(db, order.no))
    }
  )

  router.put(
    `${BASE_PATH}/:no/sequence`,
    { feature: 'TRANSPORTORDER', action: 'update' },
    (request) => {
      const order = orderOf(request)
      if (!canEditLines(statusOf(db, order))) throw conflict(PLANNING_MESSAGES.orderLinesLocked)
      const raw = readBody(request).lineNos
      if (!Array.isArray(raw)) throw invalidField('lineNos')
      const wanted = raw.map((value) => Number(value))
      const known = order.lines.map((line) => line.lineNo)
      if (
        wanted.length !== known.length ||
        new Set(wanted).size !== wanted.length ||
        wanted.some((lineNo) => !known.includes(lineNo))
      ) {
        throw invalidField('lineNos')
      }
      // Only the execution order changes: each line keeps its number and its follow-up.
      const lines = wanted.map((lineNo) => order.lines.find((line) => line.lineNo === lineNo)!)
      db.transportOrders.update(order.no, {
        lines,
        events: [...order.events, eventOf(request, 'lines_changed', String(lines.length))],
        ...stampModified(request)
      })
      return ok(oneOf(db, order.no))
    }
  )

  /* A delivery order proposed by geographic proximity (TRS01-US05): from the start of the route,
   * the nearest delivery point each time; the planner applies it or keeps his own. */
  router.get(
    `${BASE_PATH}/:no/proposed-sequence`,
    { feature: 'TRANSPORTORDER', action: 'read' },
    (request) => {
      const order = orderOf(request)
      const route = order.routeTemplateNo
        ? db.routeTemplates.find(order.routeTemplateNo)
        : undefined
      const startSite = route?.stops[0] ? db.sites.find(route.stops[0].siteNo) : undefined
      let here = startSite ? { latitude: startSite.latitude, longitude: startSite.longitude } : null
      const left = [...order.lines]
      const sequence: number[] = []
      while (left.length) {
        const point = (line: TransportOrderLineRow) => db.deliveryPoints.find(line.deliveryPointNo)
        let best = 0
        if (here) {
          let bestKm = Infinity
          left.forEach((line, index) => {
            const p = point(line)
            const km = p ? distanceKm(here!, p) : Infinity
            if (km < bestKm) {
              bestKm = km
              best = index
            }
          })
        }
        const [next] = left.splice(best, 1)
        // The lines of one delivery point stay together.
        const same = left.filter((line) => line.deliveryPointNo === next!.deliveryPointNo)
        sequence.push(next!.lineNo, ...same.map((line) => line.lineNo))
        for (const line of same) left.splice(left.indexOf(line), 1)
        const p = point(next!)
        if (p) here = { latitude: p.latitude, longitude: p.longitude }
      }
      return ok(sequence)
    }
  )

  router.post(
    `${BASE_PATH}/:no/plan`,
    { feature: 'TRANSPORTORDER', action: 'update' },
    (request) => {
      const order = orderOf(request)
      if (!canPlan(statusOf(db, order))) throw conflict(PLANNING_MESSAGES.orderNotPlannable)
      if (!order.lines.length) throw unprocessable(PLANNING_MESSAGES.orderNeedsLines)
      // Only the road has means in the register: the fleet and the road carriers (TRS01-US11).
      if ((order.transportMode ?? 'road') !== 'road') {
        throw unprocessable(CIRCUIT_MESSAGES.modeMeans)
      }
      const body = readBody(request)
      const means = readEnum(body, 'means', TRANSPORT_MEANS, { required: true }) as TransportMeans
      const planned = planOrder(db, order, means, body, request)
      db.transportOrders.update(order.no, { ...planned, ...stampModified(request) })
      // The recipients and the driver are told (TRS01-US12, TRS03-US08).
      announcePlanned(db, order.no, request)
      return ok(oneOf(db, order.no))
    }
  )

  router.post(
    `${BASE_PATH}/:no/cancel`,
    { feature: 'TRANSPORTORDER', action: 'execute' },
    (request) => {
      const order = orderOf(request)
      if (!canCancel(statusOf(db, order))) throw conflict(PLANNING_MESSAGES.orderNotCancellable)
      const reason = readReason(db, readBody(request), 'cancellation')
      // No line is delivered yet: every request goes back to the pool. The fleet trip stays.
      syncRequests(db, order.no, requestNos(order.lines), [], request)
      const at = nowIsoDateTime()
      db.transportOrders.update(order.no, {
        cancellationReasonNo: reason.reasonNo,
        cancellationComment: reason.comment,
        cancelledAt: at,
        cancelledBy: sessionUser(request).code,
        events: [...order.events, eventOf(request, 'cancelled', reason.reasonNo)],
        ...stampModified(request)
      })
      // The driver is told of the cancellation, with its reason (TRS01-US18).
      if (order.tripNo) {
        notifyDriver(
          db,
          db.trips.find(order.tripNo)?.driverNo,
          'order_cancelled',
          order.no,
          db.planningReasons.find(reason.reasonNo)?.name ?? ''
        )
      }
      return ok(oneOf(db, order.no))
    }
  )
}

/** The detail of the deliveries, as the driver's notification gives it (TRS01-US12). */
function deliveriesDetail(db: MockDatabase, lines: readonly TransportOrderLineRow[]): string {
  const names = lines.map((line) => db.deliveryPoints.find(line.deliveryPointNo)?.name ?? '')
  return [...new Set(names.filter(Boolean))].join(', ')
}

/**
 * Planning notifies each recipient by the channel of his order (TRS01-US12): the mock has no
 * SMS or e-mail gateway, so the sending is recorded in the history of the order.
 */
function notifyRecipients(
  db: MockDatabase,
  order: TransportOrderRow,
  request: MockRequest
): TransportOrderEventRow | null {
  const sent: string[] = []
  for (const line of order.lines) {
    const row = line.deliveryRequestNo ? db.deliveryRequests.find(line.deliveryRequestNo) : null
    const channel = row?.notificationChannel ?? 'sms'
    if (channel === 'none') continue
    const point = db.deliveryPoints.find(line.deliveryPointNo)
    const name = (point && db.customers.find(point.customerNo)?.name) || line.deliveryPointNo
    const label = `${name} (${channel})`
    if (!sent.includes(label)) sent.push(label)
  }
  return sent.length ? eventOf(request, 'recipients_notified', sent.join(', ')) : null
}

export function announcePlanned(db: MockDatabase, orderNo: string, request: MockRequest): void {
  const order = db.transportOrders.findOrFail(orderNo)
  const event = notifyRecipients(db, order, request)
  if (event) db.transportOrders.update(order.no, { events: [...order.events, event] })
  const driverNo = order.tripNo ? db.trips.find(order.tripNo)?.driverNo : null
  notifyDriver(db, driverNo, 'order_assigned', order.no, deliveriesDetail(db, order.lines))
  messageRecipients(db, order.no, 'planned')
}

/**
 * A pending transport order made from a validated loading proposal (TRS01-US10): the orders put
 * on one vehicle, the vehicle or the carrier kept as proposed for when the planner plans it.
 */
export function createProposedOrder(
  db: MockDatabase,
  request: MockRequest,
  spec: {
    requestNos: string[]
    plannedDeparture: string
    proposedVehicleNo: string | null
    proposedTrailerNo: string | null
    proposedCarrierNo: string | null
    comment: string
  }
): string {
  const { lines } = resolveLines(
    db,
    null,
    spec.requestNos.map((no) => ({
      deliveryRequestNo: no,
      deliveryPointNo: '',
      productNo: '',
      quantity: 0,
      weightKg: null
    })),
    toMockLanguage(request.language)
  )
  const no = nextTransportOrderNo(db)
  syncRequests(db, no, [], requestNos(lines), request)
  db.transportOrders.insert(
    stampCreated<TransportOrderRow>(
      {
        no,
        routeTemplateNo: null,
        plannedDeparture: spec.plannedDeparture,
        comment: spec.comment,
        lines,
        means: null,
        tripNo: null,
        ...blankCarrier(),
        ...emptyDossier(),
        cancellationReasonNo: null,
        cancellationComment: '',
        cancelledAt: null,
        cancelledBy: null,
        proposedVehicleNo: spec.proposedVehicleNo,
        proposedTrailerNo: spec.proposedTrailerNo,
        proposedCarrierNo: spec.proposedCarrierNo,
        events: [eventOf(request, 'created', spec.comment)]
      },
      request
    )
  )
  return no
}

/**
 * A transport order made from a validated loading preparation (TRS01-US23): its lines are the
 * orders placed on one vehicle, and it is planned at once on a new fleet trip with its driver.
 */
export function createPlannedOrder(
  db: MockDatabase,
  request: MockRequest,
  spec: {
    requests: { no: string; lineNos: number[] }[]
    routeTemplateNo: string
    plannedDeparture: string
    vehicleNo: string
    trailerNo: string | null
    driverNo: string
    comment: string
  }
): string {
  const { lines, splits } = resolveLines(
    db,
    null,
    spec.requests.map((item) => ({
      deliveryRequestNo: item.no,
      requestLineNos: item.lineNos,
      deliveryPointNo: '',
      productNo: '',
      quantity: 0,
      weightKg: null
    })),
    toMockLanguage(request.language)
  )
  applySplits(db, splits, request)
  const no = nextTransportOrderNo(db)
  syncRequests(db, no, [], requestNos(lines), request)
  const row = stampCreated<TransportOrderRow>(
    {
      no,
      routeTemplateNo: spec.routeTemplateNo,
      plannedDeparture: spec.plannedDeparture,
      comment: spec.comment,
      lines,
      means: null,
      tripNo: null,
      ...blankCarrier(),
      ...emptyDossier(),
      cancellationReasonNo: null,
      cancellationComment: '',
      cancelledAt: null,
      cancelledBy: null,
      events: [eventOf(request, 'created', spec.comment)]
    },
    request
  )
  db.transportOrders.insert(row)
  const planned = planNewTrip(
    db,
    row,
    { vehicleNo: spec.vehicleNo, trailerNo: spec.trailerNo, driverNo: spec.driverNo, force: true },
    request
  )
  db.transportOrders.update(no, { ...planned, ...stampModified(request) })
  announcePlanned(db, no, request)
  return no
}

function planOrder(
  db: MockDatabase,
  order: TransportOrderRow,
  means: TransportMeans,
  body: Record<string, unknown>,
  request: MockRequest
): Partial<TransportOrderRow> {
  if (means === 'carrier') return planCarrier(db, order, body, request)
  const tripNo = readString(body, 'tripNo')
  if (tripNo) return planOnTrip(db, order, tripNo, request)
  return planNewTrip(db, order, body, request)
}

function planNewTrip(
  db: MockDatabase,
  order: TransportOrderRow,
  body: Record<string, unknown>,
  request: MockRequest
): Partial<TransportOrderRow> {
  assertSchedule(order)
  const vehicleNo = requireReference(db.vehicles, body, 'vehicleNo')
  const trailerNo = optionalReference(db.vehicles, body, 'trailerNo')
  const driverNo = requireReference(db.employees, body, 'driverNo')
  const language = toMockLanguage(request.language)
  const plan = {
    routeTemplateNo: order.routeTemplateNo ?? '',
    vehicleNo,
    trailerNo,
    driverNo,
    plannedDeparture: order.plannedDeparture ?? ''
  }
  // An overlap with another trip is shown in red and left to the planner, unless the calendar is
  // strict: then the busy vehicle or driver is refused as before.
  const strictCalendar = planningSettings(db).controls.strictCalendar
  const overlaps = strictCalendar ? [] : overlapWarnings(db, plan, language)
  confirmWarnings(
    [...overlaps, ...servedWarnings(db, order.lines, vehicleNo, trailerNo, language)],
    body
  )
  const built = buildTrip(db, plan, request.language, { allowBusy: !strictCalendar })
  const trip = stampCreated<TripRow>(built, request)
  db.trips.insert(trip)
  return {
    means: 'fleet',
    tripNo: trip.no,
    ...blankCarrier(),
    lines: autoConfirm(db, { means: 'fleet' }, issueTokens(order.lines)),
    events: [...order.events, eventOf(request, 'planned', trip.no)]
  }
}

function planOnTrip(
  db: MockDatabase,
  order: TransportOrderRow,
  tripNo: string,
  request: MockRequest
): Partial<TransportOrderRow> {
  if (!db.trips.exists(tripNo)) throw unknownReference('tripNo')
  const trip = db.trips.findOrFail(tripNo)
  if (trip.status !== 'planned') throw conflict(PLANNING_MESSAGES.orderTripNotPlanned)
  confirmWarnings(
    servedWarnings(
      db,
      tripLines(db, trip.no, order.no, order.lines),
      trip.vehicleNo,
      trip.trailerNo,
      toMockLanguage(request.language)
    ),
    readBody(request)
  )
  return {
    means: 'fleet',
    tripNo: trip.no,
    routeTemplateNo: trip.routeTemplateNo,
    plannedDeparture: trip.plannedDeparture,
    ...blankCarrier(),
    lines: autoConfirm(db, { means: 'fleet' }, issueTokens(order.lines)),
    events: [...order.events, eventOf(request, 'planned', trip.no)]
  }
}

function planCarrier(
  db: MockDatabase,
  order: TransportOrderRow,
  body: Record<string, unknown>,
  request: MockRequest
): Partial<TransportOrderRow> {
  assertSchedule(order)
  const carrierNo = requireReference(db.providers, body, 'carrierNo')
  const carrier = db.providers.findOrFail(carrierNo)
  if (carrier.providerType !== 'carrier') throw unprocessable(PLANNING_MESSAGES.orderNotCarrier)
  if (!carrier.authorized) throw unprocessable(PLANNING_MESSAGES.orderCarrierNotAuthorized)
  assertCompatible(db, order.lines)
  // The carrier's means are those attached to its record: the vehicle is one of them.
  const plate = readLimited(body, 'carrierVehiclePlate', 20)
  if (!(carrier.carrierVehicles ?? []).some((vehicle) => vehicle.plate === plate)) {
    throw unprocessable(PLANNING_MESSAGES.orderCarrierVehicleUnknown)
  }
  return {
    means: 'carrier',
    tripNo: null,
    carrierNo,
    carrierVehiclePlate: plate,
    carrierDriverName: readLimited(body, 'carrierDriverName', 80),
    lines: autoConfirm(db, { means: 'fleet' }, issueTokens(order.lines)),
    events: [...order.events, eventOf(request, 'planned', carrierNo)]
  }
}
