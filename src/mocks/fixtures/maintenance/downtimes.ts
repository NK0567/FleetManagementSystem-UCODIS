import type { DowntimeOrigin } from '@/modules/maintenance/downtimes/domain/downtime'
import { addDays } from '@/utils/date'
import { DEMO_REFERENCE_DATE } from '../../clock'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface DowntimeRow extends MockRow {
  vehicleNo: string
  downtimeCodeNo: string
  /** Opened by hand, or by the work order that holds it. */
  origin: DowntimeOrigin
  startedAt: string
  comment: string
  endedAt: string | null
  endedBy: string | null
  endComment: string
}

const at = (days: number, time: string) => `${addDays(DEMO_REFERENCE_DATE, days)}T${time}:00`

const SEED: Omit<DowntimeRow, keyof typeof seedAudit>[] = [
  {
    no: 'IND-00001',
    vehicleNo: 'VEH-001',
    downtimeCodeNo: 'MTN',
    origin: 'manual',
    startedAt: '2026-08-18T07:00:00',
    comment: 'Vidange et filtres, entretien des 180 000 km.',
    endedAt: '2026-08-18T17:30:00',
    endedBy: 'FLT001',
    endComment: 'Entretien terminé.'
  },
  {
    no: 'IND-00002',
    vehicleNo: 'VEH-016',
    downtimeCodeNo: 'ADM',
    origin: 'manual',
    startedAt: '2026-08-05T08:00:00',
    comment: 'Carte grise en cours de renouvellement à la préfecture.',
    endedAt: '2026-08-12T16:00:00',
    endedBy: 'FLT001',
    endComment: 'Nouvelle carte grise reçue.'
  },
  {
    no: 'IND-00003',
    vehicleNo: 'VEH-010',
    downtimeCodeNo: 'PNN',
    origin: 'manual',
    startedAt: '2026-08-27T09:00:00',
    comment: "Fuite sur le circuit d'air, véhicule bloqué au dépôt.",
    endedAt: '2026-08-29T15:00:00',
    endedBy: 'FLT001',
    endComment: 'Raccord remplacé.'
  },
  {
    no: 'IND-00004',
    vehicleNo: 'VEH-008',
    downtimeCodeNo: 'PNN',
    origin: 'manual',
    startedAt: at(-2, '14:00'),
    comment: 'Le démarreur ne répond plus ; véhicule immobilisé au dépôt de Tanjombato.',
    endedAt: null,
    endedBy: null,
    endComment: ''
  }
]

export const downtimesCollection: CollectionDefinition<DowntimeRow> = {
  name: 'downtimes',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['startedAt', 'endedAt']
}
