import { blockingAnomalies } from '@/modules/fleet/check-points/domain/checkResult'
import {
  alertStatus,
  isEscalated,
  isVisibleTo,
  type AlertCategory,
  type AlertSeverity
} from '@/modules/fleet/alerts/domain/alert'
import type { AlertApi } from '@/modules/fleet/alerts/types/alert.types'
import { equipmentDueState } from '@/modules/fleet/vehicles/domain/equipment'
import { todayIso } from '@/utils/date'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { optionLabel } from '../../fixtures/options'
import { readBody, registerListResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, notFound, unprocessable } from '../../http/errors'
import { readString } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { localize, type MockLanguage } from '../../i18n'
import { companyDocumentsApi } from './companyDocuments'
import { documentsApi, missingDocumentsApi } from './documents'
import { infractionsApi } from './infractions'
import { inspectionsApi } from './inspections'
import { insurancePoliciesApi } from './insurancePolicies'
import { FLEET_MESSAGES } from './messages'
import { departureChecklist } from './roadChecklists'
import { routeDeviationsApi } from './routeDeviations'
import { telematicsEventsApi } from './telematicsEvents'
import { driverScoresApi } from './driverScores'
import { trainingsApi } from './trainings'

/** A situation that calls for someone, found in the fleet records each time alerts are read. */
interface AlertSignal {
  key: string
  category: AlertCategory
  severity: AlertSeverity
  subject: string
  detail: string
  since: string
  path: string
  recordNo: string
}

const signal = (
  category: AlertCategory,
  recordNo: string,
  path: string,
  fields: Pick<AlertSignal, 'severity' | 'subject' | 'detail' | 'since'>
): AlertSignal => ({ key: `${category}.${recordNo}`, category, recordNo, path, ...fields })

