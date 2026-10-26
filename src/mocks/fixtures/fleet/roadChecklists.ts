import type { CheckResult } from '@/modules/fleet/check-points/domain/checkResult'
import type { ChecklistStage } from '@/modules/fleet/road-checklists/types/roadChecklist.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'
import { checkPointsCollection } from './checkPoints'

export interface RoadChecklistRow extends MockRow {
  tripNo: string
  stage: ChecklistStage
  takenAt: string
  results: CheckResult[]
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

const reading = (
  no: string,
  tripNo: string,
  stage: ChecklistStage,
  takenAt: string,
  anomalies?: Record<string, string>
) => ({ no, tripNo, stage, takenAt, results: results(anomalies) })

const SEED: Omit<RoadChecklistRow, keyof typeof seedAudit>[] = [
  reading('CKL-00001', 'TRP-00002', 'departure', '2026-08-20T04:40:00'),
  reading('CKL-00002', 'TRP-00002', 'arrival', '2026-08-20T13:05:00', {
    PNE: 'Pneu arrière droit sous-gonflé, regonflé à l’arrivée.'
  }),
  reading('CKL-00003', 'TRP-00001', 'departure', '2026-08-24T05:10:00'),
  reading('CKL-00004', 'TRP-00006', 'departure', '2026-09-04T05:35:00'),
  reading('CKL-00005', 'TRP-00007', 'departure', '2026-09-04T09:30:00', {
    KLX: 'Klaxon faible, à vérifier au retour.'
  })
]

export const roadChecklistsCollection: CollectionDefinition<RoadChecklistRow> = {
  name: 'road-checklists',
  seed: () =>
    SEED.map((row) => ({ ...row, ...seedAudit, createdBy: 'FLT001', modifiedBy: 'FLT001' })),
  dateFields: ['takenAt']
}
