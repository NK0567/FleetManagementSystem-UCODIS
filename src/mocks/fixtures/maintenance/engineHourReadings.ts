import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

/** One reading of the hour meter of a vehicle: the latest one is its current engine hours. */
export interface EngineHourReadingRow extends MockRow {
  vehicleNo: string
  hours: number
  readAt: string
  recordedBy: string
}

const reading = (no: string, vehicleNo: string, hours: number, readAt: string) => ({
  no,
  vehicleNo,
  hours,
  readAt,
  recordedBy: 'MNT001'
})

const SEED: Omit<EngineHourReadingRow, keyof typeof seedAudit>[] = [
  reading('HRS-00001', 'VEH-001', 5_900, '2026-08-18T09:00:00'),
  reading('HRS-00002', 'VEH-001', 6_120, '2026-09-01T07:30:00'),
  reading('HRS-00003', 'VEH-002', 5_150, '2026-08-28T08:00:00'),
  reading('HRS-00004', 'VEH-002', 5_400, '2026-09-01T07:30:00'),
  reading('HRS-00005', 'VEH-003', 4_870, '2026-09-01T07:30:00')
]

export const engineHourReadingsCollection: CollectionDefinition<EngineHourReadingRow> = {
  name: 'engine-hour-readings',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['readAt']
}
