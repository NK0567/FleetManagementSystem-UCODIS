import type { PlanStop } from '@/modules/fleet/trip-debriefs/domain/tripDebrief'
import { addDays } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { seedAudit } from '../seedAudit'

export interface TripDebriefRow extends MockRow {
  voucherNo: string
  employeeNo: string
  vehicleNo: string
  tankNo: string
  loadedOn: string | null
  unloadedOn: string | null
  deliveryPlace: string
  gainLoss: number | null
  startKm: number | null
  endKm: number | null
  nightDriving: number
  dailyWork: number
  dailyDriving: number
  continuousDriving: number
  weeklyRest: number
  dailyRest: number
  overspeed: number
  harshAcceleration: number
  harshBraking: number
  plan: PlanStop[]
  events: string
  actionText: string
  actionOwner: string
  actionDueOn: string | null
  driverSignedOn: string | null
  managerSignedOn: string | null
  closedOn: string | null
}

const day = (days: number) => addDays(DEMO_REFERENCE_DATE, days)

const stop = (
  place: string,
  plannedTime: string,
  actualTime: string,
  allowed: PlanStop['allowed'],
  observation = ''
): PlanStop => ({ place, plannedTime, actualTime, allowed, observation })

/** Outbound plan of the Antananarivo to Tamatave run, as printed on the travel plan form. */
const OUTBOUND = (late: boolean): PlanStop[] => [
  stop('Garage GTD', '00:00', '00:00', 'pause_rest'),
  stop('Sortie By pass', '00:30', late ? '00:45' : '00:30', 'none'),
  stop('Marozevo', '02:20', late ? '02:50' : '02:20', 'pause'),
  stop(
    'Entrée Moramanga',
    '03:40',
    late ? '04:20' : '03:40',
    'pause_rest',
    late ? 'Embouteillage' : ''
  ),
  stop('Croisement Andasibe PK 136', '04:30', late ? '05:15' : '04:30', 'pause_rest'),
  stop('Ambatosenegaly PK 155', '06:00', late ? '06:50' : '06:00', 'pause_rest'),
  stop('Entrée Tamatave (Base GRT)', '12:00', late ? '13:10' : '12:00', 'pause_rest')
]

const NO_INFRACTION = {
  nightDriving: 0,
  dailyWork: 0,
  dailyDriving: 0,
  continuousDriving: 0,
  weeklyRest: 0,
  dailyRest: 0,
  overspeed: 0,
  harshAcceleration: 0,
  harshBraking: 0
}

const SEED: Omit<TripDebriefRow, keyof typeof seedAudit>[] = [
  {
    no: 'DEB-00001',
    voucherNo: 'OT-26-0412',
    employeeNo: 'UCT-012',
    vehicleNo: 'VEH-001',
    tankNo: 'CIT-01',
    loadedOn: day(-9),
    unloadedOn: day(-8),
    deliveryPlace: 'Dépôt de Tamatave',
    gainLoss: -35,
    startKm: 120450,
    endKm: 121120,
    ...NO_INFRACTION,
    overspeed: 2,
    harshBraking: 1,
    plan: OUTBOUND(true),
    events: 'Embouteillage à Moramanga, retard de quarante minutes rattrapé en partie.',
    actionText: 'Rappel des limitations de vitesse en descente.',
    actionOwner: "Responsable d'exploitation",
    actionDueOn: day(-2),
    driverSignedOn: day(-7),
    managerSignedOn: day(-7),
    closedOn: day(-7)
  },
  {
    no: 'DEB-00002',
    voucherNo: 'OT-26-0431',
    employeeNo: 'UCT-013',
    vehicleNo: 'VEH-002',
    tankNo: 'CIT-02',
    loadedOn: day(-5),
    unloadedOn: day(-4),
    deliveryPlace: 'Dépôt de Tamatave',
    gainLoss: 12,
    startKm: 88300,
    endKm: 88975,
    ...NO_INFRACTION,
    continuousDriving: 1,
    dailyRest: 1,
    plan: OUTBOUND(false),
    events: 'Pause de Moramanga raccourcie.',
    actionText: 'Rappel du respect des pauses prévues au plan de trajet.',
    actionOwner: 'Responsable sécurité',
    actionDueOn: day(3),
    driverSignedOn: day(-3),
    managerSignedOn: null,
    closedOn: null
  },
  {
    no: 'DEB-00003',
    voucherNo: 'OT-26-0447',
    employeeNo: 'UCT-014',
    vehicleNo: 'VEH-003',
    tankNo: 'CIT-03',
    loadedOn: day(-2),
    unloadedOn: day(-1),
    deliveryPlace: 'Dépôt de Tamatave',
    gainLoss: null,
    startKm: 45010,
    endKm: 45690,
    ...NO_INFRACTION,
    plan: OUTBOUND(false).slice(0, 4),
    events: '',
    actionText: '',
    actionOwner: '',
    actionDueOn: null,
    driverSignedOn: null,
    managerSignedOn: null,
    closedOn: null
  }
]

export const tripDebriefsCollection: CollectionDefinition<TripDebriefRow> = {
  name: 'tripDebriefs',
  seed: () =>
    SEED.map((row) => ({ ...row, ...seedAudit, createdBy: 'FLT001', modifiedBy: 'FLT001' })),
  dateFields: [
    'loadedOn',
    'unloadedOn',
    'actionDueOn',
    'driverSignedOn',
    'managerSignedOn',
    'closedOn'
  ]
}
