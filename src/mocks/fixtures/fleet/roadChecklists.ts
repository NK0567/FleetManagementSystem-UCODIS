import type { CheckResult } from '@/modules/fleet/check-points/domain/checkResult'
import type { ChecklistStage } from '@/modules/fleet/road-checklists/types/roadChecklist.types'
import { addMinutes } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'
import { checkPointsCollection } from './checkPoints'

export interface RoadChecklistRow extends MockRow {
  tripNo: string
  stage: ChecklistStage
  takenAt: string
  /** Where the driver stopped to take it, as he names the place. */
  location?: string
  results: CheckResult[]
  /** When the driver of the trip signed the checklist on his phone; null when unsigned. */
  signedAt?: string | null
  /** Who signed it when it was keyed from the office, rather than by the driver. */
  signedBy?: string | null
  /** When the checklist reached the server; taken without network, it arrives later. */
  syncedAt?: string | null
  capturedOffline?: boolean
}

/** Every active vehicle point checked fine, but for the anomalies given. */
function results(anomalies: Record<string, string> = {}): CheckResult[] {
  return checkPointsCollection
    .seed()
    .filter((point) => point.scope === 'vehicle' && point.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((point) => ({
      pointNo: point.no,
      label: point.label,
      blocking: point.blocking,
      result: anomalies[point.no] ? 'anomaly' : 'ok',
      comment: anomalies[point.no] ?? ''
    }))
}

/** Readings are signed by the driver and reach the server a few minutes after they are taken. */
const reading = (
  no: string,
  tripNo: string,
  stage: ChecklistStage,
  takenAt: string,
  anomalies?: Record<string, string>,
  sync: { signed?: boolean; offlineMin?: number } = {}
) => ({
  no,
  tripNo,
  stage,
  takenAt,
  results: results(anomalies),
  signedAt: sync.signed === false ? null : takenAt,
  syncedAt: addMinutes(takenAt, sync.offlineMin ?? 2),
  capturedOffline: !!sync.offlineMin
})

const SEED: Omit<RoadChecklistRow, keyof typeof seedAudit>[] = [
  reading('CKL-00001', 'TRP-00002', 'departure', '2026-08-20T04:40:00'),
  reading(
    'CKL-00002',
    'TRP-00002',
    'arrival',
    '2026-08-20T13:05:00',
    { PNE: 'Pneu arrière droit sous-gonflé, regonflé à l’arrivée.' },
    { offlineMin: 47 }
  ),
  reading('CKL-00003', 'TRP-00001', 'departure', '2026-08-24T05:10:00', {}, { signed: false }),
  reading('CKL-00004', 'TRP-00006', 'departure', '2026-09-04T05:35:00'),
  reading('CKL-00005', 'TRP-00007', 'departure', '2026-09-04T09:30:00', {
    KLX: 'Klaxon faible, à vérifier au retour.'
  })
]

export const roadChecklistsCollection: CollectionDefinition<RoadChecklistRow> = {
  name: 'road-checklists',
  seed: () =>
    SEED.map((row) => ({ ...row, ...seedAudit, createdBy: 'FLT001', modifiedBy: 'FLT001' })),
  dateFields: ['takenAt', 'signedAt', 'syncedAt']
}
