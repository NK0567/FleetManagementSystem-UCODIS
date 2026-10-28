import type { InfractionSeverity } from '@/modules/fleet/infraction-types/types/infractionType.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface InfractionTypeRow extends MockRow {
  name: string
  defaultSeverity: InfractionSeverity
  active: boolean
}

const SEED: Omit<InfractionTypeRow, keyof typeof seedAudit>[] = [
  {
    no: 'SPEED',
    name: 'Excès de vitesse',
    defaultSeverity: 'major',
    active: true
  },
  {
    no: 'HARSH-BRAKING',
    name: 'Freinage brusque',
    defaultSeverity: 'minor',
    active: true
  },
  {
    no: 'PHONE',
    name: 'Téléphone au volant',
    defaultSeverity: 'major',
    active: true
  },
  {
    no: 'HARSH-ACCEL',
    name: 'Accélération brusque',
    defaultSeverity: 'minor',
    active: true
  },
  {
    no: 'DROWSINESS',
    name: 'Somnolence au volant',
    defaultSeverity: 'serious',
    active: true
  },
  {
    no: 'SEATBELT',
    name: 'Ceinture non attachée',
    defaultSeverity: 'major',
    active: true
  },
  {
    no: 'CAMERA-MASKED',
    name: 'Caméra masquée',
    defaultSeverity: 'serious',
    active: true
  },
  {
    no: 'DRIVING-TIME',
    name: 'Dépassement du temps de conduite',
    defaultSeverity: 'major',
    active: true
  },
  {
    no: 'RED-LIGHT',
    name: 'Franchissement de feu ou de stop',
    defaultSeverity: 'serious',
    active: true
  },
  {
    no: 'OVERLOAD',
    name: 'Surcharge',
    defaultSeverity: 'major',
    active: true
  }
]

export const infractionTypesCollection: CollectionDefinition<InfractionTypeRow> = {
  name: 'infraction-types',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
