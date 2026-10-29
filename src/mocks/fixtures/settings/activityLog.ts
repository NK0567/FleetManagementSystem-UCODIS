import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

/** An action the generic audit fields do not keep: a sign-in, an account switched off or on. */
export interface ActivityLogRow extends MockRow {
  at: string
  by: string
  action: 'login' | 'account_created' | 'account_updated' | 'account_disabled' | 'account_enabled'
  entity: string
  recordNo: string
  detail: string
}

export const activityLogCollection: CollectionDefinition<ActivityLogRow> = {
  name: 'activity-log',
  dateFields: ['at'],
  seed: () => [
    {
      no: 'LOG-000001',
      at: '2026-08-28T09:15:00',
      by: 'ADM001',
      action: 'account_disabled',
      entity: 'user-accounts',
      recordNo: 'CND009',
      detail: 'Habilitation retirée : visite médicale expirée.',
      ...seedAudit
    }
  ]
}
