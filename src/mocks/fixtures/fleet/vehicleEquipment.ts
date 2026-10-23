import type { EquipmentState } from '@/modules/fleet/vehicles/types/vehicle.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface VehicleEquipmentRow extends MockRow {
  vehicleNo: string
  equipmentTypeNo: string
  serialNumber: string
  state: EquipmentState
  dueDate: string | null
  installedOn: string | null
}

type Seed = Omit<VehicleEquipmentRow, keyof typeof seedAudit>

const TRACTOR_COUNT = 10
const OUT_OF_SERVICE_TRACTOR = 9

function tractorEquipment(index: number): Omit<Seed, 'no'>[] {
  const vehicleNo = `VEH-${String(index).padStart(3, '0')}`
  const state: EquipmentState = index === OUT_OF_SERVICE_TRACTOR ? 'out_of_service' : 'operational'
  const month = String((index % 6) + 1).padStart(2, '0')
  const items: Omit<Seed, 'no'>[] = [
    {
      vehicleNo,
      equipmentTypeNo: 'OBC',
      serialNumber: `OBC-${2024000 + index}`,
      state,
      dueDate: null,
      installedOn: '2024-02-01'
    },
    {
      vehicleNo,
      equipmentTypeNo: 'GPS',
      serialNumber: `GPS-${2024000 + index}`,
      state,
      dueDate: null,
      installedOn: '2024-02-01'
    }
  ]
  if (index % 3 !== 2) {
    items.push({
      vehicleNo,
      equipmentTypeNo: 'DMS',
      serialNumber: `DMS-${3024000 + index}`,
      state: 'operational',
      dueDate: null,
      installedOn: '2025-01-15'
    })
  }
  const extinguisherDue =
    index === 4 ? '2026-08-31' : index === 7 ? '2026-09-20' : `2027-${month}-${10 + index}`
  items.push(
    {
      vehicleNo,
      equipmentTypeNo: 'EXTINGUISHER',
      serialNumber: `EXT-${5024000 + index}`,
      state: 'operational',
      dueDate: extinguisherDue,
      installedOn: '2025-03-01'
    },
    {
      vehicleNo,
      equipmentTypeNo: 'SPILL-KIT',
      serialNumber: '',
      state: 'operational',
      dueDate: `2027-${month}-${13 + index}`,
      installedOn: '2025-03-01'
    }
  )
  return items
}

const SEED: Seed[] = [
  ...Array.from({ length: TRACTOR_COUNT }, (_unused, index) => tractorEquipment(index + 1)).flat(),
  {
    vehicleNo: 'VEH-023',
    equipmentTypeNo: 'PUMP',
    serialNumber: 'PMP-2024-0031',
    state: 'operational' as const,
    dueDate: null,
    installedOn: '2024-06-01'
  }
].map((item, index) => ({ no: `EQ-${String(index + 1).padStart(5, '0')}`, ...item }))

/** On-board equipment, numbered EQ-00001…; the extinguisher due dates follow the demo calendar. */
export const vehicleEquipmentCollection: CollectionDefinition<VehicleEquipmentRow> = {
  name: 'vehicle-equipment',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['dueDate']
}
