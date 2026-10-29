import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

/**
 * Reference consumption of one vehicle, on one corridor (an itinéraire type) or on every corridor
 * when the corridor is empty.
 */
export interface FuelReferenceRow extends MockRow {
  vehicleNo: string
  routeTemplateNo: string | null
  referenceL100: number
  comment: string
}

const SEED: Omit<FuelReferenceRow, keyof typeof seedAudit>[] = [
  {
    no: 'CREF-001',
    vehicleNo: 'VEH-001',
    routeTemplateNo: null,
    referenceL100: 35.5,
    comment: 'Mesurée sur les six premiers mois après la révision moteur.'
  },
  {
    no: 'CREF-002',
    vehicleNo: 'VEH-004',
    routeTemplateNo: null,
    referenceL100: 34.5,
    comment: ''
  },
  {
    no: 'CREF-003',
    vehicleNo: 'VEH-003',
    routeTemplateNo: 'TNR-TOA',
    referenceL100: 34,
    comment: 'Montée de la falaise de l’Angavo à pleine charge.'
  }
]

export const fuelReferencesCollection: CollectionDefinition<FuelReferenceRow> = {
  name: 'fuel-references',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
