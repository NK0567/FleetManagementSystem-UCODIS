import {
  plannedSchedule,
  type RouteStop
} from '@/modules/fleet/route-templates/domain/routeTemplate'
import { forbiddenTogether } from '@/modules/planning/product-compatibilities/domain/productCompatibility'
import {
  canCancel,
  canEditLines,
  canEditSchedule,
  canPlan,
  loadIssue,
  pointIssue,
  transportOrderStatus,
  TRANSPORT_MEANS,
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
import { buildTrip } from '../fleet/trips'
import { equipmentApi } from '../fleet/vehicles'
import { employeeNames, vehiclePlates } from '../fleet/links'
import { plannedArrival } from '../fleet/tripIndex'
import { deliveryRequestStatus } from '@/modules/planning/delivery-requests/domain/deliveryRequest'
import type { DeliveryRequestRow } from '../../fixtures/planning/deliveryRequests'
import { PLANNING_MESSAGES } from './messages'
import { readReason } from './planningReasons'
import { planningSettings } from './settings'

const BASE_PATH = '/planning/transport-orders'

const shown = (value: number) => Math.round(value * 10) / 10

export function nextTransportOrderNo(db: MockDatabase): string {
  return nextNo(
    db.transportOrders.all().map((row) => row.no),
    `TR-${todayIso().slice(0, 4)}-`,
    4
  )
}

export function transportOrdersApi(db: MockDatabase): TransportOrderApi[] {
  const routes = new Map(db.routeTemplates.all().map((route) => [route.no, route]))
  const trips = new Map(db.trips.all().map((trip) => [trip.no, trip]))
  const points = new Map(db.deliveryPoints.all().map((point) => [point.no, point]))
  const products = new Map(db.products.all().map((product) => [product.no, product]))
  const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
  const carriers = new Map(db.providers.all().map((provider) => [provider.no, provider.name]))
  const reasons = new Map(db.planningReasons.all().map((reason) => [reason.no, reason.name]))
  const plates = vehiclePlates(db)
  const names = employeeNames(db)

  return db.transportOrders.all().map((row) => {
    const trip = row.tripNo ? trips.get(row.tripNo) : undefined
    const routeNo = trip?.routeTemplateNo ?? row.routeTemplateNo
    const route = routeNo ? routes.get(routeNo) : undefined
    const departure = trip?.plannedDeparture ?? row.plannedDeparture
    const lines = row.lines.map((line): TransportOrderLineApi => {
      const point = points.get(line.deliveryPointNo)
      const product = products.get(line.productNo)
      return {
        ...line,
        deliveryPointName: point?.name ?? '',
        recipientName: customers.get(point?.customerNo ?? '') ?? '',
        productName: product?.name ?? '',
        unit: product?.unit ?? ''
      }
    })
    const recipients: string[] = []
    for (const line of lines) {
      if (line.recipientName && !recipients.includes(line.recipientName)) {
        recipients.push(line.recipientName)
      }
    }
    const weights = lines
      .map((line) => line.weightKg)
      .filter((weight): weight is number => weight !== null)
    const fuelLiters = row.lines.reduce((total, line) => {
      const product = products.get(line.productNo)
      return total + (product?.isFuel ? line.quantity : 0)
    }, 0)
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
      totalFuelL: fuelLiters > 0 ? fuelLiters : null,
      means: row.means,
      tripNo: row.tripNo,
      tripStatus: trip?.status ?? null,
      vehicleNo: trip?.vehicleNo ?? null,
      vehiclePlate: trip ? (plates.get(trip.vehicleNo) ?? '') : '',
      trailerNo: trip?.trailerNo ?? null,
      trailerPlate: trip?.trailerNo ? (plates.get(trip.trailerNo) ?? '') : '',
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
      status: transportOrderStatus({
        cancelledAt: row.cancelledAt,
        means: row.means,
        tripStatus: trip?.status ?? null,
        linesConfirmed: linesConfirmed(row.lines),
        loadingReady: loadingReady(row.lines),
        carrierDeparted: row.carrierDepartedAt !== null,
        linesDelivered: linesDelivered(row.lines),
        closedAt: row.closedAt
      }),
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

function statusOf(db: MockDatabase, row: TransportOrderRow) {
  const trip = row.tripNo ? db.trips.find(row.tripNo) : undefined
  return transportOrderStatus({
    cancelledAt: row.cancelledAt,
    means: row.means,
    tripStatus: trip?.status ?? null,
    linesConfirmed: linesConfirmed(row.lines),
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
  deliveryPointNo: string
  productNo: string
  quantity: number
  weightKg: number | null
}

function readLines(input: Record<string, unknown>): RawLine[] {
  const raw = input.lines
  if (!Array.isArray(raw)) throw invalidField('lines')
  return raw.map((item) => {
    if (!item || typeof item !== 'object') throw invalidField('lines')
    const row = item as Record<string, unknown>
    const deliveryRequestNo = readString(row, 'deliveryRequestNo') || null
    if (deliveryRequestNo) {
      return {
        deliveryRequestNo,
        deliveryPointNo: '',
        productNo: '',
        quantity: 0,
        weightKg: null
      }
    }
    return {
      deliveryRequestNo: null,
      deliveryPointNo: readString(row, 'deliveryPointNo', { required: true }),
      productNo: readString(row, 'productNo', { required: true }),
      quantity:
        readNumber(row, 'quantity', { required: true, min: 0.001, max: 1_000_000_000 }) ?? 0,
      weightKg: readNumber(row, 'weightKg', { min: 0, max: 1_000_000 })
    }
  })
}

function assertRequestTakeable(
  db: MockDatabase,
  request: DeliveryRequestRow,
  orderNo: string | null
): void {
  if (request.transportOrderNo && request.transportOrderNo !== orderNo) {
    throw conflict(PLANNING_MESSAGES.orderRequestTaken, { no: request.no })
  }
  if (request.cancelledAt || request.rejectedAt) {
    throw unprocessable(PLANNING_MESSAGES.orderRequestUnavailable, { no: request.no })
  }
  const status = deliveryRequestStatus(request, todayIso())
  if (status === 'planned' && request.transportOrderNo === orderNo) return
  if (status === 'expired' && planningSettings(db).requests.expiredDateMode === 'block') {
    throw unprocessable(PLANNING_MESSAGES.orderRequestExpired, { no: request.no })
  }
  if (status !== 'pending' && status !== 'expired') {
    throw unprocessable(PLANNING_MESSAGES.orderRequestUnavailable, { no: request.no })
  }
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

/** Lines as they will be stored. A request supplies its own point, product and quantity. */
function resolveLines(
  db: MockDatabase,
  orderNo: string | null,
  rawLines: RawLine[]
): TransportOrderLineRow[] {
  const seen = new Set<string>()
  return rawLines.map((raw, index) => {
    if (raw.deliveryRequestNo) {
      if (seen.has(raw.deliveryRequestNo)) {
        throw unprocessable(PLANNING_MESSAGES.orderRequestRepeated, { no: raw.deliveryRequestNo })
      }
      seen.add(raw.deliveryRequestNo)
      if (!db.deliveryRequests.exists(raw.deliveryRequestNo)) {
        throw unknownReference('deliveryRequestNo')
      }
      const request = db.deliveryRequests.findOrFail(raw.deliveryRequestNo)
      assertRequestTakeable(db, request, orderNo)
      assertActiveGoods(db, request.deliveryPointNo, request.productNo)
      return {
        lineNo: index + 1,
        deliveryRequestNo: request.no,
        deliveryPointNo: request.deliveryPointNo,
        productNo: request.productNo,
        quantity: request.quantity,
        weightKg: request.weightKg,
        ...emptyFollowUp(),
        ...emptyQuality()
      }
    }
    assertActiveGoods(db, raw.deliveryPointNo, raw.productNo)
    return {
      lineNo: index + 1,
      deliveryRequestNo: null,
      deliveryPointNo: raw.deliveryPointNo,
      productNo: raw.productNo,
      quantity: raw.quantity,
      weightKg: raw.weightKg,
      ...emptyFollowUp(),
      ...emptyQuality()
    }
  })
}

function keepFollowUp(
  previous: readonly TransportOrderLineRow[],
  lines: TransportOrderLineRow[]
): TransportOrderLineRow[] {
  return lines.map((line) => {
    const kept = line.deliveryRequestNo
      ? previous.find((item) => item.deliveryRequestNo === line.deliveryRequestNo)
      : undefined
    if (!kept) return line
    return {
      ...kept,
      lineNo: line.lineNo,
      deliveryPointNo: line.deliveryPointNo,
      productNo: line.productNo,
      quantity: line.quantity,
      weightKg: line.weightKg
    }
  })
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

function requestNos(lines: readonly TransportOrderLineRow[]): string[] {
  return lines.map((line) => line.deliveryRequestNo).filter((no): no is string => !!no)
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

function serving(
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
    fuel: db.products.find(line.productNo)?.isFuel ?? false
  }))
}

function refuseLoad(issue: LoadIssue): never {
  switch (issue.code) {
    case 'nothingToCarry':
      throw unprocessable(PLANNING_MESSAGES.orderNothingToCarry)
    case 'payloadUnknown':
      throw unprocessable(PLANNING_MESSAGES.orderPayloadUnknown)
    case 'overWeight':
      throw unprocessable(PLANNING_MESSAGES.orderOverWeight, {
        weightKg: shown(issue.weightKg),
        maxLoadKg: shown(issue.maxLoadKg)
      })
    case 'overFuel':
      throw unprocessable(PLANNING_MESSAGES.orderOverFuel, {
        liters: shown(issue.liters),
        capacityL: shown(issue.capacityL)
      })
  }
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

function assertServed(
  db: MockDatabase,
  lines: readonly TransportOrderLineRow[],
  vehicleNo: string,
  trailerNo: string | null
): void {
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
  const load = loadIssue(asLoad(db, lines), served.capacity)
  if (load) refuseLoad(load)
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
  'carrierNo' | 'carrierVehiclePlate' | 'carrierDriverName' | 'carrierDepartedAt' | 'carrierArrivedAt'
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
    list: () => transportOrdersApi(db),
    searchColumns: ['no', 'routeName', 'recipientSummary', 'carrierName', 'tripNo'],
    optionFields: { status: 'transportOrderStatus', means: 'transportMeans' },
    create: (input, request) => {
      const routeTemplateNo = 'routeTemplateNo' in input ? readRoute(db, input) : null
      const plannedDeparture = 'plannedDeparture' in input ? readDeparture(input) : null
      const comment = readLimited(input, 'comment', 500)
      const lines = resolveLines(
        db,
        null,
        readStringList(input, 'deliveryRequestNos').map((deliveryRequestNo) => ({
          deliveryRequestNo,
          deliveryPointNo: '',
          productNo: '',
          quantity: 0,
          weightKg: null
        }))
      )
      const no = nextTransportOrderNo(db)
      syncRequests(db, no, [], requestNos(lines), request)
      return {
        no,
        routeTemplateNo,
        plannedDeparture,
        comment,
        lines,
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
      const lines = keepFollowUp(order.lines, resolveLines(db, order.no, readLines(readBody(request))))
      if (order.means === 'fleet' && order.tripNo) {
        const trip = db.trips.findOrFail(order.tripNo)
        assertServed(db, tripLines(db, trip.no, order.no, lines), trip.vehicleNo, trip.trailerNo)
      }
      if (order.means === 'carrier') assertCompatible(db, lines)
      syncRequests(db, order.no, requestNos(order.lines), requestNos(lines), request)
      db.transportOrders.update(order.no, {
        lines,
        events: [...order.events, eventOf(request, 'lines_changed', String(lines.length))],
        ...stampModified(request)
      })
      return ok(oneOf(db, order.no))
    }
  )

  router.post(
    `${BASE_PATH}/:no/plan`,
    { feature: 'TRANSPORTORDER', action: 'execute' },
    (request) => {
      const order = orderOf(request)
      if (!canPlan(statusOf(db, order))) throw conflict(PLANNING_MESSAGES.orderNotPlannable)
      if (!order.lines.length) throw unprocessable(PLANNING_MESSAGES.orderNeedsLines)
      const body = readBody(request)
      const means = readEnum(body, 'means', TRANSPORT_MEANS, { required: true }) as TransportMeans
      const planned = planOrder(db, order, means, body, request)
      db.transportOrders.update(order.no, { ...planned, ...stampModified(request) })
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
      return ok(oneOf(db, order.no))
    }
  )
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
  // Availability first: a taken vehicle is a conflict, before the load is judged.
  const built = buildTrip(
    db,
    {
      routeTemplateNo: order.routeTemplateNo ?? '',
      vehicleNo,
      trailerNo,
      driverNo,
      plannedDeparture: order.plannedDeparture ?? ''
    },
    request.language
  )
  assertServed(db, order.lines, vehicleNo, trailerNo)
  const trip = stampCreated(built, request)
  db.trips.insert(trip)
  return {
    means: 'fleet',
    tripNo: trip.no,
    ...blankCarrier(),
    lines: issueTokens(order.lines),
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
  assertServed(db, tripLines(db, trip.no, order.no, order.lines), trip.vehicleNo, trip.trailerNo)
  return {
    means: 'fleet',
    tripNo: trip.no,
    routeTemplateNo: trip.routeTemplateNo,
    plannedDeparture: trip.plannedDeparture,
    ...blankCarrier(),
    lines: issueTokens(order.lines),
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
  return {
    means: 'carrier',
    tripNo: null,
    carrierNo,
    carrierVehiclePlate: readLimited(body, 'carrierVehiclePlate', 20),
    carrierDriverName: readLimited(body, 'carrierDriverName', 80),
    lines: issueTokens(order.lines),
    events: [...order.events, eventOf(request, 'planned', carrierNo)]
  }
}
