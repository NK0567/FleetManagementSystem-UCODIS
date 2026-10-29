import { familyAllowed } from '@/modules/fleet/vehicles/domain/compartments'
import {
  deliveryRequestStatus,
  requestLines
} from '@/modules/planning/delivery-requests/domain/deliveryRequest'
import { forbiddenTogether } from '@/modules/planning/product-compatibilities/domain/productCompatibility'
import {
  loadFill,
  loadIssue,
  pointIssue,
  type LoadLine
} from '@/modules/planning/transport-orders/domain/transportOrder'
import type {
  LoadingProposalApi,
  ProposalAssignment,
  ProposalCarrierGroup,
  ProposalRequestApi,
  ProposalVehicleApi
} from '@/modules/planning/transport-orders/types/loadingProposal.types'
import { todayIso } from '@/utils/date'
import { distanceKm } from '@/utils/geo'
import type { MockDatabase } from '../../db/database'
import type { DeliveryRequestRow } from '../../fixtures/planning/deliveryRequests'
import type { TransportOrderLineRow } from '../../fixtures/planning/transportOrders'
import { readBody } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { invalidField, readDate } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { localize, toMockLanguage, type MockLanguage } from '../../i18n'
import { availabilityOver } from '../fleet/availability'
import { CIRCUIT_MESSAGES } from './circuitMessages'
import { PLANNING_MESSAGES } from './messages'
import { requestPlace, visibleTo } from './perimeter'
import { planningSettings } from './settings'
import {
  compartmentPlan,
  createProposedOrder,
  goodsCarriers,
  loadWarning,
  missingEquipment,
  serving
} from './transportOrders'

const BASE = '/planning/transport-orders/loading-proposal'

interface Combination {
  vehicleNo: string
  trailerNo: string | null
}

const round = (value: number) => Math.round(value * 1000) / 1000

/** The orders of the day still waiting for a transport order, that the planner may see. */
function requestsOfDay(db: MockDatabase, date: string, userCode: string): DeliveryRequestRow[] {
  const blockExpired = planningSettings(db).requests.expiredDateMode === 'block'
  return db.deliveryRequests.all().filter((row) => {
    const status = deliveryRequestStatus(row, todayIso())
    const open = status === 'pending' || (status === 'expired' && !blockExpired)
    return (
      open &&
      row.desiredDate.slice(0, 10) === date &&
      visibleTo(db, userCode, requestPlace(db, row.deliveryPointNo))
    )
  })
}

/** The lines of some orders, as a transport order would carry them. */
function linesOf(rows: readonly DeliveryRequestRow[]): TransportOrderLineRow[] {
  let lineNo = 0
  return rows.flatMap((row) =>
    requestLines(row).map(
      (line) =>
        ({
          lineNo: ++lineNo,
          deliveryRequestNo: row.no,
          requestLineNo: line.lineNo,
          deliveryPointNo: row.deliveryPointNo,
          productNo: line.productNo,
          quantity: line.quantity,
          weightKg: line.weightKg,
          volumeM3: line.volumeM3
        }) as TransportOrderLineRow
    )
  )
}

function asLoad(db: MockDatabase, lines: readonly TransportOrderLineRow[]): LoadLine[] {
  return lines.map((line) => ({
    weightKg: line.weightKg,
    quantity: line.quantity,
    fuel: db.products.find(line.productNo)?.isFuel ?? false,
    volumeM3: line.volumeM3 ?? null
  }))
}

function requestApi(db: MockDatabase, row: DeliveryRequestRow): ProposalRequestApi {
  const point = db.deliveryPoints.find(row.deliveryPointNo)
  const lines = linesOf([row])
  const load = asLoad(db, lines)
  return {
    no: row.no,
    recipientName: db.customers.find(point?.customerNo ?? '')?.name ?? '',
    deliveryPointName: point?.name ?? '',
    region: requestPlace(db, row.deliveryPointNo).regions[0] ?? point?.city ?? '',
    externalReference: row.externalReference,
    summary: requestLines(row)
      .map((line) => {
        const product = db.products.find(line.productNo)
        return `${product?.name ?? line.productNo} ${line.quantity} ${product?.unit ?? ''}`.trim()
      })
      .join(', '),
    weightKg: round(load.reduce((total, line) => total + (line.weightKg ?? 0), 0)),
    volumeM3: round(load.reduce((total, line) => total + (line.volumeM3 ?? 0), 0)),
    liters: round(load.reduce((total, line) => total + (line.fuel ? line.quantity : 0), 0))
  }
}

