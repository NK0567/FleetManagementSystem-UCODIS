import {
  STOP_ROLES,
  plannedDurationMin,
  referenceDurationMin,
  routeDistanceKm,
  routeIssues,
  type RouteStop,
  type StopRole
} from '@/modules/fleet/route-templates/domain/routeTemplate'
import type { RouteTemplateApi } from '@/modules/fleet/route-templates/types/routeTemplate.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { RouteTemplateRow } from '../../fixtures/fleet/routeTemplates'
import { registerCrudResource } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  invalidField,
  readAll,
  readBoolean,
  readCode,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { unknownReference } from '../../http/references'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'
import { distanceKm } from '@/utils/geo'
import { planningSettings } from '../planning/settings'

type Fields = Omit<RouteTemplateRow, 'no' | keyof AuditFields>

export function routeTemplatesApi(db: MockDatabase): RouteTemplateApi[] {
  const sites = new Map(db.sites.all().map((site) => [site.no, site]))
  const trips = db.trips.all()
  return db.routeTemplates.all().map((route) => {
    const stopPoints = route.stops.map((stop) => {
      const site = sites.get(stop.siteNo)
      return {
        ...stop,
        siteName: site?.name ?? stop.siteNo,
        latitude: site?.latitude ?? 0,
        longitude: site?.longitude ?? 0
      }
    })
    return {
      ...route,
      stopPoints,
      originName: stopPoints[0]?.siteName ?? '',
      destinationName: stopPoints.at(-1)?.siteName ?? '',
      stopCount: route.stops.length,
      plannedDurationMin: plannedDurationMin(route.stops),
      // Driven at the average speed of the planning settings (TRS07-US03).
      referenceDurationMin: referenceDurationMin(
        route.estimatedDistanceKm,
        route.stops,
        planningSettings(db).schedule.averageSpeedKmh
      ),
      tripCount: trips.filter((trip) => trip.routeTemplateNo === route.no).length
    }
  })
}

function readStops(db: MockDatabase, input: Record<string, unknown>): RouteStop[] {
  const raw = input.stops
  if (!Array.isArray(raw)) throw invalidField('stops')
  const stops = raw.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw invalidField('stops')
    const line = item as Record<string, unknown>
    const role = String(line.role ?? '') as StopRole
    if (!STOP_ROLES.includes(role)) throw invalidField('stops')
    const siteNo = readString(line, 'siteNo')
    if (siteNo && !db.sites.exists(siteNo)) throw unknownReference('stops')
    return {
      siteNo,
      role,
      plannedIntervalMin: readNumber(line, 'plannedIntervalMin', { min: 0 }) ?? 0,
      breakMin: readNumber(line, 'breakMin', { min: 0 }) ?? 0
    }
  })
  if (routeIssues(stops).length) throw unprocessable(FLEET_MESSAGES.invalidRoute)
  return stops.map((stop, index) => (index === 0 ? { ...stop, plannedIntervalMin: 0 } : stop))
}

export function registerRouteTemplatesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    recurring: (input) => readBoolean(input, 'recurring'),
    // Recomputed from the stops whenever they change; typed only when the sites have no place.
    estimatedDistanceKm: (input) =>
      distanceOfStops(input) ??
      readNumber(input, 'estimatedDistanceKm', { required: true, min: 1 }) ??
      0,
    fuelReferenceL100: (input) => readNumber(input, 'fuelReferenceL100', { min: 1, max: 100 }),
    active: (input) => readBoolean(input, 'active', true),
    stops: (input) => readStops(db, input)
  }

  /** The distance of the stops sent, when every site of them has a place; null otherwise. */
  function distanceOfStops(input: Record<string, unknown>): number | null {
    if (!Array.isArray(input.stops)) return null
    const sites = (input.stops as { siteNo?: unknown }[]).map((stop) =>
      db.sites.find(String(stop?.siteNo ?? ''))
    )
    if (sites.length < 2 || sites.some((site) => !site || (!site.latitude && !site.longitude))) {
      return null
    }
    return Math.max(
      1,
      routeDistanceKm(
        sites.map((site) => site!),
        distanceKm
      )
    )
  }

  registerCrudResource(router, {
    basePath: '/fleet/route-templates',
    feature: 'ROUTETEMPLATE',
    collection: db.routeTemplates,
    list: () => routeTemplatesApi(db),
    searchColumns: ['no', 'name'],
    create: (input) => ({ no: readCode(input), ...readAll(input, readers) }),
    update: (_existing, input) => {
      const patch = readPatch(input, readers)
      // New stops always bring their distance, whatever was typed.
      const distance = distanceOfStops(input)
      return distance === null ? patch : { ...patch, estimatedDistanceKm: distance }
    },
    remove: (existing) => {
      if (db.trips.all().some((trip) => trip.routeTemplateNo === existing.no)) {
        throw conflict(FLEET_MESSAGES.routeInUse)
      }
    }
  })
}