export function alertSignals(db: MockDatabase, language: MockLanguage): AlertSignal[] {
  const label = (set: string, value: unknown) => optionLabel(language, set, value)
  const signals: AlertSignal[] = []

  for (const document of documentsApi(db)) {
    if (!document.current || !document.mandatory || document.state === 'valid') continue
    signals.push(
      signal('document', document.no, '/fleet/documents', {
        severity: document.state === 'expiring' ? 'warning' : 'critical',
        subject: document.subjectName,
        detail: `${document.documentTypeName} · ${label('documentState', document.state)}`,
        since:
          document.state === 'expiring'
            ? (document.notifyOn ?? todayIso())
            : (document.declaredAt ?? document.expiryDate ?? todayIso())
      })
    )
  }
  for (const gap of missingDocumentsApi(db).filter((row) => row.reason === 'missing')) {
    signals.push(
      signal('document', gap.no, '/fleet/documents/missing', {
        severity: 'warning',
        subject: gap.subjectName,
        detail: `${gap.documentTypeName} · ${label('complianceGapReason', gap.reason)}`,
        since: todayIso()
      })
    )
  }
  for (const document of companyDocumentsApi(db).filter((row) => row.status === 'pending')) {
    signals.push(
      signal('companyDocument', document.no, '/fleet/company-documents', {
        severity: 'info',
        subject: document.name,
        detail: document.documentTypeName,
        since: document.createdAt
      })
    )
  }
  for (const trip of db.trips
    .all()
    .filter((row) => row.status === 'planned' || row.status === 'in_progress')) {
    const checklist = departureChecklist(db, trip.no)
    const blocking = checklist ? blockingAnomalies(checklist.results) : []
    if (!checklist || !blocking.length) continue
    signals.push(
      signal('checklist', checklist.no, '/fleet/road-checklists', {
        severity: 'critical',
        subject: trip.no,
        detail: blocking.map((point) => point.label).join(', '),
        since: checklist.takenAt
      })
    )
  }
  for (const infraction of infractionsApi(db).filter((row) => row.status === 'new')) {
    signals.push(
      signal('infraction', infraction.no, '/fleet/infractions', {
        severity:
          infraction.severity === 'serious'
            ? 'critical'
            : infraction.severity === 'major'
              ? 'warning'
              : 'info',
        subject: infraction.driverName || infraction.vehiclePlate,
        detail: infraction.infractionTypeName,
        since: infraction.createdAt
      })
    )
  }
  for (const training of trainingsApi(db).filter((row) => row.status === 'to_plan')) {
    signals.push(
      signal('training', training.no, '/fleet/trainings', {
        severity: 'info',
        subject: training.employeeName,
        detail: training.topic,
        since: training.createdAt
      })
    )
  }
  for (const authorization of db.departureAuthorizations
    .all()
    .filter((row) => row.decision === 'pending')) {
    const trip = db.trips.find(authorization.tripNo)
    signals.push(
      signal('departure', authorization.no, '/fleet/departure-authorizations', {
        severity: 'warning',
        subject: authorization.tripNo,
        detail: trip ? trip.plannedDeparture.slice(0, 16).replace('T', ' ') : '',
        since: authorization.createdAt
      })
    )
  }
  const today = todayIso()
  const equipmentTypes = new Map(db.equipmentTypes.all().map((type) => [type.no, type]))
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle]))
  for (const item of db.vehicleEquipment.all().filter((row) => row.state !== 'uninstalled')) {
    const type = equipmentTypes.get(item.equipmentTypeNo)
    const vehicle = plates.get(item.vehicleNo)
    const due = equipmentDueState(item.dueDate, type?.noticeDays ?? 0, today)
    if (!vehicle || vehicle.removal || (due !== 'due_soon' && due !== 'overdue')) continue
    signals.push(
      signal('equipment', item.no, '/fleet/vehicles', {
        severity: due === 'overdue' ? 'critical' : 'warning',
        subject: vehicle.plate,
        detail: `${type?.name ?? item.equipmentTypeNo} · ${label('equipmentDueState', due)}`,
        since: item.dueDate ?? today
      })
    )
  }
  for (const inspection of inspectionsApi(db)) {
    if (inspection.state !== 'recheck_pending' && inspection.state !== 'recheck_overdue') continue
    signals.push(
      signal('inspection', inspection.no, '/fleet/inspections', {
        severity: inspection.state === 'recheck_overdue' ? 'critical' : 'warning',
        subject: inspection.vehiclePlate,
        detail: inspection.findings,
        since: inspection.inspectedOn
      })
    )
  }
  for (const deviation of routeDeviationsApi(db).filter((row) => row.nature === 'to_qualify')) {
    signals.push(
      signal('deviation', deviation.no, '/fleet/route-deviations', {
        severity:
          deviation.severity === 'critical'
            ? 'critical'
            : deviation.severity === 'major'
              ? 'warning'
              : 'info',
        subject: deviation.vehiclePlate,
        detail: `${deviation.deviationTypeName} · ${deviation.tripNo}`,
        since: deviation.detectedAt
      })
    )
  }
  const policies = insurancePoliciesApi(db)
  for (const policy of policies) {
    if (policy.state !== 'expiring' && policy.state !== 'expired') continue
    // A policy already followed by a newer one for the vehicle needs nothing.
    const renewed = policies.some(
      (other) =>
        other.vehicleNo === policy.vehicleNo &&
        other.no !== policy.no &&
        other.startDate > policy.startDate
    )
    if (renewed || plates.get(policy.vehicleNo)?.removal) continue
    signals.push(
      signal('insurance', policy.no, '/fleet/insurance-policies', {
        severity: policy.state === 'expired' ? 'critical' : 'warning',
        subject: policy.vehiclePlate,
        detail: `${policy.policyNumber} · ${label('policyState', policy.state)}`,
        since: policy.notifyOn ?? policy.endDate
      })
    )
  }
  const alerting = new Set(
    db.telematicsEventTypes
      .all()
      .filter((type) => type.raisesAlert)
      .map((type) => type.no)
  )
  for (const event of telematicsEventsApi(db)) {
    if (event.status !== 'new' || !alerting.has(event.eventTypeNo)) continue
    signals.push(
      signal('telematics', event.no, '/fleet/telematics-events', {
        severity:
          event.severity === 'critical'
            ? 'critical'
            : event.severity === 'major'
              ? 'warning'
              : 'info',
        subject: event.vehiclePlate,
        detail: [event.eventTypeName, event.driverName].filter(Boolean).join(' · '),
        since: event.occurredAt
      })
    )
  }
  for (const score of driverScoresApi(db)) {
    if (!score.belowThreshold || score.trainingNo) continue
    signals.push(
      signal('driverScore', score.driverNo, '/fleet/drivers', {
        severity: 'warning',
        subject: score.fullName,
        detail: localize(language, FLEET_MESSAGES.scoreAlertDetail, {
          score: score.score,
          threshold: score.threshold
        }),
        since: todayIso()
      })
    )
  }
  return signals
}

