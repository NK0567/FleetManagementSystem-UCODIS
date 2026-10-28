import {
  EQUIPMENT_CAPABILITIES,
  type EquipmentTypeApi
} from '@/modules/fleet/equipment-types/types/equipmentType.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { EquipmentTypeRow } from '../../fixtures/fleet/equipmentTypes'
import { registerCrudResource } from '../../http/crudResource'
import {
  readAll,
  readBoolean,
  readCode,
  readEnum,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'
import { conflict } from '../../http/errors'
import { FLEET_MESSAGES } from './messages'

type Fields = Omit<EquipmentTypeRow, 'no' | keyof AuditFields>

export function equipmentTypesApi(db: MockDatabase): EquipmentTypeApi[] {
  return db.equipmentTypes.all()
}

export function registerEquipmentTypesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    capability: (input) =>
      readEnum(input, 'capability', EQUIPMENT_CAPABILITIES, { required: true }) ?? 'tracker',
    hasDueDate: (input) => readBoolean(input, 'hasDueDate'),
    noticeDays: (input) => readNumber(input, 'noticeDays', { required: true, min: 0 }) ?? 0,
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/fleet/equipment-types',
    feature: 'EQUIPMENTTYPE',
    collection: db.equipmentTypes,
    list: () => equipmentTypesApi(db),
    searchColumns: ['no', 'name'],
    optionFields: { capability: 'equipmentCapability' },
    create: (input) => ({
      no: readCode(input),
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers),
    remove: (existing) => {
      if (db.vehicleEquipment.all().some((item) => item.equipmentTypeNo === existing.no)) {
        throw conflict(FLEET_MESSAGES.equipmentTypeInUse)
      }
    }
  })
}