/**
 * The rules an assignment must keep (TRS01-US10, TRS07-US08): the categories the vehicle is kept
 * for, the products never together, the delivery sites, the equipment asked for and the rules of
 * the compartments. An excess of capacity is a warning, as everywhere in planning.
 */
function judge(
  db: MockDatabase,
  combination: Combination,
  rows: readonly DeliveryRequestRow[],
  language: MockLanguage
): { issues: string[]; warnings: string[] } {
  const lines = linesOf(rows)
  const issues: string[] = []
  const warnings: string[] = []
  if (!lines.length) return { issues, warnings }
  const carriers = goodsCarriers(db, combination.vehicleNo, combination.trailerNo)
  for (const line of lines) {
    const product = db.products.find(line.productNo)
    const refusing = carriers.find(
      (vehicle) => product && !familyAllowed(vehicle.productFamilies ?? [], product.family)
    )
    if (refusing && product) {
      issues.push(
        localize(language, PLANNING_MESSAGES.orderFamilyRefused, {
          plate: refusing.plate,
          family: product.family,
          product: product.name
        })
      )
      break
    }
  }
  const [rule] = forbiddenTogether(
    db.productCompatibilities.all(),
    lines.map((line) => line.productNo)
  )
  if (rule) {
    issues.push(
      localize(language, PLANNING_MESSAGES.orderProductsIncompatible, {
        productA: db.products.find(rule.productANo)?.name ?? rule.productANo,
        productB: db.products.find(rule.productBNo)?.name ?? rule.productBNo
      })
    )
  }
  const served = serving(db, combination.vehicleNo, combination.trailerNo)
  const place = pointIssue(
    lines.map((line) => {
      const point = db.deliveryPoints.findOrFail(line.deliveryPointNo)
      return {
        name: point.name,
        pumpRequired: point.pumpRequired,
        acceptedVehicleTypeNos: point.acceptedVehicleTypeNos
      }
    }),
    served.typeNo,
    served.hasPump
  )
  if (place) {
    issues.push(
      localize(
        language,
        place.code === 'pumpRequired'
          ? PLANNING_MESSAGES.orderPumpRequired
          : PLANNING_MESSAGES.orderVehicleTypeRefused,
        { point: place.point }
      )
    )
  }
  const missing = missingEquipment(db, lines, combination.vehicleNo, combination.trailerNo)
  if (missing) {
    issues.push(
      localize(language, CIRCUIT_MESSAGES.equipmentRequired, {
        no: missing.requestNo,
        equipment: missing.equipment
      })
    )
  }
  const plan = compartmentPlan(db, lines, combination.vehicleNo, combination.trailerNo)
  for (const issue of plan?.issues ?? []) {
    if (issue.code === 'notFull') {
      issues.push(
        localize(language, PLANNING_MESSAGES.compartmentNotFull, {
          no: issue.no,
          used: Math.round(issue.usedL),
          volume: Math.round(issue.volumeL)
        })
      )
    } else {
      warnings.push(
        localize(language, PLANNING_MESSAGES.compartmentNoRoom, { product: issue.productName })
      )
    }
  }
  const load = loadIssue(asLoad(db, lines), served.capacity)
  const excess = load ? loadWarning(language, load) : null
  if (excess) warnings.push(excess)
  return { issues, warnings }
}

