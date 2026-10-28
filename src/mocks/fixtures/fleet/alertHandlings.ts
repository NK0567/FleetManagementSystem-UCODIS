import type { AlertCategory, AlertHandling } from '@/modules/fleet/alerts/domain/alert'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

/** What was done with an alert, under the stable key of its signal. */
export interface AlertHandlingRow extends MockRow, AlertHandling {
  category: AlertCategory
  /** Kept so a resolved alert still says what it was about. */
  subject: string
  detail: string
}

const SEED: Omit<AlertHandlingRow, keyof typeof seedAudit>[] = [
  {
    no: 'departure.AUT-2026-0006',
    category: 'departure',
    subject: 'TRP-00006',
    detail: 'Départ en attente de décision',
    acknowledgedBy: 'FLT001',
    acknowledgedAt: '2026-09-04T05:40:00.000Z',
    handledBy: 'FLT001',
    handledAt: '2026-09-04T05:50:00.000Z',
    comment: 'Départ accordé après la check-list.'
  },
  {
    no: 'inspection.INS-00004',
    category: 'inspection',
    subject: 'CT 4202',
    detail: 'Contre-visite à passer',
    acknowledgedBy: 'MNT001',
    acknowledgedAt: '2026-08-26T08:00:00.000Z',
    handledBy: null,
    handledAt: null,
    comment: ''
  }
]

export const alertHandlingsCollection: CollectionDefinition<AlertHandlingRow> = {
  name: 'alert-handlings',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['acknowledgedAt', 'handledAt']
}
