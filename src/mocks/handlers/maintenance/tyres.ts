import {
  costPerKm,
  isDotCode,
  rotationDue,
  safetyAlert,
  stintKm,
  type TyreStatus
} from '@/modules/maintenance/tyres/domain/tyre'
import type { TyreApi, TyreEvent } from '@/modules/maintenance/tyres/types/tyre.types'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { TyreRow } from '../../fixtures/maintenance/tyres'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readBoolean, readDate, readNumber, readString } from '../../http/input'
import { optionalReference, requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { MAINTENANCE_MESSAGES } from './messages'
import { maintenanceSettings } from './settings'
import { mountedTyres, openStint, vehiclePositions } from './tyrePositions'

/** Shortest reason accepted to scrap a tyre. */
const MIN_REASON = 10
const MAX_PRESSURE_BAR = 15
const MAX_TREAD_MM = 30

function tyreStatus(row: TyreRow): TyreStatus {
  if (row.scrappedAt) return 'scrapped'
  if (row.retreadingSince) return 'retreading'
  return openStint(row) ? 'mounted' : 'stock'
}

export function tyresApi(db: MockDatabase): TyreApi[] {
  const thresholds = maintenanceSettings(db).tyres
  const vehicles = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle]))
  const suppliers = new Map(db.providers.all().map((provider) => [provider.no, provider.name]))
  const odometer = (vehicleNo: string) => vehicles.get(vehicleNo)?.odometerKm ?? 0
  const today = todayIso()
  return db.tyres.all().map((row) => {
    const stint = openStint(row)
    const kmRun = row.stints.reduce((total, item) => total + stintKm(item, odometer), 0)
    const totalCost = row.price + row.retreadCost
    const lastReading = row.readings.at(-1) ?? null
    const safetyIssues = stint ? safetyAlert(lastReading, thresholds) : []
    const due =
      !!stint &&
      !!row.rotationFrom &&
      rotationDue(
        row.rotationFrom,
        { km: odometer(stint.vehicleNo), today },
        thresholds,
        stint.positionCode.startsWith('S')
      )
    return {
      ...row,
      status: tyreStatus(row),
      vehicleNo: stint?.vehicleNo ?? null,
      vehiclePlate: stint ? (vehicles.get(stint.vehicleNo)?.plate ?? stint.vehicleNo) : '',
      positionCode: stint?.positionCode ?? '',
      kmRun,
      totalCost,
      costPerKm: costPerKm(totalCost, kmRun),
      lastReading,
      safetyIssues,
      alert: safetyIssues.length ? 'safety' : due ? 'rotation' : 'none',
      supplierName: row.supplierNo ? (suppliers.get(row.supplierNo) ?? row.supplierNo) : ''
    }
  })
}