function vehicleApi(
  db: MockDatabase,
  combination: Combination,
  rows: readonly DeliveryRequestRow[],
  language: MockLanguage
): ProposalVehicleApi {
  const lines = linesOf(rows)
  const served = serving(db, combination.vehicleNo, combination.trailerNo)
  const plan = lines.length
    ? compartmentPlan(db, lines, combination.vehicleNo, combination.trailerNo)
    : null
  // Each compartment shows its products and their recipients.
  const recipientOf = new Map(
    lines.map((line) => {
      const point = db.deliveryPoints.find(line.deliveryPointNo)
      return [line.lineNo, db.customers.find(point?.customerNo ?? '')?.name || point?.name || '']
    })
  )
  const verdict = judge(db, combination, rows, language)
  return {
    vehicleNo: combination.vehicleNo,
    plate: db.vehicles.find(combination.vehicleNo)?.plate ?? combination.vehicleNo,
    trailerNo: combination.trailerNo,
    trailerPlate: combination.trailerNo
      ? (db.vehicles.find(combination.trailerNo)?.plate ?? '')
      : '',
    families: goodsCarriers(db, combination.vehicleNo, combination.trailerNo).flatMap(
      (vehicle) => vehicle.productFamilies ?? []
    ),
    capacity: served.capacity,
    requests: rows.map((row) => requestApi(db, row)),
    fill: loadFill(asLoad(db, lines), served.capacity),
    compartments: (plan?.uses ?? []).map((use) => ({
      ...use,
      lines: use.lines.map((item) => ({
        ...item,
        productName: `${item.productName} · ${recipientOf.get(item.lineNo) ?? ''}`
      }))
    })),
    ...verdict
  }
}

/** The free combinations of the fleet that day: a motorized vehicle and its coupled trailer. */
function freeCombinations(db: MockDatabase, date: string, language: MockLanguage): Combination[] {
  const window = { start: `${date}T00:00:00`, end: `${date}T23:59:00` }
  const { vehicles } = availabilityOver(db, window, language)
  const free = new Set(vehicles.filter((item) => item.available).map((item) => item.no))
  const coupled = new Map(
    db.couplings
      .all()
      .filter((row) => row.startDate <= date && (!row.endDate || row.endDate >= date))
      .map((row) => [row.tractorNo, row.trailerNo])
  )
  return vehicles
    .filter((item) => item.role === 'motorized' && item.available)
    .map((item) => {
      const trailerNo = coupled.get(item.no) ?? null
      return { vehicleNo: item.no, trailerNo: trailerNo && free.has(trailerNo) ? trailerNo : null }
    })
    .filter((combination) => serving(db, combination.vehicleNo, combination.trailerNo).capacity)
}

/**
 * A first assignment to correct afterwards (TRS01-US10): the orders grouped by destination region,
 * the heaviest group first, each order on a vehicle already going to its region when it fits,
 * else on the largest free vehicle; what no vehicle takes stays to assign, with why.
 */
function propose(db: MockDatabase, date: string, request: MockRequest): LoadingProposalApi {
  const language = toMockLanguage(request.language)
  const rows = requestsOfDay(db, date, sessionUser(request).code)
  const combinations = freeCombinations(db, date, language)
    .map((combination) => ({
      combination,
      capacity: serving(db, combination.vehicleNo, combination.trailerNo).capacity!
    }))
    .sort((a, b) => (b.capacity.maxLoadKg ?? 0) - (a.capacity.maxLoadKg ?? 0))
  const regionOf = (row: DeliveryRequestRow) =>
    requestPlace(db, row.deliveryPointNo).regions[0] ?? ''
  const depot = db.sites.all().find((site) => site.siteTypeNo === 'DEPOT')
  const distance = (row: DeliveryRequestRow) => {
    const point = db.deliveryPoints.find(row.deliveryPointNo)
    return depot && point ? distanceKm(depot, point) : 0
  }
  const weightOf = (row: DeliveryRequestRow) =>
    requestLines(row).reduce((total, line) => total + (line.weightKg ?? 0), 0)
  const regions = new Map<string, DeliveryRequestRow[]>()
  for (const row of rows) regions.set(regionOf(row), [...(regions.get(regionOf(row)) ?? []), row])
  const groups = [...regions.values()]
    .map((group) => group.sort((a, b) => distance(a) - distance(b)))
    .sort(
      (a, b) =>
        b.reduce((total, row) => total + weightOf(row), 0) -
        a.reduce((total, row) => total + weightOf(row), 0)
    )
  const loads = new Map<string, DeliveryRequestRow[]>()
  const unassigned: LoadingProposalApi['unassigned'] = []
  for (const group of groups) {
    for (const row of group) {
      const fits = (combination: (typeof combinations)[number]['combination']) => {
        const tried = [...(loads.get(combination.vehicleNo) ?? []), row]
        const verdict = judge(db, combination, tried, language)
        return !verdict.issues.length && !verdict.warnings.length
      }
      const sameRegion = combinations.find(
        ({ combination }) =>
          (loads.get(combination.vehicleNo) ?? []).some(
            (other) => regionOf(other) === regionOf(row)
          ) && fits(combination)
      )
      const empty = combinations.find(
        ({ combination }) => !loads.get(combination.vehicleNo)?.length && fits(combination)
      )
      const any = combinations.find(({ combination }) => fits(combination))
      const chosen = sameRegion ?? empty ?? any
      if (!chosen) {
        unassigned.push({
          ...requestApi(db, row),
          reason: localize(
            language,
            combinations.length
              ? CIRCUIT_MESSAGES.proposalNoRoom
              : CIRCUIT_MESSAGES.proposalNoVehicle
          )
        })
        continue
      }
      loads.set(chosen.combination.vehicleNo, [
        ...(loads.get(chosen.combination.vehicleNo) ?? []),
        row
      ])
    }
  }
  const vehicles = combinations
    .filter(({ combination }) => loads.get(combination.vehicleNo)?.length)
    .map(({ combination }) =>
      vehicleApi(db, combination, loads.get(combination.vehicleNo)!, language)
    )
  return {
    date,
    vehicles,
    unassigned,
    remaining: remainingOf(db, unassigned),
    available: availableOf(
      db,
      combinations.map((item) => item.combination)
    )
  }
}

