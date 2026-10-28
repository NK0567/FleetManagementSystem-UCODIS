import { blockingAnomalies } from '@/modules/fleet/check-points/domain/checkResult'
import type {
  WorkOrderOrigin,
  WorkOrderSeverity
} from '@/modules/maintenance/work-orders/domain/workOrder'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { conflict, unprocessable } from '../../http/errors'
import { localize, type MockLanguage } from '../../i18n'
import { MAINTENANCE_MESSAGES } from './messages'
import type { WorkOrderRequest } from './workOrders'

/** Fleet records a work order can be opened from, each one at most once. */
export const SOURCED_ORIGINS = ['claim', 'road_checklist', 'inspection', 'telematics'] as const
export type SourcedOrigin = (typeof SOURCED_ORIGINS)[number]

/** The live order of each source, keyed `origin originNo`; a cancelled order frees its source. */
export function workOrdersBySource(db: MockDatabase): Map<string, { no: string; open: boolean }> {
  const orders = new Map<string, { no: string; open: boolean }>()
  for (const order of db.workOrders.all()) {
    if (!order.originNo || order.cancelledAt) continue
    orders.set(`${order.origin} ${order.originNo}`, { no: order.no, open: !order.validatedAt })
  }
  return orders
}

const severityOfTelematics: Record<string, WorkOrderSeverity> = {
  minor: 'minor',
  major: 'major',
  critical: 'critical'
}

/** What the order says, read from its source; refuses a source that calls for no repair. */
export function sourceRequest(
  db: MockDatabase,
  origin: SourcedOrigin,
  originNo: string,
  language: MockLanguage
): WorkOrderRequest {
  if (workOrdersBySource(db).has(`${origin} ${originNo}`)) {
    throw conflict(MAINTENANCE_MESSAGES.sourceHasOrder, {
      no: workOrdersBySource(db).get(`${origin} ${originNo}`)?.no ?? ''
    })
  }
  const request = (vehicleNo: string, severity: WorkOrderSeverity, symptom: string) => ({
    vehicleNo,
    maintenanceType: 'corrective' as const,
    severity,
    origin: origin as WorkOrderOrigin,
    originNo,
    symptom,
    declaredAt: nowIsoDateTime()
  })
  const text = (message: keyof typeof MAINTENANCE_MESSAGES, params: Record<string, string>) =>
    localize(language, MAINTENANCE_MESSAGES[message], params)

  switch (origin) {
    case 'claim': {
      const claim = db.claims.findOrFail(originNo)
      if (claim.status === 'closed') throw conflict(MAINTENANCE_MESSAGES.sourceClosed)
      return request(
        claim.vehicleNo,
        claim.severity === 'minor_damage' ? 'minor' : 'major',
        text('sourceClaimSymptom', { no: claim.no, circumstances: claim.circumstances })
      )
    }
    case 'road_checklist': {
      const checklist = db.roadChecklists.findOrFail(originNo)
      const anomalies = checklist.results.filter((point) => point.result === 'anomaly')
      if (!anomalies.length) throw unprocessable(MAINTENANCE_MESSAGES.sourceNothingToRepair)
      const trip = db.trips.findOrFail(checklist.tripNo)
      return request(
        trip.vehicleNo,
        blockingAnomalies(checklist.results).length ? 'major' : 'minor',
        text('sourceChecklistSymptom', {
          points: anomalies
            .map((point) => (point.comment ? `${point.label} (${point.comment})` : point.label))
            .join(', ')
        })
      )
    }
    case 'inspection': {
      const inspection = db.inspections.findOrFail(originNo)
      // Once the re-inspection is passed the fault is fixed: nothing is left to repair.
      if (inspection.result !== 'non_conforming' || inspection.recheckDoneOn) {
        throw unprocessable(MAINTENANCE_MESSAGES.sourceNothingToRepair)
      }
      return request(
        inspection.vehicleNo,
        'major',
        text('sourceInspectionSymptom', { findings: inspection.findings })
      )
    }
    case 'telematics': {
      const event = db.telematicsEvents.findOrFail(originNo)
      const type = db.telematicsEventTypes.findOrFail(event.eventTypeNo)
      if (type.family !== 'fault') throw unprocessable(MAINTENANCE_MESSAGES.sourceNothingToRepair)
      return request(
        event.vehicleNo,
        severityOfTelematics[type.severity] ?? 'minor',
        [type.name, event.detail].filter(Boolean).join(' · ')
      )
    }
  }
}
