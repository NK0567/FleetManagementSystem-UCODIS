import { CHECKLIST_STAGES } from '@/modules/fleet/road-checklists/types/roadChecklist.types'
import { pickTour, stopRank } from '@/modules/self-service/domain/myspace'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { TripRow } from '../../fixtures/fleet/trips'
import type { RoadChecklistRow } from '../../fixtures/fleet/roadChecklists'
import { stampCreated, readBody } from '../../http/crudResource'
import { conflict, notFound, unprocessable } from '../../http/errors'
import { readDateTime, readEnum } from '../../http/input'
import { created, ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { activeCheckPoints, readCheckResults } from '../fleet/checkPoints'
import { FLEET_MESSAGES } from '../fleet/messages'
import { SELF_SERVICE_MESSAGES } from './messages'

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

export function registerTourHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/me/tour', { feature: 'MYSPACE' }, (request) => {
    const user = sessionUser(request)
    if (!user.employeeNo) throw notFound(SELF_SERVICE_MESSAGES.noEmployee)
    return ok(myTour(db, user.employeeNo))
  })

  router.post('/me/checklist', { feature: 'MYSPACE', action: 'execute' }, (request) => {
    const user = sessionUser(request)
    if (!user.employeeNo) throw notFound(SELF_SERVICE_MESSAGES.noEmployee)
    const trip = pickTour(driverTrips(db, user.employeeNo))
    if (!trip) throw notFound(SELF_SERVICE_MESSAGES.noTour)
    if (trip.status === 'closed' || trip.status === 'cancelled') {
      throw conflict(FLEET_MESSAGES.checklistTripOver)
    }
    const input = readBody(request)
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
        results: readCheckResults(db, input, 'vehicle')
      },
      request
    )
    return created(db.roadChecklists.insert(row))
  })
}
