import type { MobileInterventionApi } from '@/modules/maintenance/mobile-interventions/types/mobileIntervention.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export type MobileInterventionRow = MockRow &
  Pick<
    MobileInterventionApi,
    | 'missionTypeNo'
    | 'vehicleNo'
    | 'location'
    | 'departedAt'
    | 'crewNos'
    | 'arrivedAt'
    | 'closedAt'
    | 'closedBy'
    | 'resolved'
    | 'observation'
    | 'checkCount'
    | 'positiveCount'
    | 'checkComment'
    | 'workOrderNo'
  >

const blank = {
  arrivedAt: null,
  closedAt: null,
  closedBy: null,
  resolved: null,
  observation: '',
  checkCount: null,
  positiveCount: null,
  checkComment: '',
  workOrderNo: null
}

const SEED: Omit<MobileInterventionRow, keyof typeof seedAudit>[] = [
  {
    ...blank,
    no: 'IM-2026-0001',
    missionTypeNo: 'ALCOHOL-DRUGS',
    vehicleNo: 'VEH-006',
    location: 'Dépôt Tanjombato, sortie des camions',
    departedAt: '2026-08-12T05:30:00',
    crewNos: ['UCT-003'],
    arrivedAt: '2026-08-12T05:45:00',
    closedAt: '2026-08-12T07:15:00',
    closedBy: 'MNT001',
    resolved: true,
    checkCount: 14,
    positiveCount: 1,
    checkComment: 'Un conducteur positif à l’éthylotest, retiré du planning.'
  },
  {
    ...blank,
    no: 'IM-2026-0002',
    missionTypeNo: 'MECHANICAL',
    vehicleNo: 'VEH-004',
    location: 'RN7, PK 42 après Ambatolampy',
    departedAt: '2026-08-21T14:10:00',
    crewNos: ['UCT-003', 'UCT-008'],
    arrivedAt: '2026-08-21T15:20:00',
    closedAt: '2026-08-21T17:00:00',
    closedBy: 'MNT001',
    resolved: true,
    observation: 'Durite de refroidissement remplacée sur place.'
  },
  {
    ...blank,
    no: 'IM-2026-0003',
    missionTypeNo: 'ELECTRICAL',
    vehicleNo: 'VEH-009',
    location: 'RN2, sortie de Moramanga',
    departedAt: '2026-09-03T09:00:00',
    crewNos: ['UCT-008'],
    arrivedAt: '2026-09-03T10:30:00'
  }
]

export const mobileInterventionsCollection: CollectionDefinition<MobileInterventionRow> = {
  name: 'mobile-interventions',
  seed: () => SEED.map((row) => ({ ...structuredClone(row), ...seedAudit })),
  dateFields: ['departedAt', 'arrivedAt', 'closedAt']
}
