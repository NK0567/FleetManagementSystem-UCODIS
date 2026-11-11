import type { TrainingReason } from '@/modules/fleet/trainings/types/training.types'
import { addDays } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { seedAudit } from '../seedAudit'

export interface TrainingRow extends MockRow {
  employeeNo: string
  topic: string
  reason: TrainingReason
  originNo: string
  plannedOn: string | null
  trainer: string
  attendedOn: string | null
  result: string
  /** Mark out of 20 given when the training was followed. */
  score?: number | null
  /** When the driver is due for the next training. */
  nextTrainingOn?: string | null
  cancelledAt: string | null
  cancelReason: string
}

const day = (days: number) => addDays(DEMO_REFERENCE_DATE, days)
const pending = { attendedOn: null, result: '', cancelledAt: null, cancelReason: '' }
const SCHOOL = 'Auto-école Hautes Terres'

const SEED: Omit<TrainingRow, keyof typeof seedAudit>[] = [
  {
    no: 'FOR-00001',
    employeeNo: 'UCT-012',
    topic: 'Conduite défensive',
    reason: 'other',
    originNo: '',
    plannedOn: day(-60),
    trainer: SCHOOL,
    attendedOn: day(-60),
    result: 'Validée, très bon niveau.',
    score: 17,
    nextTrainingOn: day(120),
    cancelledAt: null,
    cancelReason: ''
  },
  {
    no: 'FOR-00002',
    employeeNo: 'UCT-016',
    topic: 'Mise à jour de la réglementation du transport de matières dangereuses',
    reason: 'other',
    originNo: '',
    plannedOn: day(-25),
    trainer: SCHOOL,
    attendedOn: null,
    result: '',
    cancelledAt: `${day(-27)}T10:00:00.000Z`,
    cancelReason: 'Autorisation de conduite retirée : formation reportée à son rétablissement.'
  },
  {
    no: 'FOR-00003',
    employeeNo: 'UCT-015',
    topic: 'Conduite en milieu urbain',
    reason: 'accident',
    originNo: 'SIN-2026-002',
    plannedOn: null,
    trainer: '',
    ...pending
  },
  {
    no: 'FOR-00006',
    employeeNo: 'UCT-013',
    topic: 'Conduite défensive',
    reason: 'other',
    originNo: '',
    plannedOn: day(-90),
    trainer: SCHOOL,
    attendedOn: day(-90),
    result: 'Acquis, à revoir sur le freinage en descente.',
    score: 12,
    nextTrainingOn: day(14),
    cancelledAt: null,
    cancelReason: ''
  },
  {
    no: 'FOR-00007',
    employeeNo: 'UCT-014',
    topic: 'Sécurité du transport de carburant',
    reason: 'other',
    originNo: '',
    plannedOn: day(-45),
    trainer: SCHOOL,
    attendedOn: day(-45),
    result: 'Validée.',
    score: 15,
    nextTrainingOn: day(-3),
    cancelledAt: null,
    cancelReason: ''
  },
  {
    no: 'FOR-00004',
    employeeNo: 'UCT-013',
    topic: 'Excès de vitesse',
    reason: 'infraction',
    originNo: 'INF-2026-001',
    plannedOn: day(6),
    trainer: SCHOOL,
    ...pending
  },
  {
    no: 'FOR-00005',
    employeeNo: 'UCT-014',
    topic: 'Éco-conduite',
    reason: 'score',
    originNo: 'SCORE-2026-08',
    plannedOn: day(12),
    trainer: 'Formateur interne',
    ...pending
  }
]

export const trainingsCollection: CollectionDefinition<TrainingRow> = {
  name: 'trainings',
  seed: () =>
    SEED.map((row) => ({ ...row, ...seedAudit, createdBy: 'FLT001', modifiedBy: 'FLT001' })),
  dateFields: ['plannedOn', 'attendedOn', 'nextTrainingOn', 'cancelledAt']
}
