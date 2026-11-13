import type {
  MedicalFollowUpKind,
  MedicalFollowUpResult
} from '@/modules/fleet/medical-follow-ups/domain/medicalFollowUp'
import { addDays } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { seedAudit } from '../seedAudit'

export interface MedicalFollowUpRow extends MockRow {
  employeeNo: string
  kind: MedicalFollowUpKind
  doneOn: string
  result: MedicalFollowUpResult
  provider: string
  nextDueOn: string | null
  lostDays?: number | null
  followUp: string
}

const day = (days: number) => addDays(DEMO_REFERENCE_DATE, days)
const CENTER = 'Centre de médecine du travail'

const SEED: Omit<MedicalFollowUpRow, keyof typeof seedAudit>[] = [
  {
    no: 'MED-00001',
    employeeNo: 'UCT-012',
    kind: 'visit',
    doneOn: day(-120),
    result: 'fit',
    provider: CENTER,
    nextDueOn: day(245),
    lostDays: 0,
    followUp: ''
  },
  {
    no: 'MED-00002',
    employeeNo: 'UCT-012',
    kind: 'alcohol_test',
    doneOn: day(-3),
    result: 'negative',
    provider: 'Contrôle au départ',
    nextDueOn: null,
    lostDays: 0,
    followUp: ''
  },
  {
    no: 'MED-00003',
    employeeNo: 'UCT-013',
    kind: 'visit',
    doneOn: day(-340),
    result: 'fit_restrictions',
    provider: CENTER,
    nextDueOn: day(-10),
    lostDays: 0,
    followUp: 'Port de verres correcteurs obligatoire. Renouvellement à planifier.'
  },
  {
    no: 'MED-00004',
    employeeNo: 'UCT-014',
    kind: 'psychotechnic',
    doneOn: day(-200),
    result: 'fit',
    provider: CENTER,
    nextDueOn: day(165),
    lostDays: 0,
    followUp: ''
  },
  {
    no: 'MED-00005',
    employeeNo: 'UCT-014',
    kind: 'vaccination',
    doneOn: day(-60),
    result: 'fit',
    provider: 'Centre de santé',
    nextDueOn: day(20),
    lostDays: 0,
    followUp: ''
  },
  {
    no: 'MED-00006',
    employeeNo: 'UCT-015',
    kind: 'visit',
    doneOn: day(-1),
    result: 'pending',
    provider: CENTER,
    nextDueOn: null,
    lostDays: null,
    followUp: ''
  },
  {
    no: 'MED-00007',
    employeeNo: 'UCT-016',
    kind: 'drug_test',
    doneOn: day(-30),
    result: 'negative',
    provider: 'Laboratoire agréé',
    nextDueOn: day(150),
    lostDays: 0,
    followUp: ''
  }
]

export const medicalFollowUpsCollection: CollectionDefinition<MedicalFollowUpRow> = {
  name: 'medicalFollowUps',
  seed: () =>
    SEED.map((row) => ({ ...row, ...seedAudit, createdBy: 'FLT001', modifiedBy: 'FLT001' })),
  dateFields: ['doneOn', 'nextDueOn']
}