/** Alerts the user may see: current signals with what was done to them, then resolved ones. */
export function alertsApi(db: MockDatabase, request: MockRequest): AlertApi[] {
  const now = new Date()
  const profile = sessionUser(request).profile
  const rules = new Map(db.alertRules.all().map((rule) => [rule.no, rule]))
  const handlings = new Map(db.alertHandlings.all().map((row) => [row.no, row]))
  const signals = alertSignals(db, request.language)
  const live = new Set(signals.map((item) => item.key))
  const none = {
    acknowledgedBy: null,
    acknowledgedAt: null,
    handledBy: null,
    handledAt: null,
    comment: ''
  }

  const current: AlertApi[] = signals.map((item) => {
    const handling = handlings.get(item.key) ?? null
    const rule = rules.get(item.category)
    const status = alertStatus(true, handling)
    return {
      ...none,
      ...(handling ?? {}),
      no: item.key,
      category: item.category,
      severity: item.severity,
      subject: item.subject,
      detail: item.detail,
      since: item.since,
      path: item.path,
      recordNo: item.recordNo,
      status,
      escalated: !!rule && isEscalated(status, item.since, rule.escalationHours, now),
      escalateTo: rule?.escalateTo || null
    }
  })
  const resolved: AlertApi[] = db.alertHandlings
    .all()
    .filter((row) => !live.has(row.no))
    .map((row) => ({
      ...row,
      severity: 'info' as const,
      since: row.acknowledgedAt ?? row.createdAt,
      path: '',
      recordNo: row.no.slice(row.no.indexOf('.') + 1),
      status: 'resolved' as const,
      escalated: false,
      escalateTo: null
    }))

  return [...current, ...resolved].filter((alert) => {
    const rule = rules.get(alert.category)
    if (!rule?.active) return false
    return isVisibleTo(
      profile,
      { recipients: rule.recipients, escalateTo: rule.escalateTo || null },
      alert.escalated
    )
  })
}

export function registerAlertsHandlers(router: MockRouter, db: MockDatabase): void {
  function liveAlert(request: MockRequest) {
    const key = routeParam(request, 'no')
    const alert = alertsApi(db, request).find((row) => row.no === key)
    if (!alert || alert.status === 'resolved') throw notFound()
    return alert
  }

  function record(alert: AlertApi, request: MockRequest, patch: Record<string, unknown>) {
    const existing = db.alertHandlings.find(alert.no)
    if (existing) {
      db.alertHandlings.update(alert.no, { ...patch, ...stampModified(request) })
    } else {
      const stamp = stampModified(request)
      db.alertHandlings.insert({
        no: alert.no,
        category: alert.category,
        subject: alert.subject,
        detail: alert.detail,
        acknowledgedBy: null,
        acknowledgedAt: null,
        handledBy: null,
        handledAt: null,
        comment: '',
        ...patch,
        createdAt: stamp.modifiedAt,
        createdBy: stamp.modifiedBy,
        ...stamp
      })
    }
    return ok(alertsApi(db, request).find((row) => row.no === alert.no))
  }

  registerListResource(router, {
    basePath: '/fleet/alerts',
    feature: 'ALERT',
    rows: (request) => alertsApi(db, request),
    searchColumns: ['subject', 'detail'],
    optionFields: { category: 'alertCategory', severity: 'alertSeverity', status: 'alertStatus' }
  })

  router.post(
    '/fleet/alerts/:no/acknowledge',
    { feature: 'ALERT', action: 'update' },
    (request) => {
      const alert = liveAlert(request)
      if (alert.status !== 'new') throw conflict(FLEET_MESSAGES.alertAlreadyTaken)
      return record(alert, request, {
        acknowledgedBy: sessionUser(request).code,
        acknowledgedAt: nowIso()
      })
    }
  )

  router.post('/fleet/alerts/:no/handle', { feature: 'ALERT', action: 'update' }, (request) => {
    const alert = liveAlert(request)
    if (alert.status === 'handled') throw conflict(FLEET_MESSAGES.alertHandled)
    const comment = readString(readBody(request), 'comment')
    if (!comment) throw unprocessable(FLEET_MESSAGES.reasonRequired)
    const code = sessionUser(request).code
    return record(alert, request, {
      acknowledgedBy: alert.acknowledgedBy ?? code,
      acknowledgedAt: alert.acknowledgedAt ?? nowIso(),
      handledBy: code,
      handledAt: nowIso(),
      comment
    })
  })
}
