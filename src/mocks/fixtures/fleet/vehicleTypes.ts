import type { CouplingRole } from '@/modules/fleet/vehicle-types/types/vehicleType.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface VehicleTypeRow extends MockRow {
  name: string
  motorized: boolean
  couplingRole: CouplingRole
  carriesGoods: boolean
  hasCompartments: boolean
  fuelReferenceL100: number | null
  active: boolean
}

const SEED: Omit<VehicleTypeRow, keyof typeof seedAudit>[] = [
  {
    no: 'TRACTOR',
    name: 'Tracteur',
    motorized: true,
    couplingRole: 'tows',
    carriesGoods: false,
    hasCompartments: false,
    fuelReferenceL100: 37,
    active: true
  },
  {
    no: 'SEMI-TRAILER',
    name: 'Semi-remorque',
    motorized: false,
    couplingRole: 'towed',
    carriesGoods: true,
    hasCompartments: false,
    fuelReferenceL100: null,
    active: true
  },
  {
    no: 'TANKER',
    name: 'Citerne',
    motorized: false,
    couplingRole: 'towed',
    carriesGoods: true,
    hasCompartments: true,
    fuelReferenceL100: null,
    active: true
  },
  {
    no: 'TRAILER',
    name: 'Remorque',
    motorized: false,
    couplingRole: 'towed',
    carriesGoods: true,
    hasCompartments: false,
    fuelReferenceL100: null,
    active: true
  }
]

export const vehicleTypesCollection: CollectionDefinition<VehicleTypeRow> = {
  name: 'vehicle-types',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
