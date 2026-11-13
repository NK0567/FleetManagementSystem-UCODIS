import type {
  DriverReportActionKind,
  DriverReportChannel,
  DriverReportKind,
  DriverReportSeverity,
  DriverReportStatus,
  DriverReportUrgency
} from '@/modules/fleet/driver-reports/domain/driverReport'
import { addDays } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { seedAudit } from '../seedAudit'

export interface DriverReportRow extends MockRow {
  employeeNo: string
  subject: string
  kind: DriverReportKind
  severity: DriverReportSeverity
  urgency: DriverReportUrgency
  channel: DriverReportChannel
  occurredOn: string
  reportedOn: string
  description: string
  ownerName: string
  actionKind: DriverReportActionKind | ''
  actionText: string
  dueOn: string | null
  closedOn: string | null
  status: DriverReportStatus
}

const day = (days: number) => addDays(DEMO_REFERENCE_DATE, days)

const SEED: Omit<DriverReportRow, keyof typeof seedAudit>[] = [
  {
    no: 'REM-00001',
    employeeNo: 'UCT-012',
    subject: 'Voyant de pression des pneus allumé',
    kind: 'technical',
    severity: 'major',
    urgency: 'immediate',
    channel: 'app',
    occurredOn: day(-2),
    reportedOn: day(-2),
    description: "Voyant apparu en descente après Moramanga, vitesse réduite jusqu'à l'arrêt.",
    ownerName: "Chef d'atelier",
    actionKind: 'corrective',
    actionText: 'Contrôle des pressions et de la valve de la roue arrière gauche.',
    dueOn: day(1),
    closedOn: null,
    status: 'in_progress'
  },
  {
    no: 'REM-00002',
    employeeNo: 'UCT-013',
    subject: 'Zone de croisement dangereuse au PK 136',
    kind: 'safety',
    severity: 'critical',
    urgency: 'to_plan',
    channel: 'phone',
    occurredOn: day(-6),
    reportedOn: day(-6),
    description: 'Véhicules en stationnement sur la voie au croisement, visibilité réduite.',
    ownerName: 'Responsable sécurité',
    actionKind: 'preventive',
    actionText: 'Rappel du point de vigilance dans le plan de trajet et à la causerie du matin.',
    dueOn: day(5),
    closedOn: null,
    status: 'in_progress'
  },
  {
    no: 'REM-00003',
    employeeNo: 'UCT-014',
    subject: 'Carte grise du tracteur illisible',
    kind: 'documentary',
    severity: 'minor',
    urgency: 'to_plan',
    channel: 'debriefing',
    occurredOn: day(-9),
    reportedOn: day(-7),
    description: "Le document plastifié est abîmé, risque de refus lors d'un contrôle.",
    ownerName: 'Gestionnaire de flotte',
    actionKind: 'corrective',
    actionText: 'Duplicata demandé et copie certifiée remise au conducteur.',
    dueOn: day(-3),
    closedOn: day(-3),
    status: 'closed'
  },
  {
    no: 'REM-00004',
    employeeNo: 'UCT-015',
    subject: 'Embouteillage et passage de véhicule en panne',
    kind: 'road_incident',
    severity: 'minor',
    urgency: 'observation',
    channel: 'oral',
    occurredOn: day(-4),
    reportedOn: day(-4),
    description: 'Camion en panne sur la RN2, trente minutes de retard sur le plan de trajet.',
    ownerName: '',
    actionKind: '',
    actionText: '',
    dueOn: null,
    closedOn: null,
    status: 'open'
  },
  {
    no: 'REM-00005',
    employeeNo: 'UCT-016',
    subject: "Proposition : point d'eau au parking de Sahamamy",
    kind: 'suggestion',
    severity: 'minor',
    urgency: 'observation',
    channel: 'app',
    occurredOn: day(-12),
    reportedOn: day(-12),
    description: "Un point d'eau faciliterait les repos réglementaires sur ce parking.",
    ownerName: "Responsable d'exploitation",
    actionKind: 'preventive',
    actionText: 'À étudier avec le propriétaire du parking.',
    dueOn: day(20),
    closedOn: null,
    status: 'in_progress'
  },
  {
    no: 'REM-00006',
    employeeNo: 'UCT-012',
    subject: "Retour d'expérience : relais à Moramanga",
    kind: 'feedback',
    severity: 'minor',
    urgency: 'observation',
    channel: 'debriefing',
    occurredOn: day(-20),
    reportedOn: day(-15),
    description: "Le relais avec l'équipe de retour s'est bien passé, clé remise en main propre.",
    ownerName: '',
    actionKind: '',
    actionText: '',
    dueOn: null,
    closedOn: null,
    status: 'open'
  }
]

export const driverReportsCollection: CollectionDefinition<DriverReportRow> = {
  name: 'driverReports',
  seed: () =>
    SEED.map((row) => ({ ...row, ...seedAudit, createdBy: 'FLT001', modifiedBy: 'FLT001' })),
  dateFields: ['occurredOn', 'reportedOn', 'dueOn', 'closedOn']
}
