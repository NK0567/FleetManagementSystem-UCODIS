import { plannedSchedule } from '@/modules/fleet/route-templates/domain/routeTemplate'
import { protestStatus } from '@/modules/planning/delivery-quality/domain/quality'
import { receptionAttested } from '@/modules/planning/reception/domain/reception'
import {
  arrivedOnTime,
  averageScore,
  carrierIndicators,
  confirmationRate,
  contestationRate,
  delayMinutes,
  deliveryOutcomes,
  fillRate,
  fuelGapSummary,
  groupRates,
  invoiceGap,
  lateKind,
  orderCost,
  punctualityRate,
  rate,
  type CarrierFigures
} from '@/modules/planning/reports/domain/indicators'
import type { TransportOrderApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import { addDays, nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type {
  TransportOrderLineRow,
  TransportOrderRow
} from '../../fixtures/planning/transportOrders'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { vehicleCostApi } from '../maintenance/reliability'
import { view as carrierInvoiceView } from './carrierInvoices'
import { customerBillingApi } from './customerBilling'
import { deliveryRequestsApi } from './deliveryRequests'
import { orderPlace, requestPlace, visibleTo } from './perimeter'
import { planningSettings } from './settings'
import { goodsCarriers, transportOrdersApi } from './transportOrders'

/** Planned departure bounds, depot, region and orderer; an empty value does not filter. */
export interface ReportFilters {
  from: string
  to: string
  depotNo: string
  region: string
  ordererNo: string
}

const DASHBOARD_CARRIERS = 5
const NO_FILTER: ReportFilters = { from: '', to: '', depotNo: '', region: '', ordererNo: '' }
const ON_ROAD = ['in_progress', 'completed']

function filtersOf(request: MockRequest): ReportFilters {
  const read = (key: string) =>
    typeof request.query[key] === 'string' ? String(request.query[key]).trim() : ''
  return {
    from: read('from'),
    to: read('to'),
    depotNo: read('depotNo'),
    region: read('region'),
    ordererNo: read('ordererNo')
  }
}

function inPeriod(value: string | null | undefined, filters: Pick<ReportFilters, 'from' | 'to'>) {
  if (!filters.from && !filters.to) return true
  const day = (value ?? '').slice(0, 10)
  if (!day) return false
  return (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to)
}

interface ScopedOrder {
  row: TransportOrderRow
  api: TransportOrderApi
}

function ordererNosOf(db: MockDatabase, row: TransportOrderRow): string[] {
  return row.lines
    .map((line) =>
      line.deliveryRequestNo ? db.deliveryRequests.find(line.deliveryRequestNo)?.ordererNo : ''
    )
    .filter((no): no is string => !!no)
}

/** The orders of the user perimeter that meet the filters, with their screen view. */
function scopedOrders(
  db: MockDatabase,
  userCode: string,
  filters: Partial<ReportFilters> = {}
): ScopedOrder[] {
  const chosen = { ...NO_FILTER, ...filters }
  const views = new Map(transportOrdersApi(db).map((order) => [order.no, order]))
  return db.transportOrders
    .all()
    .filter((row) => {
      const place = orderPlace(db, row)
      if (!visibleTo(db, userCode, place)) return false
      if (!inPeriod(views.get(row.no)?.plannedDeparture ?? row.plannedDeparture, chosen))
        return false
      if (chosen.depotNo && !place.siteNos.includes(chosen.depotNo)) return false
      if (chosen.region && !place.regions.includes(chosen.region)) return false
      if (chosen.ordererNo && !ordererNosOf(db, row).includes(chosen.ordererNo)) return false
      return true
    })
    .map((row) => ({ row, api: views.get(row.no)! }))
}

function filterChoices(db: MockDatabase) {
  const sites = db.sites.all()
  return {
    depots: sites
      .filter((site) => site.siteTypeNo === 'DEPOT')
      .map((site) => ({ no: site.no, name: site.name })),
    regions: [...new Set(sites.map((site) => site.region).filter(Boolean))].sort(),
    orderers: db.customers
      .all()
      .filter((customer) => customer.isOrderer)
      .map((customer) => ({ no: customer.no, name: customer.name }))
  }
}

/**
 * The commandes still waiting for a transport order, in the same perimeter and filters. A
 * commande has no depot until it is planned: the depot filter leaves them all.
 */
function pendingRequests(db: MockDatabase, userCode: string, filters: ReportFilters) {
  const today = todayIso()
  return deliveryRequestsApi(db, userCode)
    .filter((request) => request.status === 'pending')
    .filter((request) => inPeriod(request.desiredDate, filters))
    .filter((request) => !filters.ordererNo || request.ordererNo === filters.ordererNo)
    .filter(
      (request) =>
        !filters.region ||
        requestPlace(db, request.deliveryPointNo).regions.includes(filters.region)
    )
    .map((request) => ({
      no: request.no,
      ordererName: request.ordererName,
      recipientName: request.recipientName,
      deliveryPointName: request.deliveryPointName,
      productName: request.productName,
      desiredDate: request.desiredDate,
      overdue: request.desiredDate < today
    }))
    .sort((left, right) => left.desiredDate.localeCompare(right.desiredDate))
}

type AlertKind = 'nonconformity' | 'refusal' | 'contestation' | 'gap' | 'protest' | 'deviation'

/** What needs an action on the order: one row by kind, with the number of facts concerned. */
function alertsOf(db: MockDatabase, order: ScopedOrder) {
  if (order.api.status === 'cancelled' || order.api.status === 'completed') return []
  const counts = new Map<AlertKind, number>()
  const add = (kind: AlertKind, count = 1) => counts.set(kind, (counts.get(kind) ?? 0) + count)
  for (const line of order.row.lines) {
    if (line.nonconformityAt && !line.replannedAt) add('nonconformity')
    if (line.refusalAt) add('refusal')
    if (line.receptionContestedAt && !line.contestHandledAt) add('contestation')
    if (line.quantityGap !== null && line.quantityGap !== 0 && !line.gapQualification) add('gap')
    if (line.protests.some((note) => protestStatus(note) !== 'closed')) add('protest')
  }
  if (order.row.tripNo) {
    const open = db.routeDeviations
      .all()
      .filter((deviation) => deviation.tripNo === order.row.tripNo && !deviation.qualification)
    if (open.length) add('deviation', open.length)
  }
  return [...counts.entries()].map(([kind, count]) => ({
    orderNo: order.api.no,
    status: order.api.status,
    recipientSummary: order.api.recipientSummary,
    kind,
    count
  }))
}

/** When the vehicle was due at the point: the delivery stop in the same city, else the arrival. */
export function plannedAtPoint(
  db: MockDatabase,
  order: Pick<
    TransportOrderApi,
    'tripNo' | 'routeTemplateNo' | 'plannedDeparture' | 'plannedArrival'
  >,
  pointNo: string
): string | null {
  const trip = order.tripNo ? db.trips.find(order.tripNo) : undefined
  const route = order.routeTemplateNo ? db.routeTemplates.find(order.routeTemplateNo) : undefined
  const stops = trip?.stops ?? route?.stops ?? []
  const start = trip?.plannedDeparture ?? order.plannedDeparture
  const city = db.deliveryPoints.find(pointNo)?.city ?? ''
  if (start && stops.length && city) {
    const schedule = plannedSchedule(start, stops)
    let index = -1
    stops.forEach((stop, position) => {
      if (stop.role === 'delivery' && db.sites.find(stop.siteNo)?.city === city) index = position
    })
    if (index >= 0) return schedule[index] ?? null
  }
  return order.plannedArrival
}

const carrierKey = (order: ScopedOrder) =>
  order.api.means === 'carrier' ? (order.api.carrierNo ?? 'carrier') : 'fleet'

/** One delivery is the lines of an order going to one point (TRS08-US02). */
function deliveriesOf(db: MockDatabase, orders: readonly ScopedOrder[]) {
  const margin = planningSettings(db).schedule.lateMarginMin
  const rows = []
  for (const order of orders) {
    const points = [...new Set(order.row.lines.map((line) => line.deliveryPointNo))]
    for (const pointNo of points) {
      const lines = order.row.lines.filter((line) => line.deliveryPointNo === pointNo)
      const actual = lines
        .map((line) => line.arrivedAt ?? line.declaredAt)
        .filter((at): at is string => !!at)
        .sort()[0]
      const planned = plannedAtPoint(db, order.api, pointNo)
      if (!actual || !planned) continue
      const view = order.api.lines.find((line) => line.deliveryPointNo === pointNo)
      const point = db.deliveryPoints.find(pointNo)
      rows.push({
        orderNo: order.api.no,
        deliveryPointNo: pointNo,
        deliveryPointName: view?.deliveryPointName ?? '',
        recipientNo: point?.customerNo ?? '',
        recipientName: view?.recipientName ?? '',
        carrierKey: carrierKey(order),
        carrierName: order.api.means === 'carrier' ? order.api.carrierName : '',
        plannedAt: planned,
        actualAt: actual,
        delayMin: delayMinutes(actual, planned),
        onTime: arrivedOnTime(actual, planned, margin)
      })
    }
  }
  return rows
}

function punctualityOf(db: MockDatabase, orders: readonly ScopedOrder[]) {
  const deliveries = deliveriesOf(db, orders)
  const onTime = deliveries.filter((delivery) => delivery.onTime).length
  return {
    marginMin: planningSettings(db).schedule.lateMarginMin,
    onTime,
    total: deliveries.length,
    rate: punctualityRate(onTime, deliveries.length),
    deliveries,
    byPeriod: groupRates(
      deliveries.map((item) => ({
        key: item.actualAt.slice(0, 7),
        label: item.actualAt.slice(0, 7),
        onTime: item.onTime
      }))
    ),
    byRecipient: groupRates(
      deliveries.map((item) => ({
        key: item.recipientNo,
        label: item.recipientName || item.recipientNo,
        onTime: item.onTime
      }))
    ),
    byCarrier: groupRates(
      deliveries.map((item) => ({
        key: item.carrierKey,
        label: item.carrierName,
        onTime: item.onTime
      }))
    )
  }
}

/** Kilometres run: the odometers of the trip, else its reference, else the route estimate. */
function distanceOf(db: MockDatabase, order: ScopedOrder): number | null {
  if (!ON_ROAD.includes(order.api.status)) return null
  const trip = order.row.tripNo ? db.trips.find(order.row.tripNo) : undefined
  if (trip?.startOdometerKm != null && trip.endOdometerKm != null)
    return Math.max(0, trip.endOdometerKm - trip.startOdometerKm)
  if (trip?.referenceKm) return trip.referenceKm
  const route = order.api.routeTemplateNo
    ? db.routeTemplates.find(order.api.routeTemplateNo)
    : undefined
  return route?.estimatedDistanceKm ?? null
}

/** The share of the carrier invoices (not refused) that covers the order, split evenly. */
function invoicedShare(db: MockDatabase, orderNo: string): number | null {
  const invoices = db.carrierInvoices
    .all()
    .filter((invoice) => !invoice.refusedAt && invoice.orderNos.includes(orderNo))
  if (!invoices.length) return null
  return Math.round(
    invoices.reduce((sum, invoice) => sum + invoice.amount / invoice.orderNos.length, 0)
  )
}

/**
 * Cost of each order on the road (TRS08-US02): the FMS gives the fuel put in the vehicle for the
 * trip and the running cost of the vehicle per kilometre (maintenance, tyres and insurance over
 * the last twelve months); a subcontracted order costs the carrier's invoice.
 */
function costsOf(db: MockDatabase, orders: readonly ScopedOrder[]) {
  const today = todayIso()
  const perKm = new Map<string, number | null>()
  const costPerKm = (vehicleNo: string) => {
    if (!perKm.has(vehicleNo)) {
      const cost = vehicleCostApi(db, vehicleNo, addDays(today, -364), today)
      const running = cost.maintenance + cost.tyres + cost.insurance
      perKm.set(vehicleNo, cost.km > 0 ? running / cost.km : null)
    }
    return perKm.get(vehicleNo) ?? null
  }
  const rows = orders
    .filter((order) => order.api.means && ON_ROAD.includes(order.api.status))
    .map((order) => {
      const distanceKm = distanceOf(db, order)
      const carrier = order.api.means === 'carrier'
      const fuel = carrier
        ? null
        : db.fuelRefills
            .all()
            .filter((refill) => refill.tripNo && refill.tripNo === order.row.tripNo)
            .reduce((sum, refill) => sum + refill.liters * refill.unitPrice, 0)
      const kmCost = !carrier && order.api.vehicleNo ? costPerKm(order.api.vehicleNo) : null
      const vehicleCost =
        kmCost !== null && distanceKm !== null ? Math.round(kmCost * distanceKm) : null
      const carrierInvoice = carrier ? invoicedShare(db, order.api.no) : null
      return {
        orderNo: order.api.no,
        means: order.api.means,
        carrierName: order.api.carrierName,
        vehiclePlate: carrier ? order.api.carrierVehiclePlate : order.api.vehiclePlate,
        distanceKm,
        vehicleCost,
        fuelCost: fuel === null ? null : Math.round(fuel),
        carrierInvoice,
        total: orderCost({
          carrierAmount: carrierInvoice,
          fuelCost: fuel,
          distanceKm: carrier ? null : distanceKm,
          costPerKm: kmCost
        })
      }
    })
  const sum = (pick: (row: (typeof rows)[number]) => number | null) =>
    rows.reduce((total, row) => total + (pick(row) ?? 0), 0)
  return {
    orders: rows,
    totals: {
      vehicleCost: sum((row) => row.vehicleCost),
      fuelCost: sum((row) => row.fuelCost),
      carrierInvoice: sum((row) => row.carrierInvoice),
      total: sum((row) => row.total)
    }
  }
}

const referenceOf = (line: TransportOrderLineRow) => line.loadedQuantity ?? line.quantity

function qualityOf(db: MockDatabase, orders: readonly ScopedOrder[]) {
  const today = todayIso()
  const tacit = planningSettings(db).confirmation.tacitConfirmationDays
  const lines = orders.flatMap((order) => order.row.lines.map((line) => ({ order, line })))
  const outcomes = deliveryOutcomes(
    lines.map(({ line }) => ({
      ...line,
      reference: referenceOf(line),
      attested: receptionAttested(line, today, tacit)
    }))
  )
  const share = (part: number) => rate(part, outcomes.concerned)
  const recipientScores = lines
    .map(({ line }) => line.satisfactionScore)
    .filter((score): score is number => score !== null)
  const surveys = orders.flatMap((order) => order.api.ordererSurveys)
  const fuel = new Set(
    db.products
      .all()
      .filter((product) => product.isFuel)
      .map((product) => product.no)
  )
  const gaps = lines
    .filter(
      ({ line }) => fuel.has(line.productNo) && line.quantityGap !== null && line.quantityGap !== 0
    )
    .map(({ order, line }) => {
      const view = order.api.lines.find((item) => item.lineNo === line.lineNo)
      return {
        orderNo: order.api.no,
        lineNo: line.lineNo,
        recipientName: view?.recipientName ?? '',
        productName: view?.productName ?? '',
        unit: view?.unit ?? '',
        gap: line.quantityGap ?? 0,
        qualification: line.gapQualification
      }
    })
  return {
    ...outcomes,
    rates: {
      confirmed: share(outcomes.confirmed),
      partial: share(outcomes.partial),
      refused: share(outcomes.refused),
      postponed: share(outcomes.postponed),
      contested: share(outcomes.contested),
      returned: share(outcomes.returned)
    },
    satisfaction: {
      recipientAverage: averageScore(recipientScores),
      recipientCount: recipientScores.length,
      ordererOrder: averageScore(surveys.map((survey) => survey.orderScore)),
      ordererDelay: averageScore(surveys.map((survey) => survey.delayScore)),
      ordererQuality: averageScore(surveys.map((survey) => survey.qualityScore)),
      ordererCount: surveys.length
    },
    fuelGaps: { ...fuelGapSummary(gaps), rows: gaps }
  }
}

/** Use of the means (TRS08-US04): fill in weight and volume, deliveries and kilometres. */
function meansOf(db: MockDatabase, orders: readonly ScopedOrder[]) {
  const rows = orders
    .filter((order) => order.api.means && order.api.status !== 'cancelled')
    .map((order) => {
      const carriers =
        order.api.means === 'fleet' && order.api.vehicleNo
          ? goodsCarriers(db, order.api.vehicleNo, order.api.trailerNo)
          : []
      const capacityKg = carriers.reduce((sum, vehicle) => sum + (vehicle.maxLoadKg ?? 0), 0)
      const plan = order.api.compartmentPlan
      let volumeL: number | null = null
      let capacityL = 0
      if (plan && plan.compartments.length) {
        capacityL = plan.compartments.reduce((sum, item) => sum + item.volumeL, 0)
        volumeL = plan.uses.reduce((sum, use) => sum + use.usedL, 0)
      } else {
        capacityL = carriers.reduce((sum, vehicle) => sum + (vehicle.maxVolumeM3 ?? 0) * 1000, 0)
        const volumes = [
          ...new Set(order.row.lines.map((line) => line.deliveryRequestNo).filter(Boolean))
        ]
          .map((no) => db.deliveryRequests.find(no!)?.volumeM3 ?? null)
          .filter((volume): volume is number => volume !== null)
        volumeL = volumes.length ? volumes.reduce((sum, volume) => sum + volume * 1000, 0) : null
      }
      return {
        orderNo: order.api.no,
        status: order.api.status,
        means: order.api.means,
        vehiclePlate:
          order.api.means === 'carrier'
            ? order.api.carrierVehiclePlate
            : [order.api.vehiclePlate, order.api.trailerPlate].filter(Boolean).join(' · '),
        carrierName: order.api.carrierName,
        weightKg: order.api.totalWeightKg,
        capacityKg: capacityKg || null,
        weightRate:
          order.api.totalWeightKg !== null ? fillRate(order.api.totalWeightKg, capacityKg) : null,
        volumeL,
        capacityL: capacityL || null,
        volumeRate: volumeL !== null ? fillRate(volumeL, capacityL) : null,
        deliveries: new Set(order.row.lines.map((line) => line.deliveryPointNo)).size,
        distanceKm: distanceOf(db, order)
      }
    })
  const mean = (values: (number | null)[]) => {
    const known = values.filter((value): value is number => value !== null)
    return known.length
      ? Math.round((known.reduce((sum, value) => sum + value, 0) / known.length) * 10) / 10
      : null
  }
  return {
    orders: rows,
    averages: {
      weightRate: mean(rows.map((row) => row.weightRate)),
      volumeRate: mean(rows.map((row) => row.volumeRate)),
      deliveries: mean(rows.map((row) => row.deliveries)),
      distanceKm: rows.reduce((sum, row) => sum + (row.distanceKm ?? 0), 0)
    }
  }
}

/** Each external carrier (TRS08-US04): orders, punctuality, quality, invoices against tariff. */
function carrierRows(db: MockDatabase, orders: readonly ScopedOrder[]) {
  const settings = planningSettings(db)
  const tolerance = settings.billing.carrierInvoiceToleranceAmount
  const tacit = settings.confirmation.tacitConfirmationDays
  const today = todayIso()
  const figures = new Map<string, CarrierFigures>()
  const orderNos = new Set(orders.map((order) => order.api.no))
  const deliveries = deliveriesOf(db, orders)
  for (const order of orders) {
    if (order.api.means !== 'carrier' || !order.api.carrierNo) continue
    const row = figures.get(order.api.carrierNo) ?? {
      carrierNo: order.api.carrierNo,
      orders: 0,
      onTime: 0,
      arrived: 0,
      attested: 0,
      contested: 0,
      refused: 0,
      partial: 0,
      declared: 0,
      invoices: 0,
      invoicesOutside: 0,
      withoutTariff: 0,
      invoiceGap: 0
    }
    row.orders += 1
    for (const delivery of deliveries.filter((item) => item.orderNo === order.api.no)) {
      row.arrived += 1
      if (delivery.onTime) row.onTime += 1
    }
    for (const line of order.row.lines) {
      if (line.declaredAt) {
        row.declared += 1
        if (receptionAttested(line, today, tacit)) row.attested += 1
        if (line.receivedQuantity !== null && line.receivedQuantity < referenceOf(line))
          row.partial += 1
      }
      if (line.refusalAt) row.refused += 1
      if (line.receptionContestedAt) row.contested += 1
    }
    figures.set(order.api.carrierNo, row)
  }
  for (const invoice of db.carrierInvoices.all()) {
    if (invoice.refusedAt || !invoice.orderNos.some((no) => orderNos.has(no))) continue
    const row = figures.get(invoice.carrierNo)
    if (!row) continue
    const seen = carrierInvoiceView(db, invoice)
    row.invoices += 1
    const gap = invoiceGap(invoice.amount, seen.untariffed ? null : seen.agreedAmount)
    if (gap === null) {
      if (invoice.validatedAt) row.withoutTariff += 1
    } else {
      row.invoiceGap += gap
      if (Math.abs(gap) > tolerance) row.invoicesOutside += 1
    }
  }
  return [...figures.values()].map((row) => ({
    ...carrierIndicators(row),
    carrierName: db.providers.find(row.carrierNo)?.name ?? null
  }))
}

export function carrierReport(
  db: MockDatabase,
  userCode: string,
  filters?: Partial<ReportFilters>
) {
  return carrierRows(db, scopedOrders(db, userCode, filters))
}

export function planningDashboard(
  db: MockDatabase,
  userCode: string,
  filters: ReportFilters = NO_FILTER
) {
  const orders = scopedOrders(db, userCode, filters)
  const settings = planningSettings(db)
  const tacitDays = settings.confirmation.tacitConfirmationDays
  const today = todayIso()
  const now = nowIsoDateTime()
  let declared = 0
  let attested = 0
  let contested = 0
  for (const { row } of orders) {
    for (const line of row.lines) {
      if (!line.declaredAt) continue
      declared += 1
      if (receptionAttested(line, today, tacitDays)) attested += 1
      if (line.receptionContestedAt) contested += 1
    }
  }
  const punctuality = punctualityOf(db, orders)
  const byStatus: Record<string, number> = {}
  for (const { api } of orders) byStatus[api.status] = (byStatus[api.status] ?? 0) + 1
  const late = orders
    .map(({ api }) => ({
      orderNo: api.no,
      status: api.status,
      recipientSummary: api.recipientSummary,
      plannedDeparture: api.plannedDeparture,
      plannedArrival: api.plannedArrival,
      kind: lateKind(
        {
          status: api.status,
          plannedDeparture: api.plannedDeparture,
          plannedArrival: api.plannedArrival,
          delivered: api.awaitingClosing
        },
        now,
        settings.schedule.lateMarginMin
      )
    }))
    .filter((item) => item.kind !== null)
  const alerts = orders.flatMap((order) => alertsOf(db, order))
  const orderNos = new Set(orders.map((order) => order.api.no))
  const toInvoice = customerBillingApi(db).filter(
    (row) => orderNos.has(row.orderNo) && !row.reference && !row.issue
  )
  const invoicesToCheck = db.carrierInvoices
    .all()
    .filter(
      (invoice) =>
        !invoice.validatedAt &&
        !invoice.refusedAt &&
        invoice.orderNos.some((no) => orderNos.has(no))
    ).length
  const carriers = carrierRows(db, orders)
    .sort((left, right) => right.orders - left.orders)
    .slice(0, DASHBOARD_CARRIERS)
  return {
    filters,
    choices: filterChoices(db),
    orders: orders.length,
    byStatus,
    late,
    alerts,
    pendingRequests: pendingRequests(db, userCode, filters),
    punctuality: punctuality.rate,
    confirmation: confirmationRate(attested, declared),
    contestation: contestationRate(contested, declared),
    lines: {
      declared,
      attested,
      contested,
      onTime: punctuality.onTime,
      arrived: punctuality.total
    },
    toInvoice: toInvoice.length,
    toInvoiceAmount: toInvoice.reduce((sum, row) => sum + (row.amount ?? 0), 0),
    invoicesToCheck,
    carriers
  }
}

/** Every indicator of the transport reports, over the same orders (TRS08-US02 to US05). */
export function transportReport(db: MockDatabase, userCode: string, filters: ReportFilters) {
  const orders = scopedOrders(db, userCode, filters)
  return {
    filters,
    choices: filterChoices(db),
    orders: orders.length,
    punctuality: punctualityOf(db, orders),
    costs: costsOf(db, orders),
    quality: qualityOf(db, orders),
    means: meansOf(db, orders),
    carriers: carrierRows(db, orders)
  }
}

export function registerReportHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/planning/dashboard', { feature: 'PLANNINGDASHBOARD', action: 'read' }, (request) =>
    ok(planningDashboard(db, sessionUser(request).code, filtersOf(request)))
  )
  router.get(
    '/planning/reports/carriers',
    { feature: 'TRANSPORTREPORT', action: 'read' },
    (request) => ok(carrierReport(db, sessionUser(request).code, filtersOf(request)))
  )
  router.get(
    '/planning/reports/transport',
    { feature: 'TRANSPORTREPORT', action: 'read' },
    (request) => ok(transportReport(db, sessionUser(request).code, filtersOf(request)))
  )
}
