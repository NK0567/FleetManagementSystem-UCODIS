import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

/** One operation of a plan done on a vehicle: the next due point starts from the latest one. */
export interface ServiceRecordRow extends MockRow {
  vehicleNo: string
  operationNo: string
  km: number | null
  date: string
  workOrderNo: string | null
  recordedBy: string
}

const record = (
  no: string,
  vehicleNo: string,
  operationNo: string,
  km: number,
  date: string,
  workOrderNo: string | null = null
) => ({ no, vehicleNo, operationNo, km, date, workOrderNo, recordedBy: 'MNT001' })

const SEED: Omit<ServiceRecordRow, keyof typeof seedAudit>[] = [
  record('PAS-00001', 'VEH-001', 'OP-010', 175_000, '2026-07-10'),
  record('PAS-00002', 'VEH-001', 'OP-011', 175_000, '2026-07-10'),
  record('PAS-00003', 'VEH-001', 'OP-012', 175_000, '2026-07-10'),
  record('PAS-00004', 'VEH-001', 'OP-001', 180_420, '2026-08-18', 'OT-2026-0001'),
  record('PAS-00005', 'VEH-001', 'OP-002', 180_420, '2026-08-18', 'OT-2026-0001'),
  record('PAS-00006', 'VEH-002', 'OP-001', 165_900, '2026-08-28'),
  record('PAS-00007', 'VEH-002', 'OP-002', 165_900, '2026-08-28'),
  record('PAS-00008', 'VEH-002', 'OP-012', 155_000, '2026-06-02'),
  record('PAS-00009', 'VEH-010', 'OP-013', 103_000, '2026-07-21')
]

export const serviceRecordsCollection: CollectionDefinition<ServiceRecordRow> = {
  name: 'service-records',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['date']
}
