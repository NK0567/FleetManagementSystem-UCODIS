import { compartmentsOf, familyAllowed } from '@/modules/fleet/vehicles/domain/compartments'
import {
  requestLines,
  deliveryRequestStatus
} from '@/modules/planning/delivery-requests/domain/deliveryRequest'
import type {
  LoadingPreparationApi,
  PlanEntry,
  PreparationIssue,
  PreparationOptionsApi,
  PreparationVehicleApi,
  PreparationVehicleInput
} from '@/modules/planning/loading-preparations/types/loadingPreparation.types'
import { forbiddenTogether } from '@/modules/planning/product-compatibilities/domain/productCompatibility'
import { pointIssue } from '@/modules/planning/transport-orders/domain/transportOrder'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { LoadingPreparationRow } from '../../fixtures/planning/loadingPreparations'
import { readBody, routeParam, stampCreated, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { invalidField, readDate, readNumber, readString, readStringList } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { localize, toMockLanguage, type MockLanguage } from '../../i18n'
import { driverEmployees, driverFacts } from '../fleet/drivers'
import { driverIneligibility } from '@/modules/fleet/drivers/domain/driver'
import { PLANNING_MESSAGES } from './messages'
import { requestPlace } from './perimeter'
import { createPlannedOrder, goodsCarriers, serving } from './transportOrders'
import { nowIsoDateTime } from '@/utils/date'

const FEATURE = 'LOADINGPLAN'
const BASE = '/planning/loading-preparations'

interface Compartment {
  no: number
  volumeL: number | null
  families: string[]
  content: string
  fullFill: boolean
}

interface ReqLine {
  requestNo: string
  requestLineNo: number
  deliveryPointNo: string
  recipientName: string
  deliveryPointName: string
  productNo: string
  productName: string
  family: string
  unit: string
  litres: boolean
  quantity: number
}

const isLitre = (unit: string) => ['litre', 'l'].includes(unit.toLowerCase())

/** The compartments of a combination; a vehicle without any is one space. */
function compartmentsOfVehicle(db: MockDatabase, vehicle: PreparationVehicleInput): Compartment[] {
  const rules = compartmentsOf(
    goodsCarriers(db, vehicle.vehicleNo, vehicle.trailerNo).flatMap((item) => item.compartments),
    null
  )
  if (!rules.length) {
    return [{ no: 1, volumeL: null, families: [], content: 'mixed', fullFill: false }]
  }
  return rules.map((item) => ({
    no: item.no,
    volumeL: item.volumeL,
    families: [...item.families],
    content: item.content,
    fullFill: item.fullFill
  }))
}

function requestLinesOf(db: MockDatabase, requestNos: readonly string[]): ReqLine[] {
  return requestNos.flatMap((no) => {
    const request = db.deliveryRequests.find(no)
    if (!request) return []
    const point = db.deliveryPoints.find(request.deliveryPointNo)
    const recipient = point ? db.customers.find(point.customerNo) : undefined
    return requestLines(request).map((line) => {
      const product = db.products.find(line.productNo)
      return {
        requestNo: no,
        requestLineNo: line.lineNo,
        deliveryPointNo: request.deliveryPointNo,
        recipientName: recipient?.name ?? '',
        deliveryPointName: point?.name ?? '',
        productNo: line.productNo,
        productName: product?.name ?? line.productNo,
        family: product?.family ?? '',
        unit: product?.unit ?? '',
        litres: isLitre(product?.unit ?? ''),
        quantity: line.quantity
      }
    })
  })
}

const plateOf = (db: MockDatabase, no: string | null) =>
  no ? (db.vehicles.find(no)?.plate ?? no) : ''
const lineKey = (requestNo: string, lineNo: number) => `${requestNo}#${lineNo}`

/**
 * The rules that refuse a correction of the plan (TRS01-US22): the volume of a compartment,
 * its accepted categories and content, the compatibility of the products travelling together,
 * and the equipment a delivery point needs. Returns the first rule broken, as text.
 */
function brokenRule(
  db: MockDatabase,
  language: MockLanguage,
  vehicle: PreparationVehicleInput,
  entries: readonly PlanEntry[],
  lines: ReadonlyMap<string, ReqLine>
): string | null {
  const plate = plateOf(db, vehicle.trailerNo) || plateOf(db, vehicle.vehicleNo)
  const mine = entries.filter((entry) => entry.vehicleNo === vehicle.vehicleNo)
  const say = (text: Parameters<typeof localize>[1], params: Record<string, string | number>) =>
    localize(language, text, params)
  for (const compartment of compartmentsOfVehicle(db, vehicle)) {
    const held = mine
      .filter((entry) => entry.compartmentNo === compartment.no)
      .map((entry) => ({ entry, line: lines.get(lineKey(entry.requestNo, entry.requestLineNo))! }))
    for (const { line } of held) {
      if (!familyAllowed(compartment.families, line.family)) {
        return say(PLANNING_MESSAGES.prepCompartmentFamily, {
          compartment: compartment.no,
          plate,
          family: line.family
        })
      }
    }
    if (
      compartment.content === 'one_product' &&
      new Set(held.map((h) => h.line.productNo)).size > 1
    ) {
      return say(PLANNING_MESSAGES.prepCompartmentContent, {
        compartment: compartment.no,
        plate,
        what: language === 'fr' ? 'produit' : 'product'
      })
    }
    if (compartment.content === 'one_family' && new Set(held.map((h) => h.line.family)).size > 1) {
      return say(PLANNING_MESSAGES.prepCompartmentContent, {
        compartment: compartment.no,
        plate,
        what: language === 'fr' ? 'catégorie' : 'category'
      })
    }
    const used = held.filter((h) => h.line.litres).reduce((sum, h) => sum + h.entry.quantity, 0)
    if (compartment.volumeL !== null && used > compartment.volumeL) {
      return say(PLANNING_MESSAGES.prepCompartmentVolume, {
        compartment: compartment.no,
        plate,
        used,
        volume: compartment.volumeL
      })
    }
  }
  const products = [
    ...new Set(
      mine.map((entry) => lines.get(lineKey(entry.requestNo, entry.requestLineNo))!.productNo)
    )
  ]
  const [rule] = forbiddenTogether(db.productCompatibilities.all(), products)
  if (rule) {
    const name = (no: string) => db.products.find(no)?.name ?? no
    return say(PLANNING_MESSAGES.prepIncompatible, {
      productA: name(rule.productANo),
      productB: name(rule.productBNo),
      plate
    })
  }
  const served = serving(db, vehicle.vehicleNo, vehicle.trailerNo)
  const points = [
    ...new Set(
      mine.map((entry) => lines.get(lineKey(entry.requestNo, entry.requestLineNo))!.deliveryPointNo)
    )
  ]
  for (const pointNo of points) {
    const point = db.deliveryPoints.find(pointNo)
    if (!point) continue
    const issue = pointIssue(
      [
        {
          name: point.name,
          pumpRequired: point.pumpRequired,
          acceptedVehicleTypeNos: point.acceptedVehicleTypeNos
        }
      ],
      served.typeNo,
      served.hasPump
    )
    if (issue) {
      return say(PLANNING_MESSAGES.prepEquipment, {
        point: point.name,
        plate,
        equipment:
          issue.code === 'pumpRequired'
            ? language === 'fr'
              ? 'une pompe'
              : 'a pump'
            : language === 'fr'
              ? 'un autre type de véhicule'
              : 'another vehicle type'
      })
    }
  }
  return null
}

/** The verification of TRS01-US20: is the sharing possible, and if not, why. */
function issuesOf(
  db: MockDatabase,
  row: LoadingPreparationRow,
  lines: ReqLine[]
): PreparationIssue[] {
  const issues: PreparationIssue[] = []
  const byKey = new Map(lines.map((line) => [lineKey(line.requestNo, line.requestLineNo), line]))
  const vehicles = row.vehicles.map((vehicle) => ({
    vehicle,
    compartments: compartmentsOfVehicle(db, vehicle)
  }))
  const quantityL = lines
    .filter((line) => line.litres)
    .reduce((sum, line) => sum + line.quantity, 0)
  const capacityL = vehicles.reduce(
    (sum, item) => sum + item.compartments.reduce((total, c) => total + (c.volumeL ?? 0), 0),
    0
  )
  if (row.vehicles.length && quantityL > capacityL)
    issues.push({ code: 'overCapacity', quantityL, capacityL })
  for (const { vehicle, compartments } of vehicles) {
    const plate = plateOf(db, vehicle.trailerNo) || plateOf(db, vehicle.vehicleNo)
    const mine = row.plan.filter((entry) => entry.vehicleNo === vehicle.vehicleNo)
    const products = [
      ...new Set(
        mine.map(
          (entry) => byKey.get(lineKey(entry.requestNo, entry.requestLineNo))?.productNo ?? ''
        )
      )
    ]
    for (const rule of forbiddenTogether(db.productCompatibilities.all(), products)) {
      const name = (no: string) => db.products.find(no)?.name ?? no
      issues.push({
        code: 'incompatible',
        plate,
        productA: name(rule.productANo),
        productB: name(rule.productBNo)
      })
    }
    for (const compartment of compartments) {
      const held = mine.filter((entry) => entry.compartmentNo === compartment.no)
      const used = held
        .filter((entry) => byKey.get(lineKey(entry.requestNo, entry.requestLineNo))?.litres)
        .reduce((sum, entry) => sum + entry.quantity, 0)
      if (
        compartment.fullFill &&
        used > 0 &&
        compartment.volumeL !== null &&
        used < compartment.volumeL
      ) {
        issues.push({
          code: 'compartmentRule',
          plate,
          compartmentNo: compartment.no,
          rule: 'fullFill'
        })
      }
    }
    const served = serving(db, vehicle.vehicleNo, vehicle.trailerNo)
    const points = [
      ...new Set(
        mine.map(
          (entry) => byKey.get(lineKey(entry.requestNo, entry.requestLineNo))?.deliveryPointNo ?? ''
        )
      )
    ]
    for (const pointNo of points) {
      const point = db.deliveryPoints.find(pointNo)
      if (!point) continue
      const issue = pointIssue(
        [
          {
            name: point.name,
            pumpRequired: point.pumpRequired,
            acceptedVehicleTypeNos: point.acceptedVehicleTypeNos
          }
        ],
        served.typeNo,
        served.hasPump
      )
      if (issue) {
        issues.push({
          code: 'equipmentMissing',
          plate,
          point: point.name,
          equipment: issue.code === 'pumpRequired' ? 'pump' : 'vehicleType'
        })
      }
    }
  }
  for (const line of lines) {
    const placed = row.plan
      .filter(
        (entry) => entry.requestNo === line.requestNo && entry.requestLineNo === line.requestLineNo
      )
      .reduce((sum, entry) => sum + entry.quantity, 0)
    if (placed < line.quantity) {
      issues.push({
        code: 'unplaced',
        requestNo: line.requestNo,
        product: line.productName,
        quantity: line.quantity - placed,
        unit: line.unit
      })
    }
  }
  return issues
}

function issueLabel(language: MockLanguage, issue: PreparationIssue): string {
  const fr = language === 'fr'
  switch (issue.code) {
    case 'overCapacity':
      return fr
        ? `Quantité supérieure à la capacité (${issue.quantityL} L pour ${issue.capacityL} L).`
        : `Quantity above capacity (${issue.quantityL} L for ${issue.capacityL} L).`
    case 'incompatible':
      return fr
        ? `${issue.productA} et ${issue.productB} incompatibles sur ${issue.plate}.`
        : `${issue.productA} and ${issue.productB} incompatible on ${issue.plate}.`
    case 'compartmentRule':
      return fr
        ? `Le compartiment ${issue.compartmentNo} de ${issue.plate} doit être rempli entièrement.`
        : `Compartment ${issue.compartmentNo} of ${issue.plate} must be filled completely.`
    case 'equipmentMissing':
      return fr
        ? `${issue.point} : équipement exigé absent sur ${issue.plate}.`
        : `${issue.point}: required equipment missing on ${issue.plate}.`
    case 'unplaced':
      return issue.requestNo
  }
}

export function preparationApi(
  db: MockDatabase,
  row: LoadingPreparationRow
): LoadingPreparationApi {
  const lines = requestLinesOf(db, row.requestNos)
  const byKey = new Map(lines.map((line) => [lineKey(line.requestNo, line.requestLineNo), line]))
  const names = new Map(
    db.employees
      .all()
      .map((employee) => [employee.no, `${employee.firstName} ${employee.lastName}`])
  )
  const vehicles: PreparationVehicleApi[] = row.vehicles.map((vehicle) => {
    const compartments = compartmentsOfVehicle(db, vehicle).map((compartment) => ({
      ...compartment,
      usedL: row.plan
        .filter(
          (entry) => entry.vehicleNo === vehicle.vehicleNo && entry.compartmentNo === compartment.no
        )
        .filter((entry) => byKey.get(lineKey(entry.requestNo, entry.requestLineNo))?.litres)
        .reduce((sum, entry) => sum + entry.quantity, 0)
    }))
    const known = compartments.filter((c) => c.volumeL !== null)
    return {
      ...vehicle,
      plate: plateOf(db, vehicle.vehicleNo),
      trailerPlate: plateOf(db, vehicle.trailerNo),
      driverName: vehicle.driverNo ? (names.get(vehicle.driverNo) ?? vehicle.driverNo) : '',
      capacityL: known.length ? known.reduce((sum, c) => sum + (c.volumeL ?? 0), 0) : null,
      compartments
    }
  })
  const units = new Map<string, number>()
  for (const line of lines) units.set(line.unit, (units.get(line.unit) ?? 0) + line.quantity)
  return {
    no: row.no,
    depotSiteNo: row.depotSiteNo,
    depotName: db.sites.find(row.depotSiteNo)?.name ?? row.depotSiteNo,
    loadingDate: row.loadingDate,
    validUntil: row.validUntil,
    region: row.region,
    status: row.status,
    validatedAt: row.validatedAt ?? null,
    requestNos: row.requestNos,
    vehicles,
    requestLines: lines.map((line) => ({
      requestNo: line.requestNo,
      requestLineNo: line.requestLineNo,
      recipientName: line.recipientName,
      deliveryPointName: line.deliveryPointName,
      productNo: line.productNo,
      productName: line.productName,
      unit: line.unit,
      quantity: line.quantity,
      placed: row.plan
        .filter(
          (entry) =>
            entry.requestNo === line.requestNo && entry.requestLineNo === line.requestLineNo
        )
        .reduce((sum, entry) => sum + entry.quantity, 0)
    })),
    plan: row.plan,
    totals: {
      byUnit: [...units].map(([unit, quantity]) => ({ unit, quantity })),
      quantityL: lines.filter((line) => line.litres).reduce((sum, line) => sum + line.quantity, 0),
      capacityL: vehicles.reduce((sum, vehicle) => sum + (vehicle.capacityL ?? 0), 0)
    },
    issues: issuesOf(db, row, lines),
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    modifiedAt: row.modifiedAt,
    modifiedBy: row.modifiedBy
  }
}

const pending = (db: MockDatabase, no: string) => {
  const request = db.deliveryRequests.find(no)
  return !!request && deliveryRequestStatus(request, todayIso()) === 'pending'
}

/** Requests already held by another pending preparation are not offered twice. */
function heldElsewhere(db: MockDatabase, requestNo: string, except: string | null) {
  return db.loadingPreparations
    .all()
    .some(
      (row) => row.no !== except && row.status === 'pending' && row.requestNos.includes(requestNo)
    )
}

function readHeader(db: MockDatabase, body: Record<string, unknown>, except: string | null) {
  const depotSiteNo = readString(body, 'depotSiteNo')
  if (!depotSiteNo || !db.sites.find(depotSiteNo))
    throw unprocessable(PLANNING_MESSAGES.prepDepotRequired)
  const loadingDate = readDate(body, 'loadingDate', { required: true })!
  const validUntil = readDate(body, 'validUntil')
  if (validUntil && validUntil < loadingDate) throw invalidField('validUntil')
  const region = readString(body, 'region')
  const requestNos = readStringList(body, 'requestNos')
  for (const no of requestNos) {
    if (!pending(db, no) || heldElsewhere(db, no, except)) {
      throw conflict(PLANNING_MESSAGES.prepRequestNotPending, { no })
    }
  }
  const raw = Array.isArray(body.vehicles) ? body.vehicles : []
  const vehicles: PreparationVehicleInput[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') throw invalidField('vehicles')
    const entry = item as Record<string, unknown>
    const vehicleNo = readString(entry, 'vehicleNo')
    if (!db.vehicles.find(vehicleNo)) throw invalidField('vehicles')
    const trailerNo = readString(entry, 'trailerNo') || null
    if (trailerNo && !db.vehicles.find(trailerNo)) throw invalidField('vehicles')
    const driverNo = readString(entry, 'driverNo') || null
    if (driverNo && !db.employees.find(driverNo)) throw invalidField('vehicles')
    const routeTemplateNo = readString(entry, 'routeTemplateNo') || null
    if (routeTemplateNo && !db.routeTemplates.find(routeTemplateNo)) throw invalidField('vehicles')
    const departureTime = readString(entry, 'departureTime') || '06:00'
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(departureTime)) throw invalidField('vehicles')
    const plate = plateOf(db, trailerNo) || plateOf(db, vehicleNo)
    // The vehicle drives: a tanker or a semi-trailer comes as the trailer of a tractor.
    const type = db.vehicleTypes.find(db.vehicles.find(vehicleNo)!.vehicleTypeNo)
    if (!type?.motorized) throw unprocessable(PLANNING_MESSAGES.prepVehicleNotMotorized, { plate })
    if (vehicles.some((v) => v.vehicleNo === vehicleNo)) {
      throw unprocessable(PLANNING_MESSAGES.prepVehicleTwice, { plate })
    }
    if (!goodsCarriers(db, vehicleNo, trailerNo).length) {
      throw unprocessable(PLANNING_MESSAGES.prepVehicleNoGoods, { plate })
    }
    vehicles.push({ vehicleNo, trailerNo, driverNo, routeTemplateNo, departureTime })
  }
  return { depotSiteNo, loadingDate, validUntil, region, requestNos, vehicles }
}

