import { emptyFollowUp } from '@/modules/planning/customer-confirmations/domain/confirmation'
import { emptyDossier } from '@/modules/planning/closing/domain/closing'
import { emptyQuality } from '@/modules/planning/delivery-quality/domain/quality'
import {
  emptyMeasureIssue,
  planCovers,
  planIssue,
  volumeAt15,
  type PlanSlot
} from '@/modules/planning/fuel-tours/domain/fuel'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { FuelBlRow, FuelCompartmentRow, FuelTourRow } from '../../fixtures/planning/fuelTours'
import { readBody, routeParam, stampCreated, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readDate, readNumber, readString, readStringList } from '../../http/input'
import { requireReference } from '../../http/references'
import { created, ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { PLANNING_MESSAGES } from './messages'
import { planningSettings } from './settings'
import { nextTransportOrderNo } from './transportOrders'

const FEATURE = 'FUELTOUR'

function yearNo(existing: string[], prefix: string): string {
  return nextNo(existing, `${prefix}-${todayIso().slice(0, 4)}-`, 4)
}

function tourOf(db: MockDatabase, request: MockRequest): FuelTourRow {
  return db.fuelTours.findOrFail(routeParam(request, 'no'))
}

function assertDraft(tour: FuelTourRow): void {
  if (tour.validatedAt || tour.cancelledAt) throw conflict(PLANNING_MESSAGES.fuelTourClosed)
}

function slotsOf(db: MockDatabase, compartments: FuelCompartmentRow[]): PlanSlot[] {
  return compartments.map((slot) => {
    const request = db.deliveryRequests.findOrFail(slot.deliveryRequestNo)
    const vehicle = db.vehicles.findOrFail(slot.vehicleNo)
    const compartment = vehicle.compartments.find((item) => item.no === slot.compartmentNo)
    if (!compartment) throw unprocessable(PLANNING_MESSAGES.fuelCompartment)
    return {
      ...slot,
      capacityL: compartment.volumeL,
      requestProductNo: request.productNo,
      requestQuantity: request.quantity
    }
  })
}

export function registerFuelTourHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/planning/fuel-tours', { feature: FEATURE, action: 'read' }, () =>
    ok(
      db.fuelTours.all().map((tour) => ({
        ...tour,
        depotName: db.sites.find(tour.depotNo)?.name ?? null,
        bls: tour.bls.map((bl) => ({
          ...bl,
          vehiclePlate: db.vehicles.find(bl.vehicleNo)?.plate ?? null,
          productName: db.products.find(bl.productNo)?.name ?? null
        }))
      }))
    )
  )

  router.post('/planning/fuel-tours', { feature: FEATURE, action: 'execute' }, (request) => {
    const body = readBody(request)
    const depotNo = requireReference(db.sites, body, 'depotNo')
    const depot = db.sites.findOrFail(depotNo)
    if (depot.siteTypeNo !== 'DEPOT' || !depot.active)
      throw unprocessable(PLANNING_MESSAGES.fuelDepot)
    const date = readDate(body, 'date', { required: true }) ?? ''
    const validUntil = readDate(body, 'validUntil', { required: true }) ?? ''
    if (date < todayIso()) throw unprocessable(PLANNING_MESSAGES.fuelDate)
    if (validUntil < date) throw unprocessable(PLANNING_MESSAGES.fuelValidity)
    const requestNos = readStringList(body, 'requestNos')
    if (!requestNos.length) throw unprocessable(PLANNING_MESSAGES.fuelRequests)
    for (const no of requestNos) {
      const row = db.deliveryRequests.findOrFail(no)
      const product = db.products.findOrFail(row.productNo)
      if (!product.isFuel || row.transportOrderNo || row.cancelledAt) {
        throw unprocessable(PLANNING_MESSAGES.fuelRequest)
      }
    }
    const no = yearNo(
      db.fuelTours.all().map((tour) => tour.no),
      'FT'
    )
    const row = stampCreated<FuelTourRow>(
      {
        no,
        depotNo,
        date,
        validUntil,
        requestNos,
        compartments: [],
        bls: [],
        voucher: null,
        orderNos: [],
        validatedAt: null,
        cancelledAt: null
      },
      request
    )
    db.fuelTours.insert(row)
    return created(row)
  })

  router.put(
    '/planning/fuel-tours/:no/plan',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const tour = tourOf(db, request)
      assertDraft(tour)
      const raw = readBody(request).compartments
      if (!Array.isArray(raw)) throw unprocessable(PLANNING_MESSAGES.fuelPlan)
      const compartments: FuelCompartmentRow[] = raw.map((item) => {
        if (!item || typeof item !== 'object') throw unprocessable(PLANNING_MESSAGES.fuelPlan)
        const record = item as Record<string, unknown>
        return {
          vehicleNo: requireReference(db.vehicles, record, 'vehicleNo'),
          compartmentNo: readNumber(record, 'compartmentNo', { required: true, min: 1 }) ?? 0,
          productNo: requireReference(db.products, record, 'productNo'),
          volumeL: readNumber(record, 'volumeL', { required: true, min: 0 }) ?? 0,
          deliveryRequestNo: requireReference(db.deliveryRequests, record, 'deliveryRequestNo')
        }
      })
      const issue = planIssue(slotsOf(db, compartments))
      if (issue) throw unprocessable(PLANNING_MESSAGES.fuelPlan)
      const updated = db.fuelTours.update(tour.no, { compartments, ...stampModified(request) })
      return ok(updated)
    }
  )

  router.post(
    '/planning/fuel-tours/:no/validate',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const tour = tourOf(db, request)
      assertDraft(tour)
      const requests = tour.requestNos.map((no) => db.deliveryRequests.findOrFail(no))
      if (!planCovers(tour.compartments, requests))
        throw unprocessable(PLANNING_MESSAGES.fuelLeftToLoad)
      const byVehicle = new Map<string, FuelCompartmentRow[]>()
      for (const slot of tour.compartments) {
        byVehicle.set(slot.vehicleNo, [...(byVehicle.get(slot.vehicleNo) ?? []), slot])
      }
      const bls: FuelBlRow[] = []
      const orderNos: string[] = []
      for (const [vehicleNo, slots] of byVehicle) {
        const orderNo = nextTransportOrderNo(db)
        const requestNos = [...new Set(slots.map((slot) => slot.deliveryRequestNo))]
        const lines = requestNos.map((requestNo, index) => {
          const source = db.deliveryRequests.findOrFail(requestNo)
          const volume = slots
            .filter((slot) => slot.deliveryRequestNo === requestNo)
            .reduce((sum, slot) => sum + slot.volumeL, 0)
          return {
            lineNo: index + 1,
            deliveryRequestNo: requestNo,
            deliveryPointNo: source.deliveryPointNo,
            productNo: source.productNo,
            quantity: volume,
            weightKg: null,
            ...emptyFollowUp(),
            ...emptyQuality()
          }
        })
        db.transportOrders.insert(
          stampCreated(
            {
              no: orderNo,
              routeTemplateNo: null,
              plannedDeparture: `${tour.date}T08:00:00`,
              comment: `${tour.no} ${vehicleNo}`,
              lines,
              means: null,
              tripNo: null,
              carrierNo: null,
              carrierVehiclePlate: '',
              carrierDriverName: '',
              carrierDepartedAt: null,
              carrierArrivedAt: null,
              cancellationReasonNo: null,
              cancellationComment: '',
              cancelledAt: null,
              cancelledBy: null,
              events: [
                {
                  at: nowIsoDateTime(),
                  by: sessionUser(request).code,
                  kind: 'created' as const,
                  detail: tour.no
                }
              ],
              ...emptyDossier()
            },
            request
          )
        )
        for (const requestNo of requestNos) {
          db.deliveryRequests.update(requestNo, { transportOrderNo: orderNo })
        }
        orderNos.push(orderNo)
        for (const slot of slots) {
          bls.push({
            no: yearNo(
              [
                ...db.fuelTours.all().flatMap((item) => item.bls.map((bl) => bl.no)),
                ...bls.map((bl) => bl.no)
              ],
              'BL'
            ),
            vehicleNo,
            compartmentNo: slot.compartmentNo,
            productNo: slot.productNo,
            volumeL: slot.volumeL,
            deliveryRequestNo: slot.deliveryRequestNo,
            status: 'issued',
            reason: ''
          })
        }
      }
      const voucher = {
        no: yearNo(
          db.fuelTours.all().flatMap((item) => (item.voucher ? [item.voucher.no] : [])),
          'BE'
        ),
        status: 'issued' as const,
        bslNo: '',
        measures: []
      }
      const updated = db.fuelTours.update(tour.no, {
        bls,
        orderNos,
        voucher,
        validatedAt: nowIsoDateTime(),
        ...stampModified(request)
      })
      return ok(updated)
    }
  )

  router.post(
    '/planning/fuel-tours/:no/confirm-pickup',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const tour = tourOf(db, request)
      if (!tour.voucher || tour.voucher.status !== 'issued')
        throw conflict(PLANNING_MESSAGES.fuelVoucher)
      const body = readBody(request)
      const bslNo = readString(body, 'bslNo', { required: true })
      const taken = db.fuelTours
        .all()
        .some((item) => item.voucher?.bslNo.toLowerCase() === bslNo.toLowerCase())
      if (taken) throw conflict(PLANNING_MESSAGES.fuelBsl)
      const raw = body.measures
      const measures = Array.isArray(raw)
        ? raw.map((item) => {
            const record = item as Record<string, unknown>
            const measure = {
              vehicleNo: readString(record, 'vehicleNo', { required: true }),
              compartmentNo: readNumber(record, 'compartmentNo', { required: true, min: 1 }) ?? 0,
              volumeL: readNumber(record, 'volumeL', { required: true, min: 0 }) ?? 0,
              temperature: readNumber(record, 'temperature'),
              volume15: readNumber(record, 'volume15'),
              emptyReason: readString(record, 'emptyReason')
            }
            if (emptyMeasureIssue(measure)) throw unprocessable(PLANNING_MESSAGES.fuelEmpty)
            const slot = tour.compartments.find(
              (compartment) =>
                compartment.vehicleNo === measure.vehicleNo &&
                compartment.compartmentNo === measure.compartmentNo
            )
            if (!slot || measure.volumeL > slot.volumeL)
              throw unprocessable(PLANNING_MESSAGES.fuelMeasure)
            const product = db.products.findOrFail(slot.productNo)
            return {
              ...measure,
              volume15: volumeAt15(
                measure,
                planningSettings(db).quantities.volume15Method,
                product.expansionCoefficient
              )
            }
          })
        : []
      const updated = db.fuelTours.update(tour.no, {
        voucher: { ...tour.voucher, status: 'confirmed', bslNo, measures },
        ...stampModified(request)
      })
      return ok(updated)
    }
  )

  router.post(
    '/planning/fuel-tours/:no/bls/:blNo/cancel',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const tour = tourOf(db, request)
      const blNo = routeParam(request, 'blNo')
      const bl = tour.bls.find((item) => item.no === blNo)
      if (!bl || bl.status !== 'issued') throw conflict(PLANNING_MESSAGES.fuelBl)
      const reason = readString(readBody(request), 'reason', { required: true })
      const bls = tour.bls.map((item) =>
        item.no === blNo ? { ...item, status: 'cancelled' as const, reason } : item
      )
      freeRequest(db, bl.deliveryRequestNo, bls)
      const updated = db.fuelTours.update(tour.no, { bls, ...stampModified(request) })
      return ok(updated)
    }
  )

  router.post(
    '/planning/fuel-tours/:no/bls/:blNo/deviate',
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const tour = tourOf(db, request)
      if (tour.voucher?.status !== 'confirmed') throw conflict(PLANNING_MESSAGES.fuelVoucher)
      const blNo = routeParam(request, 'blNo')
      const bl = tour.bls.find((item) => item.no === blNo)
      if (!bl || bl.status !== 'issued') throw conflict(PLANNING_MESSAGES.fuelBl)
      const body = readBody(request)
      const targetNo = requireReference(db.deliveryRequests, body, 'deliveryRequestNo')
      const target = db.deliveryRequests.findOrFail(targetNo)
      const reason = readString(body, 'reason', { required: true })
      if (
        target.productNo !== bl.productNo ||
        target.transportOrderNo ||
        target.cancelledAt ||
        target.quantity > bl.volumeL
      ) {
        throw unprocessable(PLANNING_MESSAGES.fuelDeviation)
      }
      const nextNoBl = yearNo(
        db.fuelTours.all().flatMap((item) => item.bls.map((itemBl) => itemBl.no)),
        'BL'
      )
      const bls: FuelBlRow[] = [
        ...tour.bls.map((item) =>
          item.no === blNo ? { ...item, status: 'deviated' as const, reason } : item
        ),
        {
          ...bl,
          no: nextNoBl,
          deliveryRequestNo: targetNo,
          volumeL: target.quantity,
          status: 'issued' as const,
          reason: ''
        }
      ]
      const orderNo = tour.orderNos.find(
        (no) => db.transportOrders.find(no)?.comment === `${tour.no} ${bl.vehicleNo}`
      )
      if (orderNo) {
        const order = db.transportOrders.findOrFail(orderNo)
        db.transportOrders.update(orderNo, {
          lines: [
            ...order.lines,
            {
              lineNo: order.lines.length + 1,
              deliveryRequestNo: targetNo,
              deliveryPointNo: target.deliveryPointNo,
              productNo: target.productNo,
              quantity: target.quantity,
              weightKg: null,
              ...emptyFollowUp(),
              ...emptyQuality()
            }
          ]
        })
        db.deliveryRequests.update(targetNo, { transportOrderNo: orderNo })
      }
      freeRequest(db, bl.deliveryRequestNo, bls)
      const updated = db.fuelTours.update(tour.no, { bls, ...stampModified(request) })
      return ok(updated)
    }
  )
}

function freeRequest(db: MockDatabase, requestNo: string, bls: FuelBlRow[]): void {
  const still = bls.some((bl) => bl.deliveryRequestNo === requestNo && bl.status === 'issued')
  if (still) return
  const request = db.deliveryRequests.find(requestNo)
  if (request?.transportOrderNo) db.deliveryRequests.update(requestNo, { transportOrderNo: null })
}
