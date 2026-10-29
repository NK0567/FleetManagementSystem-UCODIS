import type { ActivityLogEntryApi } from '@/modules/settings/activity-log/types/activityLog.types'
import { nowIsoDateTime } from '@/utils/date'
import type { MockRow } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { ActivityLogRow } from '../../fixtures/settings/activityLog'
import { seedAudit } from '../../fixtures/seedAudit'
import { registerListResource } from '../../http/crudResource'
import { localize, type LocalizedText, type MockLanguage } from '../../i18n'
import type { MockRouter } from '../../http/router'

const ACTIONS: Record<string, LocalizedText> = {
  created: { fr: 'Création', en: 'Creation' },
  updated: { fr: 'Modification', en: 'Update' },
  login: { fr: 'Connexion', en: 'Sign-in' },
  account_created: { fr: 'Compte créé', en: 'Account created' },
  account_updated: { fr: 'Compte modifié', en: 'Account updated' },
  account_disabled: { fr: 'Compte désactivé', en: 'Account disabled' },
  account_enabled: { fr: 'Compte réactivé', en: 'Account enabled' },
  declared: { fr: 'Panne déclarée', en: 'Fault declared' },
  diagnosed: { fr: 'Diagnostic posé', en: 'Diagnosis made' },
  started: { fr: 'Travaux commencés', en: 'Work started' },
  labour: { fr: 'Temps saisi', en: 'Time logged' },
  planned: { fr: 'Travaux planifiés', en: 'Work planned' },
  handed_over: { fr: 'Confié à un atelier externe', en: 'Handed to an outside garage' },
  external_update: { fr: "Suivi de l'atelier externe", en: 'Outside garage update' },
  returned: { fr: "Retour de l'atelier externe", en: 'Back from the outside garage' },
  completed: { fr: 'Travaux terminés', en: 'Work completed' },
  nomenclature: { fr: 'Nomenclature confirmée', en: 'Nomenclature confirmed' },
  refused: { fr: 'Clôture refusée', en: 'Closing refused' },
  validated: { fr: 'Clôture validée', en: 'Closing validated' },
  cancelled: { fr: 'Annulation', en: 'Cancellation' }
}

/** What each table holds, as people say it; a table left out keeps its technical name. */
const ENTITIES: Record<string, LocalizedText> = {
  'user-accounts': { fr: 'Compte utilisateur', en: 'User account' },
  'company-settings': { fr: 'Société', en: 'Company' },
  'module-toggles': { fr: 'Module activable', en: 'Module toggle' },
  'hr-employees': { fr: 'Personne', en: 'Person' },
  'hr-org-units': { fr: 'Entité', en: 'Unit' },
  'hr-job-positions': { fr: 'Fonction', en: 'Job position' },
  'hr-employee-categories': { fr: 'Catégorie', en: 'Category' },
  'hr-leave-requests': { fr: "Demande d'absence", en: 'Leave request' },
  'hr-leave-types': { fr: "Type d'absence", en: 'Leave type' },
  'hr-public-holidays': { fr: 'Jour férié', en: 'Public holiday' },
  vehicles: { fr: 'Véhicule', en: 'Vehicle' },
  couplings: { fr: 'Attelage', en: 'Coupling' },
  'driver-assignments': { fr: 'Affectation', en: 'Assignment' },
  trips: { fr: 'Trajet', en: 'Trip' },
  documents: { fr: 'Document', en: 'Document' },
  claims: { fr: 'Sinistre', en: 'Claim' },
  infractions: { fr: 'Infraction', en: 'Infraction' },
  'fuel-refills': { fr: 'Plein', en: 'Refill' },
  providers: { fr: 'Prestataire', en: 'Provider' },
  sites: { fr: 'Site', en: 'Site' },
  'work-orders': { fr: 'Ordre de travail', en: 'Work order' },
  downtimes: { fr: 'Indisponibilité', en: 'Downtime' },
  'downtime-codes': { fr: "Cause d'indisponibilité", en: 'Downtime cause' },
  'maintenance-plans': { fr: "Plan d'entretien", en: 'Maintenance plan' },
  tyres: { fr: 'Pneu', en: 'Tyre' },
  'stock-items': { fr: 'Article de stock', en: 'Stock item' },
  'stock-movements': { fr: 'Mouvement de stock', en: 'Stock movement' },
  'purchase-requests': { fr: "Demande d'achat", en: 'Purchase request' },
  competences: { fr: 'Compétence', en: 'Competence' },
  technicians: { fr: 'Technicien', en: 'Technician' },
  'road-checklists': { fr: 'Check-list sur route', en: 'Road checklist' },
  'delivery-requests': { fr: 'Commande', en: 'Order' },
  'transport-orders': { fr: 'Ordre de transport', en: 'Transport order' },
  customers: { fr: 'Destinataire', en: 'Recipient' }
}

