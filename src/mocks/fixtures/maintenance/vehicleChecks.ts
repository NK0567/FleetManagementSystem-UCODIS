import type {
  CheckPointResult,
  VehicleCheckMoment
} from '@/modules/maintenance/vehicle-checks/domain/vehicleCheck'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface VehicleCheckRow extends MockRow {
  moment: VehicleCheckMoment
  vehicleNo: string
  checkedAt: string
  odometerKm: number | null
  comment: string
  results: CheckPointResult[]
  checkedBy: string
  /** The order a blocking anomaly opened. */
  workOrderNo: string | null
}

const ok = (pointNo: string, label: string, blocking: boolean): CheckPointResult => ({
  pointNo,
  label,
  blocking,
  result: 'ok'
})

const SEED: Omit<VehicleCheckRow, keyof typeof seedAudit>[] = [
  {
    no: 'CTL-00001',
    moment: 'trip_return',
    vehicleNo: 'VEH-001',
    checkedAt: '2026-08-26T17:10:00',
    odometerKm: 182_350,
    comment: 'Voyant ABS allumé par intermittence, à surveiller.',
    results: [
      ok('TR-CAR', 'Carrosserie (chocs, rayures)', false),
      ok('TR-PNE', 'Pneumatiques', true),
      ok('TR-FRN', 'Freinage', true),
      ok('TR-FUI', 'Fuites sous le véhicule', true),
      { ...ok('TR-TAB', 'Voyants du tableau de bord', false), result: 'anomaly' },
      ok('TR-EQP', 'Équipements embarqués présents', false)
    ],
    checkedBy: 'MNT001',
    workOrderNo: null
  },
  {
    no: 'CTL-00002',
    moment: 'new_vehicle',
    vehicleNo: 'VEH-007',
    checkedAt: '2025-11-10T09:00:00',
    odometerKm: 12,
    comment: '',
    results: [
      ok('NV-DOC', 'Documents remis (carte grise, garantie)', true),
      ok('NV-VIN', 'VIN conforme aux documents', true),
      ok('NV-EQP', 'Équipements livrés', false),
      ok('NV-ESS', 'Essai routier', true),
      ok('NV-CAR', 'Aspect de la carrosserie', false)
    ],
    checkedBy: 'MNT001',
    workOrderNo: null
  }
]

export const vehicleChecksCollection: CollectionDefinition<VehicleCheckRow> = {
  name: 'vehicle-checks',
  seed: () => SEED.map((row) => ({ ...structuredClone(row), ...seedAudit })),
  dateFields: ['checkedAt']
}
