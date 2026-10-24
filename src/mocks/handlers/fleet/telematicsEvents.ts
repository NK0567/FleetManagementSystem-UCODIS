import {
  belowThreshold,
  telematicsEventStatus
} from '@/modules/fleet/telematics-events/domain/telematicsEvent'
import {
  TELEMATICS_SOURCES,
  type TelematicsEventApi
} from '@/modules/fleet/telematics-events/types/telematicsEvent.types'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import { minutesBetween, nowIsoDateTime } from '@/utils/date'
import { circleContaining } from '@/utils/geo'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readDateTime, readEnum, readNumber, readString } from '../../http/input'
import { requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { localize } from '../../i18n'
import { infractionFromTelematics } from './infractions'
import { expectedDrivers, tripAt } from './links'
import { FLEET_MESSAGES } from './messages'
import { sitesApi } from './sites'

/** The same reading sent again by a unit within this window is the same event. */
const DUPLICATE_WINDOW_MIN = 10

export function telematicsEventsApi(db: MockDatabase): TelematicsEventApi[] {
  const types = new Map(db.telematicsEventTypes.all().map((type) => [type.no, type]))
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  const areas = sitesApi(db)
    .filter((site) => site.active)
    .map((site) => ({ ...site, radiusM: site.effectiveRadiusM }))
  return db.telematicsEvents.all().map((event) => {
    const type = types.get(event.eventTypeNo)
    const site =
      event.latitude !== null && event.longitude !== null
        ? circleContaining({ latitude: event.latitude, longitude: event.longitude }, areas)
        : undefined
    return {
      ...event,
      eventTypeName: type?.name ?? event.eventTypeNo,
      vehiclePlate: plates.get(event.vehicleNo) ?? event.vehicleNo,
      driverName: event.driverNo ? (names.get(event.driverNo) ?? event.driverNo) : '',
      siteName: site?.name ?? '',
      family: type?.family ?? 'behavior',
      severity: type?.severity ?? 'minor',
      unit: type?.unit ?? null,
      infractionTypeNo: type?.infractionTypeNo ?? null,
      status: telematicsEventStatus(event)
    }
  })
}

function eventApiOf(db: MockDatabase, no: string) {
  return telematicsEventsApi(db).find((row) => row.no === no)
}

export function registerTelematicsEventsHandlers(router: MockRouter, db: MockDatabase): void {
  function pending(no: string) {
    const event = db.telematicsEvents.findOrFail(no)
    if (telematicsEventStatus(event) !== 'new')
      throw conflict(FLEET_MESSAGES.telematicsEventHandled)
    return event
  }

  // Events come from the units: they are recorded, handled, never edited nor deleted.
  registerCrudResource(router, {
    basePath: '/fleet/telematics-events',
    feature: 'TELEMATICS',
    collection: db.telematicsEvents,
    list: () => telematicsEventsApi(db),
    searchColumns: ['no', 'vehiclePlate', 'driverName', 'siteName'],
    optionFields: {
      source: 'telematicsSource',
      family: 'telematicsFamily',
      severity: 'telematicsSeverity',
      status: 'telematicsEventStatus'
    },
    create: (input) => {
      const eventTypeNo = requireReference(db.telematicsEventTypes, input, 'eventTypeNo')
      const type = db.telematicsEventTypes.findOrFail(eventTypeNo)
      if (!type.active) throw unprocessable(FLEET_MESSAGES.telematicsEventTypeInactive)
      const vehicleNo = requireReference(db.vehicles, input, 'vehicleNo')
      const occurredAt = readDateTime(input, 'occurredAt', { required: true }) ?? ''
      if (occurredAt > nowIsoDateTime()) throw unprocessable(FLEET_MESSAGES.dateInFuture)
      const value = readNumber(input, 'value', { min: 0 })
      if (belowThreshold(value, type.threshold)) {
        throw unprocessable(FLEET_MESSAGES.telematicsBelowThreshold, {
          threshold: type.threshold ?? 0
        })
      }
      const twin = db.telematicsEvents
        .all()
        .find(
          (row) =>
            row.vehicleNo === vehicleNo &&
            row.eventTypeNo === eventTypeNo &&
            Math.abs(minutesBetween(row.occurredAt, occurredAt)) < DUPLICATE_WINDOW_MIN
        )
      if (twin) throw conflict(FLEET_MESSAGES.telematicsDuplicate, { no: twin.no })
      const trip = tripAt(db, vehicleNo, occurredAt)
      return {
        no: nextNo(
          db.telematicsEvents.all().map((row) => row.no),
          'TEL-',
          6
        ),
        eventTypeNo,
        vehicleNo,
        driverNo: expectedDrivers(db, vehicleNo, occurredAt, trip?.no ?? null)[0] ?? null,
        tripNo: trip?.no ?? null,
        occurredAt,
        source: readEnum(input, 'source', TELEMATICS_SOURCES, { required: true }) ?? 'box',
        value,
        latitude: readNumber(input, 'latitude', { min: -90, max: 90 }),
        longitude: readNumber(input, 'longitude', { min: -180, max: 180 }),
        detail: readString(input, 'detail'),
        infractionNo: null,
        acknowledgedAt: null,
        acknowledgedBy: null,
        acknowledgementComment: ''
      }
    }
  })

  router.post(
    '/fleet/telematics-events/:no/acknowledge',
    { feature: 'TELEMATICS', action: 'update' },
    (request) => {
      const event = pending(routeParam(request, 'no'))
      db.telematicsEvents.update(event.no, {
        acknowledgedAt: nowIso(),
        acknowledgedBy: sessionUser(request).code,
        acknowledgementComment: readString(readBody(request), 'comment'),
        ...stampModified(request)
      })
      return ok(eventApiOf(db, event.no))
    }
  )

  router.post(
    '/fleet/telematics-events/:no/infraction',
    { feature: 'TELEMATICS', action: 'update' },
    (request) => {
      const event = pending(routeParam(request, 'no'))
      const api = eventApiOf(db, event.no) as TelematicsEventApi
      if (!api.infractionTypeNo) throw unprocessable(FLEET_MESSAGES.telematicsNoInfractionType)
      const position =
        event.latitude !== null && event.longitude !== null
          ? `${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}`
          : ''
      const infractionNo = infractionFromTelematics(
        db,
        {
          infractionTypeNo: api.infractionTypeNo,
          occurredAt: event.occurredAt,
          location:
            api.siteName || position || localize(request.language, FLEET_MESSAGES.positionUnknown),
          vehicleNo: event.vehicleNo,
          driverNo: event.driverNo,
          detail: [event.detail, `${event.no} · ${api.eventTypeName}`].filter(Boolean).join('\n')
        },
        request
      )
      db.telematicsEvents.update(event.no, { infractionNo, ...stampModified(request) })
      return ok(eventApiOf(db, event.no))
    }
  )
}
