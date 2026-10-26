import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface FuelGapCauseRow extends MockRow {
  name: string
  chargeable: boolean
  active: boolean
}

const SEED: Omit<FuelGapCauseRow, keyof typeof seedAudit>[] = [
  {
    no: 'TECHNICAL',
    name: 'Problème technique du véhicule',
    chargeable: false,
    active: true
  },
  {
    no: 'DRIVING',
    name: 'Conduite non économe',
    chargeable: true,
    active: true
  },
  {
    no: 'SIPHONING',
    name: 'Prélèvement de carburant',
    chargeable: true,
    active: true
  },
  {
    no: 'ENTRY-ERROR',
    name: 'Erreur de saisie',
    chargeable: false,
    active: true
  },
  {
    no: 'ROUTE',
    name: 'Itinéraire ou charge inhabituels',
    chargeable: false,
    active: true
  }
]

export const fuelGapCausesCollection: CollectionDefinition<FuelGapCauseRow> = {
  name: 'fuel-gap-causes',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
