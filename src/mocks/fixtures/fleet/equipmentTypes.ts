import type { EquipmentCapability } from '@/modules/fleet/equipment-types/types/equipmentType.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface EquipmentTypeRow extends MockRow {
  name: string
  capability: EquipmentCapability
  hasDueDate: boolean
  noticeDays: number
  active: boolean
}

const SEED: Omit<EquipmentTypeRow, keyof typeof seedAudit>[] = [
  {
    no: 'OBC',
    name: 'Boîtier embarqué',
    capability: 'tracker',
    hasDueDate: false,
    noticeDays: 30,
    active: true
  },
  {
    no: 'GPS',
    name: 'Balise GPS',
    capability: 'tracker',
    hasDueDate: false,
    noticeDays: 30,
    active: true
  },
  {
    no: 'DMS',
    name: 'Caméra embarquée',
    capability: 'camera',
    hasDueDate: false,
    noticeDays: 30,
    active: true
  },
  {
    no: 'EXTINGUISHER',
    name: 'Extincteur',
    capability: 'safety',
    hasDueDate: true,
    noticeDays: 30,
    active: true
  },
  {
    no: 'SPILL-KIT',
    name: 'Kit antipollution',
    capability: 'safety',
    hasDueDate: true,
    noticeDays: 30,
    active: true
  },
  {
    no: 'PUMP',
    name: 'Pompe de dépotage',
    capability: 'pump',
    hasDueDate: false,
    noticeDays: 30,
    active: true
  },
  {
    no: 'FIRST-AID',
    name: 'Trousse de secours',
    capability: 'safety',
    hasDueDate: true,
    noticeDays: 30,
    active: true
  }
]

export const equipmentTypesCollection: CollectionDefinition<EquipmentTypeRow> = {
  name: 'equipment-types',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
