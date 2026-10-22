import type { AuditFields } from '../db/collection'

/** Audit fields of the demo data, as if loaded by the administrator when the system went live. */
export const seedAudit: AuditFields = {
  createdAt: '2026-09-01T08:00:00.000Z',
  createdBy: 'ADM001',
  modifiedAt: '2026-09-01T08:00:00.000Z',
  modifiedBy: 'ADM001'
}
