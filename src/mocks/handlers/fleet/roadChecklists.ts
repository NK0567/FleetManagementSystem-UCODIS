import { anomalies, blockingAnomalies } from '@/modules/fleet/check-points/domain/checkResult'
import {
  CHECKLIST_STAGES,
  type RoadChecklistApi
} from '@/modules/fleet/road-checklists/types/roadChecklist.types'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { RoadChecklistRow } from '../../fixtures/fleet/roadChecklists'
import { registerCrudResource } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readBoolean, readDateTime, readEnum } from '../../http/input'
import { requireReference } from '../../http/references'
import type { MockRouter } from '../../http/router'
import { readCheckResults } from './checkPoints'
import { FLEET_MESSAGES } from './messages'
import { workOrdersBySource } from '../maintenance/workOrderSources'

export function roadChecklistsApi(db: MockDatabase): RoadChecklistApi[] {
  const trips = new Map(db.trips.all().map((trip) => [trip.no, trip]))
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  const orders = workOrdersBySource(db)
  return db.roadChecklists.all().map((checklist) => {
    const trip = trips.get(checklist.tripNo)
    return {
      ...checklist,
      workOrderNo: orders.get(`road_checklist ${checklist.no}`)?.no ?? null,
      vehicleNo: trip?.vehicleNo ?? '',
      vehiclePlate: trip ? (plates.get(trip.vehicleNo) ?? trip.vehicleNo) : '',
      driverName: trip ? (names.get(trip.driverNo) ?? trip.driverNo) : '',
      signedAt: checklist.signedAt ?? null,
      signed: !!checklist.signedAt,
      syncedAt: checklist.syncedAt ?? checklist.createdAt,
      capturedOffline: !!checklist.capturedOffline,
      anomalyCount: anomalies(checklist.results).length,
      blocking: blockingAnomalies(checklist.results).length > 0
    }
  })
}

/**
 * What the phone of the driver sends with a checklist: his signature (when he signed it) and
 * whether it was taken without network, kept on the phone and sent once the network came back.
 */
export function readDriverSignature(
  input: Record<string, unknown>,
  takenAt: string
): Pick<RoadChecklistRow, 'signedAt' | 'syncedAt' | 'capturedOffline'> {
  const now = nowIsoDateTime()
  let signedAt: string | null = null
  if (readBoolean(input, 'signed')) {
    signedAt = readDateTime(input, 'signedAt') ?? now
    if (signedAt > now) throw unprocessable(FLEET_MESSAGES.dateInFuture)
    if (signedAt < takenAt) throw unprocessable(FLEET_MESSAGES.checklistSignedBeforeTaken)
  }
  return { signedAt, syncedAt: now, capturedOffline: typeof input.savedAt === 'string' }
}

/** The latest departure reading of a trip: the one a departure authorization relies on. */
export function departureChecklist(db: MockDatabase, tripNo: string): RoadChecklistRow | null {
  return (
    db.roadChecklists
      .all()
      .filter((checklist) => checklist.tripNo === tripNo && checklist.stage === 'departure')
      .sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0] ?? null
  )
}

export function registerRoadChecklistsHandlers(router: MockRouter, db: MockDatabase): void {
  // A reading records what was seen at a given time: it is never edited, a new one is taken.
  registerCrudResource(router, {
    basePath: '/fleet/road-checklists',
    feature: 'ROADCHECKLIST',
    collection: db.roadChecklists,
    list: () => roadChecklistsApi(db),
    searchColumns: ['no', 'tripNo', 'vehiclePlate'],
    optionFields: { stage: 'checklistStage' },
    create: (input) => {
      const tripNo = requireReference(db.trips, input, 'tripNo')
      const trip = db.trips.findOrFail(tripNo)
      if (trip.status === 'closed' || trip.status === 'cancelled') {
        throw conflict(FLEET_MESSAGES.checklistTripOver)
      }
      const takenAt = readDateTime(input, 'takenAt', { required: true }) ?? ''
      if (takenAt > nowIsoDateTime()) throw unprocessable(FLEET_MESSAGES.dateInFuture)
      return {
        no: nextNo(
          db.roadChecklists.all().map((row) => row.no),
          'CKL-',
          5
        ),
        tripNo,
        stage: readEnum(input, 'stage', CHECKLIST_STAGES, { required: true }) ?? 'departure',
        takenAt,
        results: readCheckResults(db, input, 'vehicle'),
        // Entered from the office: it is on the server at once, and the driver did not sign it.
        signedAt: null,
        syncedAt: nowIsoDateTime(),
        capturedOffline: false
      }
    }
  })
}