function availableOf(db: MockDatabase, combinations: readonly Combination[]) {
  return combinations.map((combination) => ({
    ...combination,
    label: [combination.vehicleNo, combination.trailerNo]
      .filter((no): no is string => !!no)
      .map((no) => db.vehicles.find(no)?.plate ?? no)
      .join(' + ')
  }))
}

/** What waits for a vehicle, by product. */
function remainingOf(
  db: MockDatabase,
  unassigned: readonly { no: string }[]
): LoadingProposalApi['remaining'] {
  const totals = new Map<string, number>()
  for (const item of unassigned) {
    const row = db.deliveryRequests.find(item.no)
    for (const line of row ? requestLines(row) : []) {
      totals.set(line.productNo, (totals.get(line.productNo) ?? 0) + line.quantity)
    }
  }
  return [...totals].map(([productNo, quantity]) => {
    const product = db.products.find(productNo)
    return {
      productNo,
      productName: product?.name ?? productNo,
      unit: product?.unit ?? '',
      quantity: round(quantity)
    }
  })
}

function readAssignments(body: Record<string, unknown>): ProposalAssignment[] {
  const raw = body.assignments
  if (!Array.isArray(raw)) throw invalidField('assignments')
  return raw.map((item) => {
    if (!item || typeof item !== 'object') throw invalidField('assignments')
    const row = item as Record<string, unknown>
    const requestNos = row.requestNos
    if (
      typeof row.vehicleNo !== 'string' ||
      !Array.isArray(requestNos) ||
      requestNos.some((no) => typeof no !== 'string')
    ) {
      throw invalidField('assignments')
    }
    return {
      vehicleNo: row.vehicleNo,
      trailerNo: typeof row.trailerNo === 'string' && row.trailerNo ? row.trailerNo : null,
      requestNos: requestNos as string[]
    }
  })
}

function readCarrierGroups(body: Record<string, unknown>): ProposalCarrierGroup[] {
  const raw = body.carrierGroups ?? []
  if (!Array.isArray(raw)) throw invalidField('carrierGroups')
  return raw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>
    if (
      typeof row.carrierNo !== 'string' ||
      !Array.isArray(row.requestNos) ||
      row.requestNos.some((no) => typeof no !== 'string')
    ) {
      throw invalidField('carrierGroups')
    }
    return { carrierNo: row.carrierNo, requestNos: row.requestNos as string[] }
  })
}

