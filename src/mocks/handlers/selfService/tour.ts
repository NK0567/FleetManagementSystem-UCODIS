import { CHECKLIST_STAGES } from '@/modules/fleet/road-checklists/types/roadChecklist.types'
import { pickTour, stopRank } from '@/modules/self-service/domain/myspace'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { TripRow } from '../../fixtures/fleet/trips'
import type { RoadChecklistRow } from '../../fixtures/fleet/roadChecklists'
import { stampCreated, readBody } from '../../http/crudResource'
import { conflict, notFound, unprocessable } from '../../http/errors'
import { invalidField, readDateTime, readEnum, readString } from '../../http/input'
import { created, ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { activeCheckPoints, readCheckResults } from '../fleet/checkPoints'
import { FLEET_MESSAGES } from '../fleet/messages'
import { readDriverSignature } from '../fleet/roadChecklists'
import { gapReference, toBringBack } from '../planning/execution'
import { planningSettings } from '../planning/settings'
import { transportOrdersApi } from '../planning/transportOrders'
import { SELF_SERVICE_MESSAGES } from './messages'

/** Longest name of a stopping place the phone may send. */
const MAX_LOCATION = 120

/** Where the driver took the checklist: optional, a short free text such as « Relais Moramanga ». */
function readStopLocation(input: Record<string, unknown>): string {
  const location = readString(input, 'location')
  if (location.length > MAX_LOCATION) throw invalidField('location')
  return location
}

function driverTrips(db: MockDatabase, employeeNo: string): TripRow[] {
  return db.trips.all().filter((trip) => trip.driverNo === employeeNo)
}

export function myTour(db: MockDatabase, employeeNo: string) {
  const trip = pickTour(driverTrips(db, employeeNo))
  if (!trip) return null
  const sites = new Map(db.sites.all().map((site) => [site.no, site]))
  const vehicle = db.vehicles.find(trip.vehicleNo)
  const authorization = db.departureAuthorizations.all().find((row) => row.tripNo === trip.no)
  const stopCities = trip.stops.map((stop) => sites.get(stop.siteNo)?.city ?? '')
  const lines = db.transportOrders
    .all()
    .filter((order) => order.tripNo === trip.no && !order.cancelledAt)
    .flatMap((order) =>
      order.lines.map((line) => {
        const point = db.deliveryPoints.find(line.deliveryPointNo)
        const product = db.products.find(line.productNo)
        return {
          orderNo: order.no,
          lineNo: line.lineNo,
          deliveryRequestNo: line.deliveryRequestNo,
          deliveryPointNo: line.deliveryPointNo,
          deliveryPointName: point?.name ?? line.deliveryPointNo,
          city: point?.city ?? '',
          latitude: point?.latitude ?? null,
          longitude: point?.longitude ?? null,
          productName: product?.name ?? line.productNo,
          quantity: line.quantity
        }
      })
    )
    .sort(
      (a, b) => stopRank(a.city, stopCities) - stopRank(b.city, stopCities) || a.lineNo - b.lineNo
    )

  return {
    tripNo: trip.no,
    status: trip.status,
    plannedDeparture: trip.plannedDeparture,
    vehiclePlate: vehicle?.plate ?? trip.vehicleNo,
    departureDecision: authorization?.decision ?? null,
    stops: trip.stops.map((stop) => {
      const site = sites.get(stop.siteNo)
      return {
        siteNo: stop.siteNo,
        name: site?.name ?? stop.siteNo,
        role: stop.role,
        city: site?.city ?? '',
        latitude: site?.latitude ?? null,
        longitude: site?.longitude ?? null,
        passedAt: stop.passedAt
      }
    }),
    lines,
    checkPoints: activeCheckPoints(db, 'vehicle').map((point) => ({
      no: point.no,
      label: point.label,
      blocking: point.blocking
    }))
  }
}

/**
 * The transport orders of the driver's current trip, as he works them (TRS03-US05 to US14): the
 * lines in their execution order, each with its recipient, address and content; a line taken out
 * before loading is not his, a line not loaded stays shown with its status.
 */
export function myOrders(db: MockDatabase, employeeNo: string) {
  const trip = pickTour(driverTrips(db, employeeNo))
  if (!trip) return []
  const reasons = (kind: string) =>
    db.planningReasons
      .all()
      .filter((reason) => reason.kind === kind && reason.active)
      .map((reason) => ({ no: reason.no, name: reason.name }))
  return transportOrdersApi(db)
    .filter((order) => order.tripNo === trip.no && order.status !== 'cancelled')
    .map((order) => {
      const row = db.transportOrders.findOrFail(order.no)
      const lines = row.lines
        .filter((line) => !line.unavailableAt && !line.replannedAt)
        .map((line) => {
          const point = db.deliveryPoints.find(line.deliveryPointNo)
          const recipient = point ? db.customers.find(point.customerNo) : undefined
          const product = db.products.find(line.productNo)
          return {
            lineNo: line.lineNo,
            deliveryPointNo: line.deliveryPointNo,
            deliveryPointName: point?.name ?? line.deliveryPointNo,
            recipientName: recipient?.name ?? '',
            address: [point?.address, point?.city].filter(Boolean).join(', '),
            productName: product?.name ?? line.productNo,
            unit: product?.unit ?? '',
            quantity: line.quantity,
            loadedQuantity: line.loadedQuantity,
            conformingAt: line.conformingAt,
            nonconformityAt: line.nonconformityAt,
            arrivedAt: line.arrivedAt ?? null,
            declaredAt: line.declaredAt,
            receivedQuantity: line.receivedQuantity,
            refusalAt: line.refusalAt,
            postponedAt: line.postponedAt,
            returnedAt: line.returnedAt,
            handedBackAt: line.handedBackAt,
            receptionConfirmedAt: line.receptionConfirmedAt,
            receptionContestedAt: line.receptionContestedAt,
            isFuel: !!product?.isFuel,
            undeliveredReasonNo: line.undeliveredReasonNo ?? null,
            nonconformityReason: [
              db.planningReasons.find(line.nonconformityReasonNo ?? '')?.name ?? '',
              line.nonconformityComment
            ]
              .filter(Boolean)
              .join(' · '),
            refusalByRecipient: line.refusalBy === 'recipient',
            goodsBackAt: line.handedBackAt ?? line.warehouseReceivedAt ?? null,
            remainderAt: line.remainderAt ?? null,
            // What the delivered quantity is compared with, to ask a justification (TRS03-US16).
            tolerance: gapReference(db, row, line)
          }
        })
      return {
        no: order.no,
        status: order.status,
        plannedDeparture: order.plannedDeparture,
        routeName: order.routeName,
        vehiclePlate: order.vehiclePlate,
        trailerPlate: order.trailerPlate,
        compartmentPlan: order.compartmentPlan,
        overToleranceMode: planningSettings(db).quantities.overToleranceMode,
        lines,
        reasons: {
          nonconformity: reasons('nonconformity'),
          postponement: reasons('postponement'),
          refusal: reasons('delivery_refusal')
        }
      }
    })
}

/**
 * What the driver still has to bring back to the warehouse, from all his orders, even completed
 * ones, until he confirms he brought it back (TRS03-US11).
 */
export function myReturns(db: MockDatabase, employeeNo: string) {
  const trips = new Set(
    db.trips
      .all()
      .filter((trip) => trip.driverNo === employeeNo)
      .map((trip) => trip.no)
  )
  return db.transportOrders
    .all()
    .filter((order) => order.tripNo && trips.has(order.tripNo))
    .flatMap((order) =>
      order.lines.filter(toBringBack).map((line) => {
        const product = db.products.find(line.productNo)
        const point = db.deliveryPoints.find(line.deliveryPointNo)
        const reasonNo =
          line.refusalReasonNo ?? line.undeliveredReasonNo ?? line.postponementReasonNo
        return {
          orderNo: order.no,
          lineNo: line.lineNo,
          productName: product?.name ?? line.productNo,
          unit: product?.unit ?? '',
          quantity: line.loadedQuantity ?? line.quantity,
          deliveryPointName: point?.name ?? line.deliveryPointNo,
          reason: (reasonNo && db.planningReasons.find(reasonNo)?.name) || ''
        }
      })
    )
}

export function registerTourHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/me/returns', { feature: 'MYSPACE', action: 'read' }, (request) => {
    const user = sessionUser(request)
    if (!user.employeeNo) return ok([])
    return ok(myReturns(db, user.employeeNo))
  })

  router.get('/me/orders', { feature: 'MYSPACE' }, (request) => {
    const user = sessionUser(request)
    if (!user.employeeNo) throw notFound(SELF_SERVICE_MESSAGES.noEmployee)
    return ok(myOrders(db, user.employeeNo))
  })

  router.get('/me/tour', { feature: 'MYSPACE' }, (request) => {
    const user = sessionUser(request)
    if (!user.employeeNo) throw notFound(SELF_SERVICE_MESSAGES.noEmployee)
    return ok(myTour(db, user.employeeNo))
  })

  router.post('/me/checklist', { feature: 'MYSPACE', action: 'execute' }, (request) => {
    const user = sessionUser(request)
    if (!user.employeeNo) throw notFound(SELF_SERVICE_MESSAGES.noEmployee)
    const input = readBody(request)
    // A checklist kept on the phone without network names its trip: it must be one of the driver's.
    const ownTrips = driverTrips(db, user.employeeNo)
    const named = typeof input.tripNo === 'string' && input.tripNo ? input.tripNo : null
    const trip = named ? ownTrips.find((row) => row.no === named) : pickTour(ownTrips)
    if (!trip) throw notFound(SELF_SERVICE_MESSAGES.noTour)
    if (trip.status === 'closed' || trip.status === 'cancelled') {
      throw conflict(FLEET_MESSAGES.checklistTripOver)
    }
    const takenAt = readDateTime(input, 'takenAt', { required: true }) ?? ''
    if (takenAt > nowIsoDateTime()) throw unprocessable(FLEET_MESSAGES.dateInFuture)
    const row = stampCreated<RoadChecklistRow>(
      {
        no: nextNo(
          db.roadChecklists.all().map((checklist) => checklist.no),
          'CKL-',
          5
        ),
        tripNo: trip.no,
        stage: readEnum(input, 'stage', CHECKLIST_STAGES, { required: true }) ?? 'departure',
        takenAt,
        location: readStopLocation(input),
        results: readCheckResults(db, input, 'vehicle'),
        ...readDriverSignature(input, takenAt)
      },
      request
    )
    return created(db.roadChecklists.insert(row))
  })
}