/** Tables that are not records of people's work, or whose actions are logged one by one. */
const SKIPPED = new Set(['activity-log', 'files', 'user-accounts'])

interface Trace {
  at: string
  by: string
  action: string
  entity: string
  recordNo: string
  detail: string
}

const isSeed = (at: string) => at === seedAudit.createdAt

function auditTraces(name: string, rows: MockRow[]): Trace[] {
  return rows.flatMap((row) => {
    const base = { entity: name, recordNo: row.no, detail: '' }
    const traces: Trace[] = []
    if (row.createdAt && !isSeed(row.createdAt)) {
      traces.push({ ...base, at: row.createdAt, by: row.createdBy, action: 'created' })
    }
    if (row.modifiedAt && row.modifiedAt !== row.createdAt && !isSeed(row.modifiedAt)) {
      traces.push({ ...base, at: row.modifiedAt, by: row.modifiedBy, action: 'updated' })
    }
    return traces
  })
}

/** The steps of each work order: those of its history, and those its own fields carry. */
function workOrderTraces(db: MockDatabase): Trace[] {
  return db.workOrders.all().flatMap((order) => {
    const base = { entity: 'work-orders', recordNo: order.no }
    const fromHistory = order.history.map((event) => ({
      ...base,
      at: event.at,
      by: event.by,
      action: event.kind,
      detail: event.comment
    }))
    const kinds = new Set(order.history.map((event) => event.kind))
    const fromFields: Trace[] = [
      { kind: 'declared', at: order.declaredAt, by: order.declaredBy, detail: order.symptom },
      { kind: 'diagnosed', at: order.diagnosis?.at, by: order.diagnosis?.by, detail: '' },
      { kind: 'completed', at: order.completedAt, by: order.completedBy, detail: order.workDone },
      { kind: 'validated', at: order.validatedAt, by: order.validatedBy, detail: '' },
      {
        kind: 'cancelled',
        at: order.cancelledAt,
        by: order.cancelledBy,
        detail: order.cancelReason
      }
    ]
      .filter((step) => step.at && step.by && !kinds.has(step.kind as never))
      .map((step) => ({
        ...base,
        at: step.at as string,
        by: step.by as string,
        action: step.kind,
        detail: step.detail
      }))
    return [...fromHistory, ...fromFields]
  })
}

type Table = { name: string; all: () => MockRow[] }

function collections(db: MockDatabase): Table[] {
  return (Object.values(db) as unknown[]).filter(
    (value): value is Table =>
      !!value &&
      typeof value === 'object' &&
      'all' in value &&
      'name' in value &&
      typeof (value as { all: unknown }).all === 'function'
  )
}

const label = (texts: Record<string, LocalizedText>, key: string, language: MockLanguage) => {
  const text = texts[key]
  return text ? localize(language, text) : key
}

export function activityLogApi(db: MockDatabase, language: MockLanguage): ActivityLogEntryApi[] {
  const names = new Map(db.userAccounts.all().map((account) => [account.no, account.name]))
  const traces: Trace[] = [
    ...db.activityLog.all(),
    ...workOrderTraces(db),
    ...collections(db)
      .filter((collection) => !SKIPPED.has(collection.name))
      .flatMap((collection) => auditTraces(collection.name, collection.all()))
  ]
  return traces
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((trace, index) => ({
      no: `${trace.entity}:${trace.recordNo}:${trace.action}:${trace.at}:${index}`,
      at: trace.at,
      by: trace.by,
      byName: names.get(trace.by) ?? trace.by,
      action: trace.action,
      actionLabel: label(ACTIONS, trace.action, language),
      entity: trace.entity,
      entityLabel: label(ENTITIES, trace.entity, language),
      recordNo: trace.recordNo,
      detail: trace.detail
    }))
}

/** Writes what the audit fields of a table cannot tell: a sign-in, an account switched off or on. */
export function recordActivity(
  db: MockDatabase,
  entry: Omit<ActivityLogRow, 'no' | 'at' | 'detail' | keyof typeof seedAudit> & {
    detail?: string
  }
): void {
  const at = nowIsoDateTime()
  const no = nextNo(
    db.activityLog.all().map((row) => row.no),
    'LOG-',
    6
  )
  db.activityLog.insert({
    ...entry,
    detail: entry.detail ?? '',
    no,
    at,
    createdAt: at,
    createdBy: entry.by,
    modifiedAt: at,
    modifiedBy: entry.by
  })
}

export function registerActivityLogHandlers(router: MockRouter, db: MockDatabase): void {
  registerListResource(router, {
    basePath: '/settings/activity-log',
    feature: 'ACTIVITYLOG',
    rows: (request) => activityLogApi(db, request.language),
    searchColumns: ['byName', 'by', 'actionLabel', 'entityLabel', 'recordNo', 'detail']
  })
}