/** An assignment corrected by hand, judged by the same rules as the proposal. */
function evaluate(
  db: MockDatabase,
  date: string,
  assignments: readonly ProposalAssignment[],
  request: MockRequest,
  carrierNos: readonly string[] = []
): LoadingProposalApi {
  const language = toMockLanguage(request.language)
  const open = new Map(
    requestsOfDay(db, date, sessionUser(request).code).map((row) => [row.no, row])
  )
  const used = new Set<string>()
  const vehicles = assignments.map((assignment) => {
    if (!db.vehicles.exists(assignment.vehicleNo)) throw invalidField('assignments')
    if (assignment.trailerNo && !db.vehicles.exists(assignment.trailerNo)) {
      throw invalidField('assignments')
    }
    const rows = assignment.requestNos.map((no) => {
      const row = open.get(no)
      if (!row || used.has(no)) throw conflict(CIRCUIT_MESSAGES.proposalRequestTaken, { no })
      used.add(no)
      return row
    })
    return vehicleApi(db, assignment, rows, language)
  })
  for (const no of carrierNos) {
    if (!open.has(no) || used.has(no)) throw conflict(CIRCUIT_MESSAGES.proposalRequestTaken, { no })
    used.add(no)
  }
  const unassigned = [...open.values()]
    .filter((row) => !used.has(row.no))
    .map((row) => ({
      ...requestApi(db, row),
      reason: localize(language, CIRCUIT_MESSAGES.proposalByHand)
    }))
  return {
    date,
    vehicles,
    unassigned,
    remaining: remainingOf(db, unassigned),
    available: availableOf(db, freeCombinations(db, date, language))
  }
}

export function registerLoadingProposalHandlers(router: MockRouter, db: MockDatabase): void {
  const readDay = (body: Record<string, unknown>) => readDate(body, 'date', { required: true })!

  /* A proposal for a day (TRS01-US10), worked out again at each call: run it again at any time. */
  router.post(BASE, { feature: 'TRANSPORTORDER', action: 'update' }, (request) =>
    ok(propose(db, readDay(readBody(request)), request))
  )

  /* The planner moves orders between vehicles, or clears everything to assign by hand: each
   * correction is judged by the same rules. */
  router.post(`${BASE}/evaluate`, { feature: 'TRANSPORTORDER', action: 'update' }, (request) => {
    const body = readBody(request)
    const carriers = readCarrierGroups(body).flatMap((group) => group.requestNos)
    return ok(evaluate(db, readDay(body), readAssignments(body), request, carriers))
  })

  /* Validating makes one pending transport order per vehicle used, the vehicle kept as proposed,
   * and one per external carrier chosen for the rest (TRS01-US09). A broken rule blocks; an excess
   * of capacity blocks only when the capacity check is strict. */
  router.post(`${BASE}/validate`, { feature: 'TRANSPORTORDER', action: 'insert' }, (request) => {
    const body = readBody(request)
    const date = readDay(body)
    const groups = readCarrierGroups(body)
    const result = evaluate(
      db,
      date,
      readAssignments(body),
      request,
      groups.flatMap((group) => group.requestNos)
    )
    const broken = result.vehicles.flatMap((vehicle) => vehicle.issues)
    if (broken.length) throw unprocessable({ fr: broken.join(' '), en: broken.join(' ') })
    if (planningSettings(db).controls.strictCapacity) {
      const over = result.vehicles.flatMap((vehicle) => vehicle.warnings)
      if (over.length) throw unprocessable({ fr: over.join(' '), en: over.join(' ') })
    }
    const used = result.vehicles.filter((vehicle) => vehicle.requests.length)
    if (!used.length && !groups.some((group) => group.requestNos.length)) {
      throw unprocessable(CIRCUIT_MESSAGES.proposalEmpty)
    }
    for (const group of groups) {
      const carrier = db.providers.find(group.carrierNo)
      if (!carrier || carrier.providerType !== 'carrier' || !carrier.authorized) {
        throw unprocessable(PLANNING_MESSAGES.orderCarrierNotAuthorized)
      }
    }
    const time = planningSettings(db).schedule.defaultDepartureTime || '08:00'
    const departure = `${date}T${time}:00`
    const orders = [
      ...used.map((vehicle) =>
        createProposedOrder(db, request, {
          requestNos: vehicle.requests.map((item) => item.no),
          plannedDeparture: departure,
          proposedVehicleNo: vehicle.vehicleNo,
          proposedTrailerNo: vehicle.trailerNo,
          proposedCarrierNo: null,
          comment: localize(toMockLanguage(request.language), CIRCUIT_MESSAGES.proposalComment)
        })
      ),
      ...groups
        .filter((group) => group.requestNos.length)
        .map((group) =>
          createProposedOrder(db, request, {
            requestNos: group.requestNos,
            plannedDeparture: departure,
            proposedVehicleNo: null,
            proposedTrailerNo: null,
            proposedCarrierNo: group.carrierNo,
            comment: localize(toMockLanguage(request.language), CIRCUIT_MESSAGES.proposalComment)
          })
        )
    ]
    return ok({ orderNos: orders })
  })
}
