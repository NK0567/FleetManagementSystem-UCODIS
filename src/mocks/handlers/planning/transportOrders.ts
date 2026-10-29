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
  lineOutOfTour,
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
  const plates = vehiclePlates(db)
  const names = employeeNames(db)

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
        return {
          ...line,
          deliveryPointName: point?.name ?? '',
          recipientName: customers.get(point?.customerNo ?? '') ?? '',
          productName: product?.name ?? '',
          unit: product?.unit ?? '',
          contestReasonName: reasons.get(line.contestReasonNo ?? '') ?? ''
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
  /** A part of the order's lines; empty takes them all. */
  requestLineNos?: number[]
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
      const picked = row.requestLineNos
      if (
        picked != null &&
        (!Array.isArray(picked) || picked.some((no) => !Number.isInteger(no)))
      ) {
        throw invalidField('requestLineNos')
      }
      return {
        deliveryRequestNo,
        requestLineNos: (picked as number[] | undefined) ?? [],
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

/** Part of an order (commande) taken: the lines left behind become a new order, still pending. */
interface RequestSplit {
  requestNo: string
  keep: number[]
}

/**
 * Lines as they will be stored. An order supplies its own point, products and quantities, one
 * line of the transport order per line of the order; taking only some of its lines shares it.
 */
function resolveLines(
  db: MockDatabase,
  orderNo: string | null,
  rawLines: RawLine[],
  language: MockLanguage = 'fr'
): { lines: TransportOrderLineRow[]; splits: RequestSplit[]; warnings: string[] } {
  const seen = new Set<string>()
  const splits: RequestSplit[] = []
  const warnings: string[] = []
  const lines = rawLines.flatMap((raw): Omit<TransportOrderLineRow, 'lineNo'>[] => {
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
      const all = requestLines(request)
      const wanted = raw.requestLineNos?.length
        ? all.filter((line) => raw.requestLineNos!.includes(line.lineNo))
        : all
      if (!wanted.length || wanted.length !== (raw.requestLineNos?.length || all.length)) {
        throw invalidField('requestLineNos')
      }
      if (wanted.length < all.length) {
        splits.push({ requestNo: request.no, keep: wanted.map((line) => line.lineNo) })
        if (request.fullDeliveryRequired) {
          warnings.push(
            localize(language, PLANNING_MESSAGES.fullDeliveryPartial, { no: request.no })
          )
        }
      }
      return wanted.map((line) => {
        assertActiveGoods(db, request.deliveryPointNo, line.productNo)
        return {
          deliveryRequestNo: request.no,
          requestLineNo: line.lineNo,
          deliveryPointNo: request.deliveryPointNo,
          productNo: line.productNo,
          quantity: line.quantity,
          weightKg: line.weightKg,
          ...emptyFollowUp(),
          ...emptyQuality()
        }
      })
    }
    assertActiveGoods(db, raw.deliveryPointNo, raw.productNo)
    return [
      {
        deliveryRequestNo: null,
        deliveryPointNo: raw.deliveryPointNo,
        productNo: raw.productNo,
        quantity: raw.quantity,
        weightKg: raw.weightKg,
        ...emptyFollowUp(),
        ...emptyQuality()
      }
    ]
  })
  return {
    lines: lines.map((line, index) => ({ ...line, lineNo: index + 1 })),
    splits,
    warnings
  }
}

/** Shares each order partly taken: the lines kept stay on it, the others go to a new order. */
function applySplits(db: MockDatabase, splits: readonly RequestSplit[], request: MockRequest) {
  for (const split of splits) {
    const row = db.deliveryRequests.findOrFail(split.requestNo)
    const all = requestLines(row)
    const kept = all.filter((line) => split.keep.includes(line.lineNo))
    const left = all
      .filter((line) => !split.keep.includes(line.lineNo))
      .map((line, index) => ({ ...line, lineNo: index + 1 }))
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
      weightKg: line.weightKg
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

/** An excess of weight or volume, read out: a warning unless the capacity check is strict. */
function loadWarning(language: MockLanguage, issue: LoadIssue): string | null {
  if (issue.code === 'overWeight') {
    return localize(language, PLANNING_MESSAGES.orderOverWeight, {
      weightKg: shown(issue.weightKg),
      maxLoadKg: shown(issue.maxLoadKg)
    })
  }
  if (issue.code === 'overFuel') {
    return localize(language, PLANNING_MESSAGES.orderOverFuel, {
      liters: shown(issue.liters),
      capacityL: shown(issue.capacityL)
    })
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
      const { lines, splits, warnings } = resolveLines(
        db,
        null,
        raw,
        toMockLanguage(request.language)
      )
      confirmWarnings(warnings, input)
      applySplits(db, splits, request)
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
      const language = toMockLanguage(request.language)
      const resolved = resolveLines(db, order.no, readLines(readBody(request)), language)
      const lines = autoConfirm(db, order, keepFollowUp(order.lines, resolved.lines))
      const warnings = [...resolved.warnings]
      if (order.means === 'fleet' && order.tripNo) {
        const trip = db.trips.findOrFail(order.tripNo)
        warnings.push(
          ...servedWarnings(
            db,
            tripLines(db, trip.no, order.no, lines),
            trip.vehicleNo,
            trip.trailerNo,
            language
          )
        )
      }
      if (order.means === 'carrier') assertCompatible(db, lines)
      confirmWarnings(warnings, readBody(request))
      applySplits(db, resolved.splits, request)
      syncRequests(db, order.no, requestNos(order.lines), requestNos(lines), request)
      db.transportOrders.update(order.no, {
        lines,
        events: [...order.events, eventOf(request, 'lines_changed', String(lines.length))],
        ...stampModified(request)
      })
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