export function registerTyresHandlers(router: MockRouter, db: MockDatabase): void {
  const respond = (no: string) => ok(tyresApi(db).find((row) => row.no === no))

  const event = (request: MockRequest, kind: TyreEvent['kind'], detail = ''): TyreEvent => ({
    at: nowIsoDateTime(),
    kind,
    detail,
    by: sessionUser(request).code
  })

  function inStatus(no: string, status: TyreStatus) {
    const row = db.tyres.findOrFail(no)
    if (tyreStatus(row) !== status) throw conflict(MAINTENANCE_MESSAGES.tyreWrongStatus)
    return row
  }

  /** Closes the current stint at the vehicle's odometer. */
  function closeStint(row: TyreRow) {
    const odometer = (vehicleNo: string) => db.vehicles.find(vehicleNo)?.odometerKm ?? 0
    return row.stints.map((stint) =>
      stint.toKm === null
        ? { ...stint, toKm: odometer(stint.vehicleNo), dismountedAt: nowIsoDateTime() }
        : stint
    )
  }

  function readIdentity(input: Record<string, unknown>, no?: string) {
    const serialNumber = readString(input, 'serialNumber', { required: true })
    const twin = db.tyres
      .all()
      .find((row) => row.no !== no && row.serialNumber.toLowerCase() === serialNumber.toLowerCase())
    if (twin) throw conflict(MAINTENANCE_MESSAGES.tyreSerialTaken, { no: twin.no })
    const dotCode = readString(input, 'dotCode')
    if (dotCode && !isDotCode(dotCode)) throw unprocessable(MAINTENANCE_MESSAGES.dotInvalid)
    const supplierNo = optionalReference(db.providers, input, 'supplierNo')
    if (supplierNo && db.providers.findOrFail(supplierNo).providerType !== 'tyre_supplier') {
      throw unprocessable(MAINTENANCE_MESSAGES.tyreSupplierInvalid)
    }
    const price = readNumber(input, 'price', { required: true, min: 1 }) ?? 0
    const purchaseDate = readDate(input, 'purchaseDate', { required: true }) ?? todayIso()
    if (purchaseDate > todayIso()) throw unprocessable(MAINTENANCE_MESSAGES.dateInFuture)
    return {
      serialNumber,
      make: readString(input, 'make', { required: true }),
      size: readString(input, 'size', { required: true }),
      dotCode,
      supplierNo,
      price,
      purchaseDate
    }
  }

  // Static path first: it must not be read as a tyre number.
  router.get('/maintenance/tyres/positions', { feature: 'TYRE', action: 'read' }, (request) => {
    const vehicleNo = typeof request.query.vehicleNo === 'string' ? request.query.vehicleNo : ''
    const mounted = mountedTyres(db)
    return ok(
      vehiclePositions(db, vehicleNo).map((position) => ({
        ...position,
        tyreNo: mounted.get(`${vehicleNo} ${position.code}`)?.no ?? null
      }))
    )
  })

  registerCrudResource(router, {
    basePath: '/maintenance/tyres',
    feature: 'TYRE',
    collection: db.tyres,
    list: () => tyresApi(db),
    searchColumns: ['no', 'serialNumber', 'make', 'vehiclePlate'],
    optionFields: { status: 'tyreStatus', alert: 'tyreAlert' },
    create: (input, request) => ({
      no: nextNo(
        db.tyres.all().map((row) => row.no),
        'PN-',
        4
      ),
      ...readIdentity(input),
      retreaded: readBoolean(input, 'retreaded'),
      stints: [],
      rotationFrom: null,
      readings: [],
      retreadCount: 0,
      retreadCost: 0,
      retreadingSince: null,
      scrappedAt: null,
      scrapReason: '',
      history: [event(request, 'purchased')]
    }),
    update: (existing, input) => readIdentity({ ...existing, ...input }, existing.no)
  })

  router.post('/maintenance/tyres/:no/mount', { feature: 'TYRE', action: 'update' }, (request) => {
    const row = inStatus(routeParam(request, 'no'), 'stock')
    const body = readBody(request)
    const vehicle = db.vehicles.findOrFail(requireReference(db.vehicles, body, 'vehicleNo'))
    if (vehicle.removal || vehicle.outOfService) {
      throw unprocessable(MAINTENANCE_MESSAGES.tyreVehicleUnavailable)
    }
    const positionCode = readString(body, 'positionCode', { required: true })
    if (!vehiclePositions(db, vehicle.no).some((position) => position.code === positionCode)) {
      throw unprocessable(MAINTENANCE_MESSAGES.tyrePositionUnknown)
    }
    const occupant = mountedTyres(db).get(`${vehicle.no} ${positionCode}`)
    if (occupant) throw conflict(MAINTENANCE_MESSAGES.tyrePositionTaken, { no: occupant.no })
    const at = nowIsoDateTime()
    db.tyres.update(row.no, {
      stints: [
        ...row.stints,
        {
          vehicleNo: vehicle.no,
          positionCode,
          fromKm: vehicle.odometerKm,
          toKm: null,
          mountedAt: at,
          dismountedAt: null
        }
      ],
      rotationFrom: { km: vehicle.odometerKm, date: at.slice(0, 10) },
      history: [...row.history, event(request, 'mounted', `${vehicle.plate} · ${positionCode}`)],
      ...stampModified(request)
    })
    return respond(row.no)
  })

  router.post(
    '/maintenance/tyres/:no/dismount',
    { feature: 'TYRE', action: 'update' },
    (request) => {
      const row = inStatus(routeParam(request, 'no'), 'mounted')
      db.tyres.update(row.no, {
        stints: closeStint(row),
        rotationFrom: null,
        history: [
          ...row.history,
          event(request, 'dismounted', readString(readBody(request), 'reason'))
        ],
        ...stampModified(request)
      })
      return respond(row.no)
    }
  )

  router.post(
    '/maintenance/tyres/:no/reading',
    { feature: 'TYRE', action: 'update' },
    (request) => {
      const row = inStatus(routeParam(request, 'no'), 'mounted')
      const body = readBody(request)
      const pressureBar =
        readNumber(body, 'pressureBar', { required: true, min: 0.1, max: MAX_PRESSURE_BAR }) ?? 0
      const treadMm =
        readNumber(body, 'treadMm', { required: true, min: 0, max: MAX_TREAD_MM }) ?? 0
      db.tyres.update(row.no, {
        readings: [
          ...row.readings,
          { at: nowIsoDateTime(), pressureBar, treadMm, by: sessionUser(request).code }
        ],
        history: [...row.history, event(request, 'reading', `${pressureBar} bar · ${treadMm} mm`)],
        ...stampModified(request)
      })
      return respond(row.no)
    }
  )

  // A rotation moves the tyre on the same vehicle, swapping with whatever sits at the target.
  router.post('/maintenance/tyres/:no/rotate', { feature: 'TYRE', action: 'update' }, (request) => {
    const row = inStatus(routeParam(request, 'no'), 'mounted')
    const stint = openStint(row)!
    const body = readBody(request)
    const technician = db.technicians.findOrFail(
      requireReference(db.technicians, body, 'technicianNo')
    )
    if (!technician.active) throw unprocessable(MAINTENANCE_MESSAGES.technicianInactive)
    const positionCode = readString(body, 'positionCode', { required: true })
    if (positionCode === stint.positionCode)
      throw unprocessable(MAINTENANCE_MESSAGES.tyreSamePosition)
    if (!vehiclePositions(db, stint.vehicleNo).some((position) => position.code === positionCode)) {
      throw unprocessable(MAINTENANCE_MESSAGES.tyrePositionUnknown)
    }
    const vehicle = db.vehicles.findOrFail(stint.vehicleNo)
    const at = nowIsoDateTime()
    const move = (tyre: TyreRow, to: string) =>
      db.tyres.update(tyre.no, {
        stints: [
          ...closeStint(tyre),
          {
            vehicleNo: vehicle.no,
            positionCode: to,
            fromKm: vehicle.odometerKm,
            toKm: null,
            mountedAt: at,
            dismountedAt: null
          }
        ],
        rotationFrom: { km: vehicle.odometerKm, date: at.slice(0, 10) },
        history: [...tyre.history, event(request, 'rotated', `→ ${to} · ${technician.no}`)],
        ...stampModified(request)
      })
    const occupant = mountedTyres(db).get(`${vehicle.no} ${positionCode}`)
    if (occupant) move(occupant, stint.positionCode)
    move(row, positionCode)
    return respond(row.no)
  })

  router.post(
    '/maintenance/tyres/:no/retread',
    { feature: 'TYRE', action: 'update' },
    (request) => {
      const row = inStatus(routeParam(request, 'no'), 'stock')
      db.tyres.update(row.no, {
        retreadingSince: nowIsoDateTime(),
        history: [...row.history, event(request, 'sent_retreading')],
        ...stampModified(request)
      })
      return respond(row.no)
    }
  )

  router.post(
    '/maintenance/tyres/:no/back-from-retread',
    { feature: 'TYRE', action: 'update' },
    (request) => {
      const row = inStatus(routeParam(request, 'no'), 'retreading')
      const cost = readNumber(readBody(request), 'cost', { required: true, min: 0 }) ?? 0
      db.tyres.update(row.no, {
        retreadingSince: null,
        retreadCount: row.retreadCount + 1,
        retreadCost: row.retreadCost + cost,
        history: [...row.history, event(request, 'back_retreading', String(cost))],
        ...stampModified(request)
      })
      return respond(row.no)
    }
  )

  router.post('/maintenance/tyres/:no/scrap', { feature: 'TYRE', action: 'execute' }, (request) => {
    const row = db.tyres.findOrFail(routeParam(request, 'no'))
    if (row.scrappedAt) throw conflict(MAINTENANCE_MESSAGES.tyreWrongStatus)
    const reason = readString(readBody(request), 'reason')
    if (reason.length < MIN_REASON) {
      throw unprocessable(MAINTENANCE_MESSAGES.reasonTooShort, { min: MIN_REASON })
    }
    db.tyres.update(row.no, {
      stints: closeStint(row),
      rotationFrom: null,
      retreadingSince: null,
      scrappedAt: nowIsoDateTime(),
      scrapReason: reason,
      history: [...row.history, event(request, 'scrapped', reason)],
      ...stampModified(request)
    })
    return respond(row.no)
  })
}
