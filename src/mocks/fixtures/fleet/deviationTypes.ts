import type {
  DeviationCategory,
  DeviationSeverity,
  DeviationUnit
} from '@/modules/fleet/deviation-types/types/deviationType.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface DeviationTypeRow extends MockRow {
  name: string
  category: DeviationCategory
  severity: DeviationSeverity
  threshold: number | null
  unit: DeviationUnit | null
  autoDetected: boolean
  active: boolean
}

const SEED: Omit<DeviationTypeRow, keyof typeof seedAudit>[] = [
  {
    no: 'MISSED-STOP',
    name: 'Point de passage manqué',
    category: 'route',
    severity: 'major',
    threshold: null,
    unit: null,
    autoDetected: true,
    active: true
  },
  {
    no: 'STOP-ORDER',
    name: 'Ordre de passage non respecté',
    category: 'route',
    severity: 'minor',
    threshold: null,
    unit: null,
    autoDetected: true,
    active: true
  },
  {
    no: 'TRIP-TIME',
    name: 'Dépassement du temps de trajet',
    category: 'route',
    severity: 'minor',
    threshold: 30,
    unit: 'min',
    autoDetected: true,
    active: true
  },
  {
    no: 'KM-GAP',
    name: 'Écart kilométrique',
    category: 'route',
    severity: 'minor',
    threshold: 5,
    unit: 'percent',
    autoDetected: true,
    active: true
  },
  {
    no: 'OFF-ROUTE',
    name: 'Sortie du corridor',
    category: 'route',
    severity: 'major',
    threshold: 3000,
    unit: 'm',
    autoDetected: true,
    active: true
  },
  {
    no: 'TIME-WINDOW',
    name: 'Hors fenêtre horaire',
    category: 'route',
    severity: 'minor',
    threshold: 60,
    unit: 'min',
    autoDetected: true,
    active: true
  },
  {
    no: 'UNPLANNED-STOP',
    name: 'Arrêt non planifié',
    category: 'stop',
    severity: 'critical',
    threshold: 20,
    unit: 'min',
    autoDetected: true,
    active: true
  },
  {
    no: 'REST-PLACE',
    name: 'Repos hors parking désigné',
    category: 'stop',
    severity: 'major',
    threshold: 60,
    unit: 'min',
    autoDetected: true,
    active: true
  },
  {
    no: 'CONTINUOUS-DRIVING',
    name: 'Conduite continue dépassée',
    category: 'time',
    severity: 'critical',
    threshold: null,
    unit: 'min',
    autoDetected: true,
    active: false
  },
  {
    no: 'DAILY-DRIVING',
    name: 'Conduite journalière dépassée',
    category: 'time',
    severity: 'critical',
    threshold: null,
    unit: 'min',
    autoDetected: true,
    active: false
  },
  {
    no: 'DAILY-WORK',
    name: 'Travail journalier dépassé',
    category: 'time',
    severity: 'major',
    threshold: null,
    unit: 'min',
    autoDetected: true,
    active: false
  },
  {
    no: 'WEEKLY-REST',
    name: 'Repos hebdomadaire insuffisant',
    category: 'time',
    severity: 'major',
    threshold: null,
    unit: 'h',
    autoDetected: true,
    active: false
  },
  {
    no: 'NIGHT-DRIVING',
    name: 'Conduite de nuit non autorisée',
    category: 'time',
    severity: 'major',
    threshold: null,
    unit: null,
    autoDetected: true,
    active: true
  }
]

export const deviationTypesCollection: CollectionDefinition<DeviationTypeRow> = {
  name: 'deviation-types',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
