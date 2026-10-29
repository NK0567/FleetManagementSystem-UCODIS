import type { ProviderType } from '@/modules/fleet/providers/types/provider.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface ProviderTypeRow extends MockRow {
  name: string
  /** The role the application looks for; null for a type the company added for itself. */
  systemRole: ProviderType | null
  active: boolean
}

/** The types the application works with keep their role as code, so that existing providers keep theirs. */
const SEED: Omit<ProviderTypeRow, keyof typeof seedAudit>[] = [
  { no: 'garage', name: 'Atelier', systemRole: 'garage', active: true },
  {
    no: 'parts_supplier',
    name: 'Fournisseur de pièces',
    systemRole: 'parts_supplier',
    active: true
  },
  { no: 'tyre_supplier', name: 'Fournisseur de pneus', systemRole: 'tyre_supplier', active: true },
  {
    no: 'fuel_supplier',
    name: 'Fournisseur de carburant',
    systemRole: 'fuel_supplier',
    active: true
  },
  { no: 'insurer', name: 'Assureur', systemRole: 'insurer', active: true },
  { no: 'manufacturer', name: 'Constructeur', systemRole: 'manufacturer', active: true },
  { no: 'bank', name: 'Banque', systemRole: 'bank', active: true },
  { no: 'carrier', name: 'Transporteur', systemRole: 'carrier', active: true }
]

export const providerTypesCollection: CollectionDefinition<ProviderTypeRow> = {
  name: 'provider-types',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