/** Reads and checks a plan: every entry on a vehicle, a compartment and a line of the preparation. */
function readPlan(
  db: MockDatabase,
  row: LoadingPreparationRow,
  raw: unknown,
  language: MockLanguage
): PlanEntry[] {
  if (!Array.isArray(raw)) throw invalidField('entries')
  const lines = new Map(
    requestLinesOf(db, row.requestNos).map((line) => [
      lineKey(line.requestNo, line.requestLineNo),
      line
    ])
  )
  const entries: PlanEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') throw invalidField('entries')
    const entry = item as Record<string, unknown>
    const vehicleNo = readString(entry, 'vehicleNo')
    const compartmentNo = readNumber(entry, 'compartmentNo', { required: true, min: 1 }) ?? 0
    const requestNo = readString(entry, 'requestNo')
    const requestLineNo = readNumber(entry, 'requestLineNo', { required: true, min: 1 }) ?? 0
    const quantity = readNumber(entry, 'quantity', { required: true, min: 0 }) ?? 0
    const vehicle = row.vehicles.find((v) => v.vehicleNo === vehicleNo)
    if (
      !vehicle ||
      !lines.has(lineKey(requestNo, requestLineNo)) ||
      !compartmentsOfVehicle(db, vehicle).some((c) => c.no === compartmentNo)
    ) {
      throw unprocessable(PLANNING_MESSAGES.prepEntryUnknown)
    }
    if (quantity > 0) entries.push({ vehicleNo, compartmentNo, requestNo, requestLineNo, quantity })
  }
  for (const line of lines.values()) {
    const placed = entries
      .filter((e) => e.requestNo === line.requestNo && e.requestLineNo === line.requestLineNo)
      .reduce((sum, e) => sum + e.quantity, 0)
    if (placed > line.quantity) {
      throw unprocessable(PLANNING_MESSAGES.prepOverRequest, {
        no: line.requestNo,
        quantity: line.quantity,
        unit: line.unit
      })
    }
  }
  for (const vehicle of row.vehicles) {
    const broken = brokenRule(db, language, vehicle, entries, lines)
    if (broken) throw unprocessable({ fr: broken, en: broken })
  }
  return entries
}

