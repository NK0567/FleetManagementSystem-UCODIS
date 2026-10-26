import type { TelematicsSource } from '@/modules/fleet/telematics-events/types/telematicsEvent.types'
import { addDays } from '@/utils/date'
import { DEMO_REFERENCE_DATE } from '../../clock'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface TelematicsEventRow extends MockRow {
  eventTypeNo: string
  vehicleNo: string
  /** Who drove and on which trip, as known when the event came in. */
  driverNo: string | null
  tripNo: string | null
  occurredAt: string
  source: TelematicsSource
  value: number | null
  latitude: number | null
  longitude: number | null
  detail: string
  infractionNo: string | null
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  acknowledgementComment: string
}

type Seed = Omit<TelematicsEventRow, keyof typeof seedAudit>

const at = (days: number, time: string) => `${addDays(DEMO_REFERENCE_DATE, days)}T${time}:00`

interface EventSeed {
  type: string
  vehicleNo: string
  driverNo: string | null
  tripNo?: string
  occurredAt: string
  source: TelematicsSource
  value?: number
  position?: [number, number]
  detail?: string
  infractionNo?: string
  acknowledged?: [string, string]
}

const SEED: EventSeed[] = [
  {
    type: 'SPEEDING',
    vehicleNo: 'VEH-001',
    driverNo: 'UCT-010',
    tripNo: 'TRP-00001',
    occurredAt: '2026-08-24T09:40:00',
    source: 'box',
    value: 97,
    position: [-18.85, 48.3],
    acknowledged: ['2026-08-24T16:10:00', 'Rappel des limites fait au conducteur.']
  },
  {
    type: 'SIGNAL-LOST',
    vehicleNo: 'VEH-001',
    driverNo: 'UCT-010',
    tripNo: 'TRP-00001',
    occurredAt: '2026-08-24T10:05:00',
    source: 'gps',
    value: 24,
    position: [-18.81, 48.39],
    detail: 'Zone sans couverture entre Moramanga et Brickaville.',
    acknowledged: ['2026-08-24T16:12:00', 'Zone blanche connue.']
  },
  {
    type: 'HARSH-BRAKING',
    vehicleNo: 'VEH-001',
    driverNo: 'UCT-010',
    tripNo: 'TRP-00001',
    occurredAt: '2026-08-24T12:05:00',
    source: 'box',
    value: 0.52,
    position: [-18.52, 49.18]
  },
  {
    type: 'DROWSINESS',
    vehicleNo: 'VEH-002',
    driverNo: 'UCT-011',
    tripNo: 'TRP-00002',
    occurredAt: '2026-08-20T15:10:00',
    source: 'camera',
    position: [-16.42, 46.62],
    detail: 'Yeux fermés plus de deux secondes, deux fois en cinq minutes.'
  },
  {
    type: 'SPEEDING',
    vehicleNo: 'VEH-010',
    driverNo: 'UCT-019',
    tripNo: 'TRP-00005',
    occurredAt: '2026-08-22T09:15:00',
    source: 'box',
    value: 104,
    position: [-17.8, 46.95]
  },
  {
    type: 'LONG-STOP',
    vehicleNo: 'VEH-010',
    driverNo: 'UCT-019',
    tripNo: 'TRP-00005',
    occurredAt: '2026-08-22T10:30:00',
    source: 'box',
    value: 42,
    position: [-17.55, 46.9],
    acknowledged: [
      '2026-08-22T18:20:00',
      'Crevaison, photo de la roue transmise par le conducteur.'
    ]
  },
  {
    type: 'HARSH-ACCEL',
    vehicleNo: 'VEH-004',
    driverNo: 'UCT-013',
    tripNo: 'TRP-00003',
    occurredAt: '2026-08-26T07:02:00',
    source: 'box',
    value: 0.47,
    position: [-18.93, 47.72],
    acknowledged: ['2026-08-26T15:00:00', '']
  },
  {
    type: 'PHONE',
    vehicleNo: 'VEH-004',
    driverNo: 'UCT-013',
    tripNo: 'TRP-00003',
    occurredAt: '2026-08-26T10:20:00',
    source: 'camera',
    position: [-18.78, 48.62],
    detail: 'Téléphone tenu en main pendant 40 secondes.'
  },
  {
    type: 'ENGINE-FAULT',
    vehicleNo: 'VEH-006',
    driverNo: 'UCT-015',
    occurredAt: at(-5, '07:45'),
    source: 'obd',
    position: [-18.8792, 47.5079],
    detail: 'Code P0087 : pression de rampe trop basse.'
  },
  {
    type: 'OVERHEAT',
    vehicleNo: 'VEH-006',
    driverNo: 'UCT-015',
    occurredAt: at(-5, '08:05'),
    source: 'obd',
    value: 108,
    position: [-18.8792, 47.5079]
  },
  {
    type: 'CAMERA-MASKED',
    vehicleNo: 'VEH-002',
    driverNo: 'UCT-011',
    occurredAt: at(-3, '05:50'),
    source: 'camera',
    position: [-18.8792, 47.5079],
    detail: 'Objectif de la caméra cabine couvert au démarrage.'
  },
  {
    type: 'IDLING',
    vehicleNo: 'VEH-004',
    driverNo: 'UCT-013',
    occurredAt: at(-3, '06:20'),
    source: 'box',
    value: 34,
    position: [-18.8792, 47.5079],
    acknowledged: [at(-3, '09:00'), 'Préchauffage avant chargement.']
  },
  {
    type: 'HARSH-BRAKING',
    vehicleNo: 'VEH-003',
    driverNo: 'UCT-012',
    occurredAt: at(-1, '17:48'),
    source: 'box',
    value: 0.6,
    position: [-18.9, 47.62],
    detail: 'Décélération de 0,6 g relevée par le boîtier embarqué.',
    infractionNo: 'INF-2026-005'
  },
  {
    type: 'SPEEDING',
    vehicleNo: 'VEH-003',
    driverNo: 'UCT-012',
    tripNo: 'TRP-00006',
    occurredAt: at(0, '08:20'),
    source: 'box',
    value: 94,
    position: [-18.93, 47.85]
  }
]

function event(seed: EventSeed, index: number): Seed {
  return {
    no: `TEL-${String(index + 1).padStart(6, '0')}`,
    eventTypeNo: seed.type,
    vehicleNo: seed.vehicleNo,
    driverNo: seed.driverNo,
    tripNo: seed.tripNo ?? null,
    occurredAt: seed.occurredAt,
    source: seed.source,
    value: seed.value ?? null,
    latitude: seed.position?.[0] ?? null,
    longitude: seed.position?.[1] ?? null,
    detail: seed.detail ?? '',
    infractionNo: seed.infractionNo ?? null,
    acknowledgedAt: seed.acknowledged?.[0] ?? null,
    acknowledgedBy: seed.acknowledged ? 'FLT001' : null,
    acknowledgementComment: seed.acknowledged?.[1] ?? ''
  }
}

export const telematicsEventsCollection: CollectionDefinition<TelematicsEventRow> = {
  name: 'telematics-events',
  seed: () => SEED.map((row, index) => ({ ...event(row, index), ...seedAudit })),
  dateFields: ['occurredAt', 'acknowledgedAt']
}
