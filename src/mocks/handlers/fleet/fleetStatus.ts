import { fleetState, fleetStateGroup } from '@/modules/fleet/fleet-status/domain/fleetState'
import type {
  FleetStatusApi,
  FleetStatusDay
} from '@/modules/fleet/fleet-status/types/fleetStatus.types'
import { isValidCalendarDateYmd } from '@/utils/calendarDate'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { TripRow } from '../../fixtures/fleet/trips'
import {
  readBody,
  registerListResource,
  routeParam,
  stampCreated,
  stampModified
} from '../../http/crudResource'
import { unprocessable } from '../../http/errors'
import { readDate, readString } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import type { MockRequest } from '../../http/types'
import { localize, localizeDay, type LocalizedText, type MockLanguage } from '../../i18n'
import { activeLinks, coupledWith, employeeNames, vehiclePlates } from './links'
import { FLEET_MESSAGES } from './messages'
import { statusReason, vehicleStatuses } from './vehicleState'

const MAX_OBSERVATION = 500

const MISSION: Record<'onRoad' | 'planned', LocalizedText> = {
  onRoad: { fr: '{route} · en route vers {site}', en: '{route} · heading to {site}' },
  planned: { fr: '{route} · départ le {date}', en: '{route} · leaves on {date}' }
}

/** The trip on the road of a vehicle, or else its next planned one. */
function currentTrip(trips: TripRow[], vehicleNo: string): TripRow | undefined {
  const own = trips.filter((trip) => trip.vehicleNo === vehicleNo)
  return (
    own.find((trip) => trip.status === 'in_progress') ??
    own
      .filter((trip) => trip.status === 'planned')
      .sort((a, b) => a.plannedDeparture.localeCompare(b.plannedDeparture))[0]
  )
}

/**
 * The lines of today: every motorized vehicle still in the fleet with its coupled trailer, then
 * the trailers left uncoupled. Nothing is typed in but the note of the day.
 */
export function liveFleetStatus(db: MockDatabase, language: MockLanguage): FleetStatusApi[] {
  const today = todayIso()
  const statuses = vehicleStatuses(db)
  const links = activeLinks(db)
  const plates = vehiclePlates(db)
  const names = employeeNames(db)
  const types = new Map(db.vehicleTypes.all().map((type) => [type.no, type]))
  const sites = new Map(db.sites.all().map((site) => [site.no, site.name]))
  const routes = new Map(db.routeTemplates.all().map((route) => [route.no, route.name]))
  const trips = db.trips.all()
  const notes = new Map(
    db.fleetStatusNotes
      .all()
      .filter((note) => note.date === today)
      .map((note) => [note.vehicleNo, note])
  )

  const inFleet = db.vehicles.all().filter((vehicle) => !vehicle.removal)
  const lines = inFleet.filter((vehicle) => {
    const type = types.get(vehicle.vehicleTypeNo)
    return type?.motorized || !links.couplingByVehicle.has(vehicle.no)
  })

  return lines.map((vehicle) => {
    const result = statuses.get(vehicle.no) ?? { status: 'available' as const, cause: null }
    const trip = currentTrip(trips, vehicle.no)
    const ahead = trip?.status === 'in_progress' ? trip.stops.filter((stop) => !stop.passedAt) : []
    const state = fleetState({
      vehicleStatus: result.status,
      tripStatus: trip?.status ?? null,
      stopsAhead: ahead.map((stop) => stop.role)
    })
    const coupling = links.couplingByVehicle.get(vehicle.no)
    const assignment = links.assignmentByVehicle.get(vehicle.no)
    const note = notes.get(vehicle.no)
    const routeName = trip ? (routes.get(trip.routeTemplateNo) ?? '') : ''
    const nextSite = ahead[0] ? (sites.get(ahead[0].siteNo) ?? ahead[0].siteNo) : ''
    const immobilized = state === 'IMMOBILIZED'
    let mission = ''
    if (!immobilized && trip?.status === 'in_progress') {
      mission = localize(language, MISSION.onRoad, { route: routeName, site: nextSite })
    } else if (!immobilized && trip) {
      mission = localize(language, MISSION.planned, {
        route: routeName,
        date: localizeDay(trip.plannedDeparture)
      })
    }
    return {
      no: vehicle.no,
      plate: vehicle.plate,
      vehicleTypeName: types.get(vehicle.vehicleTypeNo)?.name ?? '',
      trailerPlate: coupling ? (plates.get(coupledWith(coupling, vehicle.no)) ?? '') : '',
      driverName: assignment ? (names.get(assignment.employeeNo) ?? '') : '',
      state,
      stateGroup: fleetStateGroup(state),
      tripNo: immobilized ? null : (trip?.no ?? null),
      orderNos:
        immobilized || !trip
          ? []
          : db.transportOrders
              .all()
              .filter((order) => order.tripNo === trip.no)
              .map((order) => order.no),
      mission,
      location: trip?.status === 'in_progress' ? nextSite : (sites.get(vehicle.homeSiteNo) ?? ''),
      immobilizationReason: immobilized ? statusReason(result.cause, vehicle, language) : '',
      observation: note?.observation ?? '',
      expectedBackOn: note?.expectedBackOn ?? null
    }
  })
}