/**
 * A first sharing to correct afterwards: the largest lines first, each in the first vehicle
 * and compartments that accept it without breaking a rule. What finds no room stays to share.
 */
function propose(db: MockDatabase, row: LoadingPreparationRow): PlanEntry[] {
  const lines = requestLinesOf(db, row.requestNos)
  const byKey = new Map(lines.map((line) => [lineKey(line.requestNo, line.requestLineNo), line]))
  const entries: PlanEntry[] = []
  const ordered = [...lines].sort((a, b) => b.quantity - a.quantity)
  for (const line of ordered) {
    let left = line.quantity
    for (const vehicle of row.vehicles) {
      if (left <= 0) break
      for (const compartment of compartmentsOfVehicle(db, vehicle)) {
        if (left <= 0) break
        const used = entries
          .filter((e) => e.vehicleNo === vehicle.vehicleNo && e.compartmentNo === compartment.no)
          .filter((e) => byKey.get(lineKey(e.requestNo, e.requestLineNo))?.litres)
          .reduce((sum, e) => sum + e.quantity, 0)
        const room = line.litres && compartment.volumeL !== null ? compartment.volumeL - used : left
        if (room <= 0) continue
        const take = Math.min(room, left)
        const tried = [
          ...entries,
          {
            vehicleNo: vehicle.vehicleNo,
            compartmentNo: compartment.no,
            requestNo: line.requestNo,
            requestLineNo: line.requestLineNo,
            quantity: take
          }
        ]
        if (brokenRule(db, 'fr', vehicle, tried, byKey)) continue
        entries.push(tried[tried.length - 1]!)
        left -= take
      }
    }
  }
  // One entry per compartment and line.
  const merged = new Map<string, PlanEntry>()
  for (const entry of entries) {
    const key = `${entry.vehicleNo}|${entry.compartmentNo}|${entry.requestNo}|${entry.requestLineNo}`
    const seen = merged.get(key)
    merged.set(key, seen ? { ...seen, quantity: seen.quantity + entry.quantity } : entry)
  }
  return [...merged.values()]
}

