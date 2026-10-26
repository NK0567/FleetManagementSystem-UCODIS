import { equipmentDueState } from '@/modules/fleet/vehicles/domain/equipment'
import { normalizePlate } from '@/modules/fleet/vehicles/domain/vehicleStatus'
import {
  ACQUISITION_MODES,
  EQUIPMENT_STATES,
  FUEL_TYPES,
  type VehicleApi,
  type VehicleCompartment,
  type VehicleEquipmentApi
} from '@/modules/fleet/vehicles/types/vehicle.types'
import { todayIso } from '@/utils/date'
import { nowIso } from '../../clock'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { VehicleEquipmentRow } from '../../fixtures/fleet/vehicleEquipment'
import type { VehicleRow } from '../../fixtures/fleet/vehicles'
import {
  readBody,
  registerCrudResource,
  routeParam,
  stampCreated,
  stampModified
} from '../../http/crudResource'
import { conflict, notFound, unprocessable } from '../../http/errors'
import {
  invalidField,
  readAll,
  readDate,
  readEnum,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { optionalReference, requireReference } from '../../http/references'
import { created, ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import type { MockLanguage } from '../../i18n'
import { FLEET_MESSAGES } from './messages'
import { activeLinks, coupledWith, employeeNames } from './links'
import { tripIndex } from './tripIndex'
import { statusReason, vehicleStatuses } from './vehicleState'
import { fileMetaOf, filesMetaOf, releaseFiles } from '../files'
import { documentCompliance, gapsText } from './documentCompliance'
import { IMAGE_FILE_TYPES } from '@/utils/fileRules'

const BASE_PATH = '/fleet/vehicles'
const MAX_PHOTOS = 6
const FEATURE = 'VEHICLE'

type EditableFields = Omit<
  VehicleRow,
  | 'no'
  | keyof AuditFields
  | 'plate'
  | 'vehicleTypeNo'
  | 'odometerKm'
  | 'odometerReadings'
  | 'plateHistory'
  | 'outOfService'
  | 'removal'
  | 'photoFileNos'
>

function equipmentApi(db: MockDatabase): VehicleEquipmentApi[] {
  const types = new Map(db.equipmentTypes.all().map((type) => [type.no, type]))
  const today = todayIso()
  return db.vehicleEquipment.all().map((item) => {
    const type = types.get(item.equipmentTypeNo)
    return {
      no: item.no,
      vehicleNo: item.vehicleNo,
      equipmentTypeNo: item.equipmentTypeNo,
      equipmentTypeName: type?.name ?? '',
      capability: type?.capability ?? 'other',
      serialNumber: item.serialNumber,
      state: item.state,
      dueDate: item.dueDate,
      dueState:
        item.state === 'uninstalled'
          ? null
          : equipmentDueState(item.dueDate, type?.noticeDays ?? 0, today),
      installedOn: item.installedOn,
      modifiedAt: item.modifiedAt,
      modifiedBy: item.modifiedBy
    }
  })
}

export function vehiclesApi(db: MockDatabase, language: MockLanguage = 'fr'): VehicleApi[] {
  const types = new Map(db.vehicleTypes.all().map((type) => [type.no, type]))
  const sites = new Map(db.sites.all().map((site) => [site.no, site.name]))
  const statuses = vehicleStatuses(db)
  const compliance = documentCompliance(db).vehicles
  const links = activeLinks(db)
  const names = employeeNames(db)
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const working = equipmentApi(db).filter((item) => item.state === 'operational')
  const capabilities = (vehicleNo: string) =>
    new Set(working.filter((item) => item.vehicleNo === vehicleNo).map((item) => item.capability))

  return db.vehicles.all().map((vehicle) => {
    const type = types.get(vehicle.vehicleTypeNo)
    const result = statuses.get(vehicle.no) ?? { status: 'available' as const, cause: null }
    const owned = capabilities(vehicle.no)
    const assignment = links.assignmentByVehicle.get(vehicle.no)
    const coupling = links.couplingByVehicle.get(vehicle.no)
    const coupledNo = coupling ? coupledWith(coupling, vehicle.no) : null
    return {
      ...vehicle,
      vehicleTypeName: type?.name ?? '',
      motorized: type?.motorized ?? false,
      couplingRole: type?.couplingRole ?? 'none',
      carriesGoods: type?.carriesGoods ?? false,
      hasCompartments: type?.hasCompartments ?? false,
      homeSiteName: sites.get(vehicle.homeSiteNo) ?? '',
      totalCapacityL: vehicle.compartments.reduce((total, item) => total + item.volumeL, 0),
      formerPlates: vehicle.plateHistory.map((change) => change.previousPlate).join(', '),
      status: result.status,
      statusReason: statusReason(result.cause, vehicle, language),
      driverNo: assignment?.employeeNo ?? null,
      driverName: assignment ? (names.get(assignment.employeeNo) ?? '') : '',
      coupledVehicleNo: coupledNo,
      coupledVehiclePlate: coupledNo ? (plates.get(coupledNo) ?? '') : '',
      hasTracker: owned.has('tracker'),
      hasCamera: owned.has('camera'),
      hasPump: owned.has('pump'),
      photos: filesMetaOf(db, vehicle.photoFileNos),
      documentsCompliant: (compliance.get(vehicle.no) ?? []).length === 0,
      documentGaps: gapsText(db, compliance.get(vehicle.no) ?? [], language)
    }
  })
}

export function vehicleApiOf(db: MockDatabase, no: string, language: MockLanguage): VehicleApi {
  const vehicle = vehiclesApi(db, language).find((row) => row.no === no)
  if (!vehicle) throw notFound()
  return vehicle
}

function readCompartments(input: Record<string, unknown>): VehicleCompartment[] {
  const raw = input.compartments
  if (raw == null) return []
  if (!Array.isArray(raw)) throw invalidField('compartments')
  return raw.map((item: unknown, index) => {
    const volumeL = Number((item as { volumeL?: unknown } | null)?.volumeL)
    if (!Number.isFinite(volumeL) || volumeL <= 0) {
      throw unprocessable(FLEET_MESSAGES.compartmentsRequired)
    }
    return { no: index + 1, volumeL }
  })
}

/** The vehicle using a plate, now or in its history. */
function plateOwner(db: MockDatabase, plate: string, except?: string): VehicleRow | undefined {
  const wanted = normalizePlate(plate)
  return db.vehicles
    .all()
    .find(
      (vehicle) =>
        vehicle.no !== except &&
        (normalizePlate(vehicle.plate) === wanted ||
          vehicle.plateHistory.some((change) => normalizePlate(change.previousPlate) === wanted))
    )
}

function assertEditable(vehicle: VehicleRow): void {
  if (vehicle.removal) throw conflict(FLEET_MESSAGES.vehicleRemoved)
}

export function registerVehiclesHandlers(router: MockRouter, db: MockDatabase): void {
  const activeType = (input: Record<string, unknown>) => {
    const code = requireReference(db.vehicleTypes, input, 'vehicleTypeNo')
    if (!db.vehicleTypes.findOrFail(code).active) {
      throw unprocessable(FLEET_MESSAGES.inactiveVehicleType)
    }
    return code
  }
  const activeSite = (input: Record<string, unknown>) => {
    const code = requireReference(db.sites, input, 'homeSiteNo')
    if (!db.sites.findOrFail(code).active) throw unprocessable(FLEET_MESSAGES.inactiveSite)
    return code
  }

  const readers: FieldReaders<EditableFields> = {
    vin: (input) => readString(input, 'vin', { required: true }).toUpperCase(),
    make: (input) => readString(input, 'make', { required: true }),
    model: (input) => readString(input, 'model', { required: true }),
    category: (input) => readString(input, 'category'),
    homeSiteNo: activeSite,
    year: (input) => readNumber(input, 'year', { min: 1980, max: 2100 }),
    firstRegistrationDate: (input) => readDate(input, 'firstRegistrationDate'),
    fuelType: (input) => readEnum(input, 'fuelType', FUEL_TYPES),
    tankCapacityL: (input) => readNumber(input, 'tankCapacityL', { min: 1 }),
    maxLoadKg: (input) => readNumber(input, 'maxLoadKg', { min: 1 }),
    maxVolumeM3: (input) => readNumber(input, 'maxVolumeM3', { min: 0 }),
    compartments: readCompartments,
    acquisitionMode: (input) => readEnum(input, 'acquisitionMode', ACQUISITION_MODES),
    acquisitionDate: (input) => readDate(input, 'acquisitionDate'),
    acquisitionProviderNo: (input) =>
      optionalReference(db.providers, input, 'acquisitionProviderNo'),
    acquisitionCost: (input) => readNumber(input, 'acquisitionCost', { min: 0 }),
    residualValue: (input) => readNumber(input, 'residualValue', { min: 0 }),
    monthlyPayment: (input) => readNumber(input, 'monthlyPayment', { min: 0 })
  }

  /** Engine data only exists on motorized types, compartments only on types that have them. */
  function fitToType<T extends Partial<EditableFields>>(vehicleTypeNo: string, fields: T): T {
    const type = db.vehicleTypes.findOrFail(vehicleTypeNo)
    const fitted = { ...fields }
    if (!type.motorized) {
      fitted.fuelType = null
      fitted.tankCapacityL = null
    }
    if (!type.hasCompartments && fields.compartments?.length) {
      throw unprocessable(FLEET_MESSAGES.compartmentsNotAllowed)
    }
    if (type.hasCompartments && fields.compartments && fields.compartments.length === 0) {
      throw unprocessable(FLEET_MESSAGES.compartmentsRequired)
    }
    return fitted
  }

  function assertUniqueVin(vin: string | undefined, except?: string): void {
    if (!vin) return
    const twin = db.vehicles.all().find((vehicle) => vehicle.no !== except && vehicle.vin === vin)
    if (twin) throw conflict(FLEET_MESSAGES.duplicateVin, { no: twin.no })
  }

  registerCrudResource(router, {
    basePath: BASE_PATH,
    feature: FEATURE,
    collection: db.vehicles,
    list: (request) => vehiclesApi(db, request.language),
    searchColumns: ['no', 'plate', 'vin', 'formerPlates'],
    optionFields: {
      fuelType: 'fuelType',
      acquisitionMode: 'acquisitionMode',
      status: 'vehicleStatus'
    },
    create: (input, request) => {
      const plate = normalizePlate(readString(input, 'plate', { required: true }))
      const owner = plateOwner(db, plate)
      if (owner) throw conflict(FLEET_MESSAGES.duplicatePlate, { plate, no: owner.no })
      const vehicleTypeNo = activeType(input)
      const fields = readAll(input, readers)
      assertUniqueVin(fields.vin)
      const odometerKm = readNumber(input, 'odometerKm', { min: 0 }) ?? 0
      return {
        no: nextNo(
          db.vehicles.all().map((vehicle) => vehicle.no),
          'VEH-',
          3
        ),
        plate,
        vehicleTypeNo,
        ...fitToType(vehicleTypeNo, fields),
        odometerKm,
        odometerReadings: [
          {
            readAt: nowIso(),
            km: odometerKm,
            source: 'manual' as const,
            recordedBy: sessionUser(request).code
          }
        ],
        plateHistory: [],
        outOfService: null,
        removal: null,
        photoFileNos: []
      }
    },
    update: (existing, input) => {
      assertEditable(existing)
      const patch = readPatch(input, readers)
      assertUniqueVin(patch.vin, existing.no)
      return fitToType(existing.vehicleTypeNo, patch)
    }
  })

  const vehicleOf = (request: MockRequest) => db.vehicles.findOrFail(routeParam(request, 'no'))
  const respond = (request: MockRequest) =>
    ok(vehicleApiOf(db, routeParam(request, 'no'), request.language))

  router.post(`${BASE_PATH}/:no/plate`, { feature: FEATURE, action: 'update' }, (request) => {
    const vehicle = vehicleOf(request)
    assertEditable(vehicle)
    const body = readBody(request)
    const plate = normalizePlate(readString(body, 'plate', { required: true }))
    if (plate === normalizePlate(vehicle.plate)) throw unprocessable(FLEET_MESSAGES.samePlate)
    const owner = plateOwner(db, plate, vehicle.no)
    if (owner) throw conflict(FLEET_MESSAGES.duplicatePlate, { plate, no: owner.no })
    const change = {
      previousPlate: vehicle.plate,
      newPlate: plate,
      changedAt: nowIso(),
      changedBy: sessionUser(request).code,
      reason: readString(body, 'reason')
    }
    db.vehicles.update(vehicle.no, {
      plate,
      plateHistory: [...vehicle.plateHistory, change],
      ...stampModified(request)
    })
    return respond(request)
  })

  router.post(`${BASE_PATH}/:no/odometer`, { feature: FEATURE, action: 'update' }, (request) => {
    const vehicle = vehicleOf(request)
    assertEditable(vehicle)
    const km = readNumber(readBody(request), 'km', { required: true, min: 0 }) ?? 0
    if (km < vehicle.odometerKm) {
      throw unprocessable(FLEET_MESSAGES.odometerBackwards, { km: vehicle.odometerKm })
    }
    db.vehicles.update(vehicle.no, {
      odometerKm: km,
      odometerReadings: [
        ...vehicle.odometerReadings,
        { readAt: nowIso(), km, source: 'manual' as const, recordedBy: sessionUser(request).code }
      ],
      ...stampModified(request)
    })
    return respond(request)
  })

  router.post(
    `${BASE_PATH}/:no/out-of-service`,
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const vehicle = vehicleOf(request)
      assertEditable(vehicle)
      if (vehicle.outOfService) throw conflict(FLEET_MESSAGES.alreadyOutOfService)
      const onRoad = tripIndex(db).onRoadByVehicle.get(vehicle.no)
      if (onRoad) throw conflict(FLEET_MESSAGES.tripInProgress, { no: onRoad.no })
      const reason = readString(readBody(request), 'reason')
      if (!reason) throw unprocessable(FLEET_MESSAGES.reasonRequired)
      db.vehicles.update(vehicle.no, {
        outOfService: { reason, since: nowIso(), by: sessionUser(request).code },
        ...stampModified(request)
      })
      return respond(request)
    }
  )

  router.post(
    `${BASE_PATH}/:no/return-to-service`,
    { feature: FEATURE, action: 'execute' },
    (request) => {
      const vehicle = vehicleOf(request)
      assertEditable(vehicle)
      if (!vehicle.outOfService) throw conflict(FLEET_MESSAGES.notOutOfService)
      db.vehicles.update(vehicle.no, { outOfService: null, ...stampModified(request) })
      return respond(request)
    }
  )

  router.post(`${BASE_PATH}/:no/remove`, { feature: FEATURE, action: 'execute' }, (request) => {
    const vehicle = vehicleOf(request)
    assertEditable(vehicle)
    const links = activeLinks(db)
    if (links.couplingByVehicle.has(vehicle.no) || links.assignmentByVehicle.has(vehicle.no)) {
      throw conflict(FLEET_MESSAGES.vehicleStillLinked)
    }
    const openTrip = db.trips
      .all()
      .some(
        (trip) =>
          (trip.status === 'planned' || trip.status === 'in_progress') &&
          (trip.vehicleNo === vehicle.no || trip.trailerNo === vehicle.no)
      )
    if (openTrip) throw conflict(FLEET_MESSAGES.tripsStillOpen)
    const body = readBody(request)
    const reason = readString(body, 'reason')
    if (!reason) throw unprocessable(FLEET_MESSAGES.reasonRequired)
    const date = readDate(body, 'date', { required: true }) ?? todayIso()
    if (date > todayIso()) throw unprocessable(FLEET_MESSAGES.removalDateInFuture)
    const finalOdometerKm = readNumber(body, 'finalOdometerKm', { min: 0 })
    if (finalOdometerKm !== null && finalOdometerKm < vehicle.odometerKm) {
      throw unprocessable(FLEET_MESSAGES.odometerBackwards, { km: vehicle.odometerKm })
    }
    const recordedBy = sessionUser(request).code
    db.vehicles.update(vehicle.no, {
      removal: { date, reason, finalOdometerKm, comment: readString(body, 'comment'), recordedBy },
      ...(finalOdometerKm !== null
        ? {
            odometerKm: finalOdometerKm,
            odometerReadings: [
              ...vehicle.odometerReadings,
              { readAt: nowIso(), km: finalOdometerKm, source: 'removal' as const, recordedBy }
            ]
          }
        : {}),
      ...stampModified(request)
    })
    return respond(request)
  })

  router.post(`${BASE_PATH}/:no/photos`, { feature: FEATURE, action: 'update' }, (request) => {
    const vehicle = vehicleOf(request)
    assertEditable(vehicle)
    const fileNo = readString(readBody(request), 'fileNo', { required: true })
    const meta = fileMetaOf(db, fileNo)
    if (!meta || !(IMAGE_FILE_TYPES as readonly string[]).includes(meta.mimeType)) {
      throw invalidField('fileNo')
    }
    if (vehicle.photoFileNos.length >= MAX_PHOTOS) {
      throw unprocessable(FLEET_MESSAGES.tooManyPhotos, { max: MAX_PHOTOS })
    }
    if (!vehicle.photoFileNos.includes(fileNo)) {
      db.vehicles.update(vehicle.no, {
        photoFileNos: [...vehicle.photoFileNos, fileNo],
        ...stampModified(request)
      })
    }
    return respond(request)
  })

  router.delete(
    `${BASE_PATH}/:no/photos/:fileNo`,
    { feature: FEATURE, action: 'update' },
    async (request) => {
      const vehicle = vehicleOf(request)
      assertEditable(vehicle)
      const fileNo = routeParam(request, 'fileNo')
      db.vehicles.update(vehicle.no, {
        photoFileNos: vehicle.photoFileNos.filter((no) => no !== fileNo),
        ...stampModified(request)
      })
      await releaseFiles(db, [fileNo])
      return respond(request)
    }
  )

  registerEquipmentHandlers(router, db)
}

function registerEquipmentHandlers(router: MockRouter, db: MockDatabase): void {
  const path = `${BASE_PATH}/:no/equipment`

  const typeOf = (code: string) => db.equipmentTypes.findOrFail(code)

  function assertSerialFree(serialNumber: string, except?: string): void {
    if (!serialNumber) return
    const twin = db.vehicleEquipment
      .all()
      .find(
        (item) =>
          item.no !== except && item.state !== 'uninstalled' && item.serialNumber === serialNumber
      )
    if (twin) throw conflict(FLEET_MESSAGES.duplicateSerial, { no: twin.vehicleNo })
  }

  const listOf = (vehicleNo: string) =>
    equipmentApi(db).filter((item) => item.vehicleNo === vehicleNo)

  router.get(path, { feature: FEATURE, action: 'read' }, (request) => {
    const vehicle = db.vehicles.findOrFail(routeParam(request, 'no'))
    return ok(listOf(vehicle.no))
  })

  router.post(path, { feature: FEATURE, action: 'update' }, (request) => {
    const vehicle = db.vehicles.findOrFail(routeParam(request, 'no'))
    assertEditable(vehicle)
    const body = readBody(request)
    const equipmentTypeNo = requireReference(db.equipmentTypes, body, 'equipmentTypeNo')
    const type = typeOf(equipmentTypeNo)
    if (!type.active) throw unprocessable(FLEET_MESSAGES.inactiveEquipmentType)
    const dueDate = readDate(body, 'dueDate')
    if (type.hasDueDate && !dueDate) throw unprocessable(FLEET_MESSAGES.equipmentDueDateRequired)
    const serialNumber = readString(body, 'serialNumber')
    assertSerialFree(serialNumber)
    const no = nextNo(
      db.vehicleEquipment.all().map((item) => item.no),
      'EQ-',
      5
    )
    db.vehicleEquipment.insert(
      stampCreated<VehicleEquipmentRow>(
        {
          no,
          vehicleNo: vehicle.no,
          equipmentTypeNo,
          serialNumber,
          state: 'operational',
          dueDate: type.hasDueDate ? dueDate : null,
          installedOn: readDate(body, 'installedOn') ?? todayIso()
        },
        request
      )
    )
    return created(listOf(vehicle.no).find((item) => item.no === no))
  })

  router.patch(`${path}/:equipmentNo`, { feature: FEATURE, action: 'update' }, (request) => {
    const vehicle = db.vehicles.findOrFail(routeParam(request, 'no'))
    assertEditable(vehicle)
    const item = db.vehicleEquipment.findOrFail(routeParam(request, 'equipmentNo'))
    if (item.vehicleNo !== vehicle.no) throw notFound()
    const body = readBody(request)
    const type = typeOf(item.equipmentTypeNo)
    const patch: Partial<VehicleEquipmentRow> = {}
    if ('state' in body) patch.state = readEnum(body, 'state', EQUIPMENT_STATES) ?? item.state
    if ('serialNumber' in body) patch.serialNumber = readString(body, 'serialNumber')
    if ('dueDate' in body) {
      patch.dueDate = readDate(body, 'dueDate')
      if (type.hasDueDate && !patch.dueDate) {
        throw unprocessable(FLEET_MESSAGES.equipmentDueDateRequired)
      }
    }
    const merged = { ...item, ...patch }
    if (merged.state !== 'uninstalled') assertSerialFree(merged.serialNumber, item.no)
    db.vehicleEquipment.update(item.no, { ...patch, ...stampModified(request) })
    return ok(listOf(vehicle.no).find((row) => row.no === item.no))
  })
}
