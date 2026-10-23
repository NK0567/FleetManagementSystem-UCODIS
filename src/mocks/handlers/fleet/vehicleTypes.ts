import {
  COUPLING_ROLES,
  type VehicleTypeApi
} from '@/modules/fleet/vehicle-types/types/vehicleType.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { VehicleTypeRow } from '../../fixtures/fleet/vehicleTypes'
import { registerCrudResource } from '../../http/crudResource'
import {
  readAll,
  readBoolean,
  readCode,
  readEnum,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'
import { conflict, unprocessable } from '../../http/errors'
import {
  VEHICLE_TYPE_STRUCTURAL_FIELDS,
  vehicleTypeIssues
} from '@/modules/fleet/vehicle-types/domain/vehicleType'
import { FLEET_MESSAGES } from './messages'

type Fields = Omit<VehicleTypeRow, 'no' | keyof AuditFields>

function assertConsistent(type: Fields): void {
  const [issue] = vehicleTypeIssues(type)
  if (issue) throw unprocessable(FLEET_MESSAGES[issue])
}

function vehicleCount(db: MockDatabase, typeNo: string): number {
  return db.vehicles.all().filter((vehicle) => vehicle.vehicleTypeNo === typeNo).length
}

export function vehicleTypesApi(db: MockDatabase): VehicleTypeApi[] {
  return db.vehicleTypes.all().map((type) => ({ ...type, vehicleCount: vehicleCount(db, type.no) }))
}

export function registerVehicleTypesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    motorized: (input) => readBoolean(input, 'motorized'),
    couplingRole: (input) =>
      readEnum(input, 'couplingRole', COUPLING_ROLES, { required: true }) ?? 'none',
    carriesGoods: (input) => readBoolean(input, 'carriesGoods'),
    hasCompartments: (input) => readBoolean(input, 'hasCompartments'),
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/fleet/vehicle-types',
    feature: 'VEHICLETYPE',
    collection: db.vehicleTypes,
    list: () => vehicleTypesApi(db),
    searchColumns: ['no', 'name'],
    optionFields: { couplingRole: 'couplingRole' },
    create: (input) => {
      const fields = readAll(input, readers)
      assertConsistent(fields)
      return { no: readCode(input), ...fields }
    },
    update: (existing, input) => {
      const patch = readPatch(input, readers)
      assertConsistent({ ...existing, ...patch })
      const count = vehicleCount(db, existing.no)
      const structureChanges = VEHICLE_TYPE_STRUCTURAL_FIELDS.some(
        (field) => field in patch && patch[field] !== existing[field]
      )
      if (count > 0 && structureChanges) {
        throw conflict(FLEET_MESSAGES.vehicleTypeStructureFrozen, { count })
      }
      return patch
    },
    remove: (existing) => {
      if (vehicleCount(db, existing.no) > 0) throw conflict(FLEET_MESSAGES.vehicleTypeInUse)
    }
  })
}
