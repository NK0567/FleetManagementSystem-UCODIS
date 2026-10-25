import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface AlertRuleRow extends MockRow {
  name: string
  recipients: string[]
  escalationHours: number
  escalateTo: string
  active: boolean
}

const SEED: Omit<AlertRuleRow, keyof typeof seedAudit>[] = [
  {
    no: 'document',
    name: 'Documents à renouveler, expirés ou manquants',
    recipients: ['ADMIN', 'FLEET_MANAGER'],
    escalationHours: 72,
    escalateTo: 'MANAGEMENT',
    active: true
  },
  {
    no: 'companyDocument',
    name: "Documents de l'entreprise à examiner",
    recipients: ['ADMIN', 'FLEET_MANAGER'],
    escalationHours: 72,
    escalateTo: 'MANAGEMENT',
    active: true
  },
  {
    no: 'checklist',
    name: 'Anomalie bloquante à la check-list de départ',
    recipients: ['ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_TECHNICIAN'],
    escalationHours: 4,
    escalateTo: 'MANAGEMENT',
    active: true
  },
  {
    no: 'infraction',
    name: 'Infractions nouvelles',
    recipients: ['ADMIN', 'FLEET_MANAGER'],
    escalationHours: 168,
    escalateTo: 'MANAGEMENT',
    active: true
  },
  {
    no: 'training',
    name: 'Formations à planifier',
    recipients: ['ADMIN', 'FLEET_MANAGER'],
    escalationHours: 336,
    escalateTo: 'MANAGEMENT',
    active: true
  },
  {
    no: 'departure',
    name: 'Départs en attente de décision',
    recipients: ['ADMIN', 'FLEET_MANAGER'],
    escalationHours: 1,
    escalateTo: 'MANAGEMENT',
    active: true
  },
  {
    no: 'equipment',
    name: 'Équipements à contrôler',
    recipients: ['ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_TECHNICIAN'],
    escalationHours: 168,
    escalateTo: 'MANAGEMENT',
    active: true
  },
  {
    no: 'inspection',
    name: 'Contre-visites à passer',
    recipients: ['ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_TECHNICIAN'],
    escalationHours: 24,
    escalateTo: 'MANAGEMENT',
    active: true
  },
  {
    no: 'deviation',
    name: "Écarts d'itinéraire à qualifier",
    recipients: ['ADMIN', 'FLEET_MANAGER'],
    escalationHours: 48,
    escalateTo: 'MANAGEMENT',
    active: true
  },
  {
    no: 'insurance',
    name: "Polices d'assurance à renouveler",
    recipients: ['ADMIN', 'FLEET_MANAGER'],
    escalationHours: 168,
    escalateTo: 'MANAGEMENT',
    active: true
  },
  {
    no: 'telematics',
    name: 'Événements télématiques à traiter',
    recipients: ['ADMIN', 'FLEET_MANAGER'],
    escalationHours: 24,
    escalateTo: 'MANAGEMENT',
    active: true
  },
  {
    no: 'driverScore',
    name: 'Conducteurs sous le seuil de score',
    recipients: ['ADMIN', 'FLEET_MANAGER'],
    escalationHours: 168,
    escalateTo: 'MANAGEMENT',
    active: true
  },
  {
    no: 'tyre',
    name: 'Pneus sous les seuils ou à permuter',
    recipients: ['ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_TECHNICIAN'],
    escalationHours: 24,
    escalateTo: 'MANAGEMENT',
    active: true
  }
]

export const alertRulesCollection: CollectionDefinition<AlertRuleRow> = {
  name: 'alert-rules',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
