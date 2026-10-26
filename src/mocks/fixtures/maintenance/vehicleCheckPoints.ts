import type { VehicleCheckMoment } from '@/modules/maintenance/vehicle-checks/domain/vehicleCheck'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface VehicleCheckPointRow extends MockRow {
  moment: VehicleCheckMoment
  label: string
  blocking: boolean
  sortOrder: number
  active: boolean
}

const SEED: Omit<VehicleCheckPointRow, keyof typeof seedAudit>[] = [
  {
    no: 'BL-FRN',
    moment: 'before_loading',
    label: 'Freinage',
    blocking: true,
    sortOrder: 10,
    active: true
  },
  {
    no: 'BL-PNE',
    moment: 'before_loading',
    label: 'Pneumatiques',
    blocking: true,
    sortOrder: 20,
    active: true
  },
  {
    no: 'BL-ECL',
    moment: 'before_loading',
    label: 'Éclairage et signalisation',
    blocking: true,
    sortOrder: 30,
    active: true
  },
  {
    no: 'BL-ATT',
    moment: 'before_loading',
    label: "Dispositif d'attelage",
    blocking: true,
    sortOrder: 40,
    active: true
  },
  {
    no: 'BL-NIV',
    moment: 'before_loading',
    label: 'Niveaux (huile, liquide de refroidissement)',
    blocking: false,
    sortOrder: 50,
    active: true
  },
  {
    no: 'BL-PLA',
    moment: 'before_loading',
    label: 'Plateau et ridelles propres',
    blocking: false,
    sortOrder: 60,
    active: true
  },
  {
    no: 'TR-CAR',
    moment: 'trip_return',
    label: 'Carrosserie (chocs, rayures)',
    blocking: false,
    sortOrder: 10,
    active: true
  },
  {
    no: 'TR-PNE',
    moment: 'trip_return',
    label: 'Pneumatiques',
    blocking: true,
    sortOrder: 20,
    active: true
  },
  {
    no: 'TR-FRN',
    moment: 'trip_return',
    label: 'Freinage',
    blocking: true,
    sortOrder: 30,
    active: true
  },
  {
    no: 'TR-FUI',
    moment: 'trip_return',
    label: 'Fuites sous le véhicule',
    blocking: true,
    sortOrder: 40,
    active: true
  },
  {
    no: 'TR-TAB',
    moment: 'trip_return',
    label: 'Voyants du tableau de bord',
    blocking: false,
    sortOrder: 50,
    active: true
  },
  {
    no: 'TR-EQP',
    moment: 'trip_return',
    label: 'Équipements embarqués présents',
    blocking: false,
    sortOrder: 60,
    active: true
  },
  {
    no: 'NV-DOC',
    moment: 'new_vehicle',
    label: 'Documents remis (carte grise, garantie)',
    blocking: true,
    sortOrder: 10,
    active: true
  },
  {
    no: 'NV-VIN',
    moment: 'new_vehicle',
    label: 'VIN conforme aux documents',
    blocking: true,
    sortOrder: 20,
    active: true
  },
  {
    no: 'NV-EQP',
    moment: 'new_vehicle',
    label: 'Équipements livrés',
    blocking: false,
    sortOrder: 30,
    active: true
  },
  {
    no: 'NV-ESS',
    moment: 'new_vehicle',
    label: 'Essai routier',
    blocking: true,
    sortOrder: 40,
    active: true
  },
  {
    no: 'NV-CAR',
    moment: 'new_vehicle',
    label: 'Aspect de la carrosserie',
    blocking: false,
    sortOrder: 50,
    active: true
  }
]

export const vehicleCheckPointsCollection: CollectionDefinition<VehicleCheckPointRow> = {
  name: 'vehicle-check-points',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