export function registerLoadingPreparationHandlers(router: MockRouter, db: MockDatabase): void {
  const editable = (no: string) => {
    const row = db.loadingPreparations.findOrFail(no)
    if (row.status !== 'pending') throw conflict(PLANNING_MESSAGES.prepValidated)
    return row
  }

  router.get(BASE, { feature: FEATURE, action: 'read' }, () =>
    ok(
      db.loadingPreparations
        .all()
        .sort((a, b) => b.no.localeCompare(a.no))
        .map((row) => preparationApi(db, row))
    )
  )

  router.get(`${BASE}/options`, { feature: FEATURE, action: 'read' }, (request) => {
    const except = request.query?.except ? String(request.query.except) : null
    const types = new Map(db.vehicleTypes.all().map((type) => [type.no, type]))
    const options: PreparationOptionsApi = {
      depots: db.sites
        .all()
        .filter((site) => site.siteTypeNo === 'DEPOT')
        .map((site) => ({ no: site.no, name: site.name, region: site.region })),
      regions: [
        ...new Set(
          db.sites
            .all()
            .map((site) => site.region)
            .filter((r) => r)
        )
      ].sort(),
      requests: db.deliveryRequests
        .all()
        .filter((row) => pending(db, row.no) && !heldElsewhere(db, row.no, except))
        .map((row) => {
          const point = db.deliveryPoints.find(row.deliveryPointNo)
          const lines = requestLines(row)
          return {
            no: row.no,
            recipientName: point ? (db.customers.find(point.customerNo)?.name ?? '') : '',
            deliveryPointName: point?.name ?? '',
            region: requestPlace(db, row.deliveryPointNo).regions[0] ?? '',
            desiredDate: row.desiredDate,
            summary: lines
              .map((line) => {
                const product = db.products.find(line.productNo)
                return `${product?.name ?? line.productNo} ${line.quantity} ${product?.unit ?? ''}`.trim()
              })
              .join(', ')
          }
        }),
      vehicles: db.vehicles.all().map((vehicle) => ({
        no: vehicle.no,
        plate: vehicle.plate,
        typeName: types.get(vehicle.vehicleTypeNo)?.name ?? '',
        carriesGoods: types.get(vehicle.vehicleTypeNo)?.carriesGoods ?? false
      })),
      // Only the drivers who may drive today are offered (licence, documents, status).
      drivers: driverEmployees(db)
        .filter((employee) => !driverIneligibility(driverFacts(db, employee, todayIso())).length)
        .map((employee) => ({
          no: employee.no,
          name: `${employee.firstName} ${employee.lastName}`
        })),
      routes: db.routeTemplates
        .all()
        .filter((route) => route.active)
        .map((route) => ({ no: route.no, name: route.name }))
    }
    return ok(options)
  })

  router.get(`${BASE}/:no`, { feature: FEATURE, action: 'read' }, (request) =>
    ok(preparationApi(db, db.loadingPreparations.findOrFail(routeParam(request, 'no'))))
  )

  /* A new preparation is pending (TRS01-US20). */
  router.post(BASE, { feature: FEATURE, action: 'insert' }, (request) => {
    const header = readHeader(db, readBody(request), null)
    const no = nextNo(
      db.loadingPreparations.all().map((row) => row.no),
      'PRP-',
      4
    )
    const row = stampCreated<LoadingPreparationRow>(
      { no, ...header, status: 'pending', plan: [] },
      request
    )
    db.loadingPreparations.insert(row)
    return ok(preparationApi(db, row))
  })

  /* The header, the orders and the vehicles change while pending; the plan keeps what still fits. */
  router.patch(`${BASE}/:no`, { feature: FEATURE, action: 'update' }, (request) => {
    const row = editable(routeParam(request, 'no'))
    const header = readHeader(db, readBody(request), row.no)
    const plan = row.plan.filter(
      (entry) =>
        header.requestNos.includes(entry.requestNo) &&
        header.vehicles.some((vehicle) => vehicle.vehicleNo === entry.vehicleNo)
    )
    db.loadingPreparations.update(row.no, { ...header, plan, ...stampModified(request) })
    return ok(preparationApi(db, db.loadingPreparations.findOrFail(row.no)))
  })

  /* Validating freezes the plan: each vehicle with orders becomes a transport order planned
   * with its driver, who is notified; its pickup note and the delivery notes follow from the
   * order (TRS01-US23). Orders left out of the plan stay pending. */
  router.post(`${BASE}/:no/validate`, { feature: FEATURE, action: 'update' }, (request) => {
    const row = editable(routeParam(request, 'no'))
    const language = toMockLanguage(request.language)
    const lines = requestLinesOf(db, row.requestNos)
    // What the vehicles cannot take stays pending; a broken rule on the plan blocks.
    const blocking = issuesOf(db, row, lines).filter(
      (issue) => issue.code !== 'unplaced' && issue.code !== 'overCapacity'
    )
    if (blocking.length) {
      throw unprocessable(PLANNING_MESSAGES.prepNotValidable, {
        details: blocking.map((issue) => issueLabel(language, issue)).join(' ')
      })
    }
    if (!row.plan.length) throw unprocessable(PLANNING_MESSAGES.prepEmptyPlan)
    // A request becomes an order line only whole and on one vehicle.
    const byRequest = new Map<string, Set<string>>()
    for (const entry of row.plan) {
      byRequest.set(
        entry.requestNo,
        (byRequest.get(entry.requestNo) ?? new Set()).add(entry.vehicleNo)
      )
    }
    for (const [requestNo, vehicles] of byRequest) {
      const full = lines
        .filter((line) => line.requestNo === requestNo)
        .every(
          (line) =>
            row.plan
              .filter((e) => e.requestNo === requestNo && e.requestLineNo === line.requestLineNo)
              .reduce((sum, e) => sum + e.quantity, 0) === line.quantity
        )
      if (vehicles.size > 1 || !full) {
        throw unprocessable(PLANNING_MESSAGES.prepRequestSpread, { no: requestNo })
      }
    }
    const used = row.vehicles.filter((vehicle) =>
      row.plan.some((e) => e.vehicleNo === vehicle.vehicleNo)
    )
    for (const vehicle of used) {
      if (!vehicle.driverNo || !vehicle.routeTemplateNo) {
        throw unprocessable(PLANNING_MESSAGES.prepVehicleIncomplete, {
          plate: plateOf(db, vehicle.trailerNo) || plateOf(db, vehicle.vehicleNo)
        })
      }
    }
    const vehicles = row.vehicles.map((vehicle) => {
      if (!used.includes(vehicle)) return vehicle
      const requests = [...byRequest]
        .filter(([, set]) => set.has(vehicle.vehicleNo))
        .map(([no]) => ({
          no,
          lineNos: lines.filter((line) => line.requestNo === no).map((line) => line.requestLineNo)
        }))
      const orderNo = createPlannedOrder(db, request, {
        requests,
        routeTemplateNo: vehicle.routeTemplateNo!,
        plannedDeparture: `${row.loadingDate}T${vehicle.departureTime ?? '06:00'}:00`,
        vehicleNo: vehicle.vehicleNo,
        trailerNo: vehicle.trailerNo,
        driverNo: vehicle.driverNo!,
        comment: row.no
      })
      return { ...vehicle, orderNo }
    })
    db.loadingPreparations.update(row.no, {
      status: 'validated',
      validatedAt: nowIsoDateTime(),
      vehicles,
      ...stampModified(request)
    })
    return ok(preparationApi(db, db.loadingPreparations.findOrFail(row.no)))
  })

  router.post(`${BASE}/:no/propose`, { feature: FEATURE, action: 'update' }, (request) => {
    const row = editable(routeParam(request, 'no'))
    db.loadingPreparations.update(row.no, { plan: propose(db, row), ...stampModified(request) })
    return ok(preparationApi(db, db.loadingPreparations.findOrFail(row.no)))
  })

  /* A correction that breaks a rule is refused with the rule; an unfinished plan is saved and
   * the preparation stays pending (TRS01-US22). */
  router.put(`${BASE}/:no/plan`, { feature: FEATURE, action: 'update' }, (request) => {
    const row = editable(routeParam(request, 'no'))
    const plan = readPlan(db, row, readBody(request).entries, toMockLanguage(request.language))
    db.loadingPreparations.update(row.no, { plan, ...stampModified(request) })
    return ok(preparationApi(db, db.loadingPreparations.findOrFail(row.no)))
  })
}
