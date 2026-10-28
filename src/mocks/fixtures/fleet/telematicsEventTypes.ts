import type {
  TelematicsFamily,
  TelematicsSeverity,
  TelematicsUnit
} from '@/modules/fleet/telematics-event-types/types/telematicsEventType.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface TelematicsEventTypeRow extends MockRow {
  name: string
  family: TelematicsFamily
  severity: TelematicsSeverity
  threshold: number | null
  unit: TelematicsUnit | null
  raisesAlert: boolean
  affectsScore: boolean
  infractionTypeNo: string | null
  active: boolean
}

const SEED: Omit<TelematicsEventTypeRow, keyof typeof seedAudit>[] = [
  {
    no: 'SPEEDING',
    name: 'Excès de vitesse',
    family: 'behavior',
    severity: 'major',
    threshold: 90,
    unit: 'kmh',
    raisesAlert: true,
    affectsScore: true,
    infractionTypeNo: 'SPEED',
    active: true
  },
  {
    no: 'HARSH-BRAKING',
    name: 'Freinage brusque',
    family: 'behavior',
    severity: 'minor',
    threshold: 0.45,
    unit: 'g',
    raisesAlert: false,
    affectsScore: true,
    infractionTypeNo: 'HARSH-BRAKING',
    active: true
  },
  {
    no: 'HARSH-ACCEL',
    name: 'Accélération brusque',
    family: 'behavior',
    severity: 'minor',
    threshold: 0.4,
    unit: 'g',
    raisesAlert: false,
    affectsScore: true,
    infractionTypeNo: 'HARSH-ACCEL',
    active: true
  },
  {
    no: 'SHARP-TURN',
    name: 'Virage brusque',
    family: 'behavior',
    severity: 'minor',
    threshold: 0.4,
    unit: 'g',
    raisesAlert: false,
    affectsScore: true,
    infractionTypeNo: null,
    active: true
  },
  {
    no: 'NIGHT-DRIVING',
    name: 'Conduite de nuit',
    family: 'behavior',
    severity: 'major',
    threshold: null,
    unit: null,
    raisesAlert: true,
    affectsScore: true,
    infractionTypeNo: null,
    active: true
  },
  {
    no: 'DROWSINESS',
    name: 'Somnolence détectée',
    family: 'camera',
    severity: 'critical',
    threshold: null,
    unit: null,
    raisesAlert: true,
    affectsScore: true,
    infractionTypeNo: 'DROWSINESS',
    active: true
  },
  {
    no: 'PHONE',
    name: 'Téléphone au volant',
    family: 'camera',
    severity: 'major',
    threshold: null,
    unit: null,
    raisesAlert: true,
    affectsScore: true,
    infractionTypeNo: 'PHONE',
    active: true
  },
  {
    no: 'SEATBELT',
    name: 'Ceinture non attachée',
    family: 'camera',
    severity: 'major',
    threshold: null,
    unit: null,
    raisesAlert: false,
    affectsScore: true,
    infractionTypeNo: 'SEATBELT',
    active: true
  },
  {
    no: 'CAMERA-MASKED',
    name: 'Caméra masquée',
    family: 'camera',
    severity: 'major',
    threshold: null,
    unit: null,
    raisesAlert: true,
    affectsScore: false,
    infractionTypeNo: 'CAMERA-MASKED',
    active: true
  },
  {
    no: 'ENGINE-FAULT',
    name: 'Code défaut moteur',
    family: 'fault',
    severity: 'major',
    threshold: null,
    unit: null,
    raisesAlert: true,
    affectsScore: false,
    infractionTypeNo: null,
    active: true
  },
  {
    no: 'OVERHEAT',
    name: 'Surchauffe moteur',
    family: 'fault',
    severity: 'critical',
    threshold: 105,
    unit: 'celsius',
    raisesAlert: true,
    affectsScore: false,
    infractionTypeNo: null,
    active: true
  },
  {
    no: 'SIGNAL-LOST',
    name: 'Perte de signal',
    family: 'signal',
    severity: 'minor',
    threshold: 15,
    unit: 'min',
    raisesAlert: false,
    affectsScore: false,
    infractionTypeNo: null,
    active: true
  },
  {
    no: 'SITE-ENTRY',
    name: 'Entrée sur site',
    family: 'site',
    severity: 'minor',
    threshold: null,
    unit: null,
    raisesAlert: false,
    affectsScore: false,
    infractionTypeNo: null,
    active: true
  },
  {
    no: 'SITE-EXIT',
    name: 'Sortie de site',
    family: 'site',
    severity: 'minor',
    threshold: null,
    unit: null,
    raisesAlert: false,
    affectsScore: false,
    infractionTypeNo: null,
    active: true
  },
  {
    no: 'LONG-STOP',
    name: 'Arrêt prolongé hors site',
    family: 'stop',
    severity: 'major',
    threshold: 20,
    unit: 'min',
    raisesAlert: true,
    affectsScore: false,
    infractionTypeNo: null,
    active: true
  },
  {
    no: 'IDLING',
    name: 'Moteur au ralenti prolongé',
    family: 'stop',
    severity: 'minor',
    threshold: 15,
    unit: 'min',
    raisesAlert: false,
    affectsScore: true,
    infractionTypeNo: null,
    active: true
  }
]

export const telematicsEventTypesCollection: CollectionDefinition<TelematicsEventTypeRow> = {
  name: 'telematics-event-types',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
