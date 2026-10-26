import type { InfractionSeverity } from '@/modules/fleet/infraction-types/types/infractionType.types'
import type {
  InfractionOutcome,
  InfractionSource
} from '@/modules/fleet/infractions/domain/infraction'
import type { InfractionEvent } from '@/modules/fleet/infractions/types/infraction.types'
import { addDays } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { seedAudit } from '../seedAudit'

export interface InfractionRow extends MockRow {
  infractionTypeNo: string
  occurredAt: string
  location: string
  vehicleNo: string
  driverNo: string | null
  severity: InfractionSeverity
  fineAmount: number | null
  detail: string
  source: InfractionSource
  handlerCode: string | null
  outcome: InfractionOutcome | null
  outcomeComment: string
  closedAt: string | null
  history: InfractionEvent[]
}

type Seed = Omit<InfractionRow, keyof typeof seedAudit>

const at = (days: number, time: string) => `${addDays(DEMO_REFERENCE_DATE, days)}T${time}:00`
const stamp = (days: number, time: string) => `${at(days, time)}.000Z`
const event = (
  days: number,
  time: string,
  kind: InfractionEvent['kind'],
  comment = '',
  by = 'FLT001'
): InfractionEvent => ({ at: stamp(days, time), by, kind, comment })

const open = { handlerCode: null, outcome: null, outcomeComment: '', closedAt: null }

const SEED: Seed[] = [
  {
    no: 'INF-2026-001',
    infractionTypeNo: 'SPEED',
    occurredAt: at(-20, '10:42'),
    location: 'RN7, PK 38, Behenjy',
    vehicleNo: 'VEH-004',
    driverNo: 'UCT-013',
    severity: 'major',
    fineAmount: 150_000,
    detail: '92 km/h relevés par la gendarmerie pour une vitesse limitée à 60 km/h.',
    source: 'manual',
    handlerCode: 'FLT001',
    outcome: 'training',
    outcomeComment: 'Deuxième excès de vitesse du trimestre : formation ciblée.',
    closedAt: stamp(-15, '11:00'),
    history: [
      event(-20, '14:00', 'recorded'),
      event(-19, '08:30', 'taken'),
      event(-15, '11:00', 'closed', 'Formation ciblée')
    ]
  },
  {
    no: 'INF-2026-002',
    infractionTypeNo: 'PHONE',
    occurredAt: at(-6, '15:20'),
    location: 'Route digue, Antananarivo',
    vehicleNo: 'VEH-002',
    driverNo: 'UCT-011',
    severity: 'major',
    fineAmount: 60_000,
    detail: 'Constat de la police routière, conducteur au téléphone à l’arrêt au feu.',
    source: 'manual',
    ...open,
    handlerCode: 'FLT001',
    history: [event(-6, '17:00', 'recorded'), event(-5, '09:10', 'taken')]
  },
  {
    no: 'INF-2026-003',
    infractionTypeNo: 'SEATBELT',
    occurredAt: at(-2, '08:05'),
    location: 'Contrôle routier, Ivato',
    vehicleNo: 'VEH-007',
    driverNo: null,
    severity: 'major',
    fineAmount: 20_000,
    detail: 'Avis de contravention reçu au siège ; le conducteur reste à identifier.',
    source: 'manual',
    ...open,
    history: [event(-1, '09:00', 'recorded')]
  },
  {
    no: 'INF-2026-004',
    infractionTypeNo: 'OVERLOAD',
    occurredAt: at(-35, '06:30'),
    location: 'Pont-bascule d’Ambohimanambola',
    vehicleNo: 'VEH-001',
    driverNo: 'UCT-010',
    severity: 'major',
    fineAmount: 400_000,
    detail: 'Pesée à 41,2 t pour 40 t autorisées.',
    source: 'manual',
    handlerCode: 'FLT001',
    outcome: 'dismissed',
    outcomeComment: 'Le bon de pesage du dépôt indique 38,9 t : la bascule était déréglée.',
    closedAt: stamp(-28, '16:00'),
    history: [
      event(-35, '10:00', 'recorded'),
      event(-34, '08:00', 'taken'),
      event(-28, '16:00', 'closed', 'Infraction contestée et levée')
    ]
  },
  {
    no: 'INF-2026-005',
    infractionTypeNo: 'HARSH-BRAKING',
    occurredAt: at(-1, '17:48'),
    location: 'RN2, PK 12',
    vehicleNo: 'VEH-003',
    driverNo: 'UCT-012',
    severity: 'minor',
    fineAmount: null,
    detail: 'Décélération de 0,6 g relevée par le boîtier embarqué.',
    source: 'telematics',
    ...open,
    history: [event(-1, '17:49', 'recorded', '', 'SYSTEM')]
  }
]

export const infractionsCollection: CollectionDefinition<InfractionRow> = {
  name: 'infractions',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['occurredAt', 'closedAt', 'history[].at']
}