function linesOfDay(db: MockDatabase, request: MockRequest): FleetStatusApi[] {
  const date = typeof request.query.date === 'string' ? request.query.date : ''
  if (!date || date === todayIso()) return liveFleetStatus(db, request.language)
  return db.fleetStatusArchives.all().find((archive) => archive.date === date)?.lines ?? []
}

export function registerFleetStatusHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/fleet/fleet-status/days', { feature: 'FLEETSTATUS', action: 'read' }, () => {
    const today = todayIso()
    const archives = db.fleetStatusArchives.all()
    const todayArchive = archives.find((archive) => archive.date === today)
    const days: FleetStatusDay[] = [
      {
        date: today,
        live: true,
        archivedAt: todayArchive?.modifiedAt ?? null,
        archivedBy: todayArchive?.modifiedBy ?? null
      },
      ...archives
        .filter((archive) => archive.date !== today)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((archive) => ({
          date: archive.date,
          live: false,
          archivedAt: archive.modifiedAt,
          archivedBy: archive.modifiedBy
        }))
    ]
    return ok(days)
  })

  router.post(
    '/fleet/fleet-status/archive',
    { feature: 'FLEETSTATUS', action: 'execute' },
    (request) => {
      const today = todayIso()
      const lines = liveFleetStatus(db, request.language)
      const existing = db.fleetStatusArchives.all().find((archive) => archive.date === today)
      if (existing) {
        db.fleetStatusArchives.update(existing.no, { lines, ...stampModified(request) })
      } else {
        db.fleetStatusArchives.insert(
          stampCreated(
            {
              no: nextNo(
                db.fleetStatusArchives.all().map((archive) => archive.no),
                'ARC-',
                5
              ),
              date: today,
              lines
            },
            request
          )
        )
      }
      return ok(null)
    }
  )

  router.put(
    '/fleet/fleet-status/notes/:no',
    { feature: 'FLEETSTATUS', action: 'update' },
    (request) => {
      const vehicle = db.vehicles.findOrFail(routeParam(request, 'no'))
      const body = readBody(request)
      const observation = readString(body, 'observation')
      if (observation.length > MAX_OBSERVATION)
        throw unprocessable(FLEET_MESSAGES.observationTooLong)
      const expectedBackOn = readDate(body, 'expectedBackOn')
      const today = todayIso()
      if (expectedBackOn && (!isValidCalendarDateYmd(expectedBackOn) || expectedBackOn < today)) {
        throw unprocessable(FLEET_MESSAGES.expectedBackInPast)
      }
      const existing = db.fleetStatusNotes
        .all()
        .find((note) => note.date === today && note.vehicleNo === vehicle.no)
      if (existing) {
        db.fleetStatusNotes.update(existing.no, {
          observation,
          expectedBackOn,
          ...stampModified(request)
        })
      } else {
        db.fleetStatusNotes.insert(
          stampCreated(
            {
              no: nextNo(
                db.fleetStatusNotes.all().map((note) => note.no),
                'NOTE-',
                5
              ),
              date: today,
              vehicleNo: vehicle.no,
              observation,
              expectedBackOn
            },
            request
          )
        )
      }
      return ok(liveFleetStatus(db, request.language).find((line) => line.no === vehicle.no))
    }
  )

  registerListResource(router, {
    basePath: '/fleet/fleet-status',
    feature: 'FLEETSTATUS',
    rows: (request) => linesOfDay(db, request),
    searchColumns: ['no', 'plate', 'driverName'],
    optionFields: { state: 'fleetState', stateGroup: 'fleetStateGroup' }
  })
}
