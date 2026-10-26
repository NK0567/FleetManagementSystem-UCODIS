import type { CheckPointScope } from '@/modules/fleet/check-points/types/checkPoint.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface CheckPointRow extends MockRow {
  label: string
  scope: CheckPointScope
  blocking: boolean
  sortOrder: number
  active: boolean
}

const SEED: Omit<CheckPointRow, keyof typeof seedAudit>[] = [
  {
    no: 'FRS',
    label: 'Frein de service',
    scope: 'vehicle',
    blocking: true,
    sortOrder: 10,
    active: true
  },
  {
    no: 'FST',
    label: 'Frein de stationnement',
    scope: 'vehicle',
    blocking: true,
    sortOrder: 20,
    active: true
  },
  {
    no: 'FLX',
    label: "Flexibles : fuite d'air, branchement",
    scope: 'vehicle',
    blocking: true,
    sortOrder: 30,
    active: true
  },
  {
    no: 'DIR',
    label: 'Direction',
    scope: 'vehicle',
    blocking: true,
    sortOrder: 40,
    active: true
  },
  {
    no: 'KLX',
    label: 'Klaxon',
    scope: 'vehicle',
    blocking: false,
    sortOrder: 50,
    active: true
  },
  {
    no: 'ESG',
    label: 'Essuie-glace',
    scope: 'vehicle',
    blocking: false,
    sortOrder: 60,
    active: true
  },
  {
    no: 'RET',
    label: 'Rétroviseurs',
    scope: 'vehicle',
    blocking: false,
    sortOrder: 70,
    active: true
  },
  {
    no: 'SEC',
    label: 'Matériel de secours : réflecteur, panneau',
    scope: 'vehicle',
    blocking: false,
    sortOrder: 80,
    active: true
  },
  {
    no: 'ECL',
    label: 'Éclairage et signalisation',
    scope: 'vehicle',
    blocking: true,
    sortOrder: 90,
    active: true
  },
  {
    no: 'PNE',
    label: 'Pneumatiques : clous, gonflage',
    scope: 'vehicle',
    blocking: true,
    sortOrder: 100,
    active: true
  },
  {
    no: 'SUS',
    label: 'Suspension',
    scope: 'vehicle',
    blocking: false,
    sortOrder: 110,
    active: true
  },
  {
    no: 'CHA',
    label: 'Cadre de châssis',
    scope: 'vehicle',
    blocking: false,
    sortOrder: 120,
    active: true
  },
  {
    no: 'ATT',
    label: "Dispositif d'attelage : sellette, cadenas, chaîne",
    scope: 'vehicle',
    blocking: true,
    sortOrder: 130,
    active: true
  },
  {
    no: 'EXT',
    label: 'Extincteurs : date, plomb, goupille, pression',
    scope: 'vehicle',
    blocking: true,
    sortOrder: 140,
    active: true
  },
  {
    no: 'CAL',
    label: 'Cales',
    scope: 'vehicle',
    blocking: false,
    sortOrder: 150,
    active: true
  },
  {
    no: 'BAC',
    label: 'Bâche et sanglage du chargement',
    scope: 'vehicle',
    blocking: false,
    sortOrder: 160,
    active: true
  },
  {
    no: 'ALC',
    label: 'Test alcool et drogue négatif',
    scope: 'driver',
    blocking: true,
    sortOrder: 10,
    active: true
  },
  {
    no: 'BRF',
    label: 'Briefing sécurité réalisé',
    scope: 'driver',
    blocking: true,
    sortOrder: 20,
    active: true
  }
]

export const checkPointsCollection: CollectionDefinition<CheckPointRow> = {
  name: 'check-points',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
