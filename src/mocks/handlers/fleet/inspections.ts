import {
  awaitsRecheck,
  inspectionState,
  recheckDueOn
} from '@/modules/fleet/inspections/domain/inspection'
import {
  INSPECTION_RESULTS,
  type InspectionApi
} from '@/modules/fleet/inspections/types/inspection.types'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { InspectionRow } from '../../fixtures/fleet/inspections'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readDate, readEnum, readPatch, readString, type FieldReaders } from '../../http/input'
import { requireReference, unknownReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'
import { fleetSettings } from './settings'

export function inspectionsApi(db: MockDatabase): InspectionApi[] {
  const today = todayIso()
  const delay = fleetSettings(db).safety.recheckDelayDays
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  return db.inspections.all().map((inspection) => ({
    ...inspection,
    vehiclePlate: plates.get(inspection.vehicleNo) ?? inspection.vehicleNo,
    recheckDueOn: recheckDueOn(inspection, delay),
    state: inspectionState(inspection, delay, today)
  }))
}

/**
 * Vehicles whose latest inspection still awaits its re-inspection; a later conforming inspection
 * stands for the re-inspection.
 */
export function vehiclesAwaitingRecheck(db: MockDatabase): Map<string, InspectionRow> {
  const latest = new Map<string, InspectionRow>()
  for (const inspection of db.inspections.all()) {
    const current = latest.get(inspection.vehicleNo)
    if (!current || inspection.inspectedOn >= current.inspectedOn) {
      latest.set(inspection.vehicleNo, inspection)
    }
  }
  return new Map([...latest].filter(([, inspection]) => awaitsRecheck(inspection)))
}

function inspectionApiOf(db: MockDatabase, no: string): InspectionApi | undefined {
  return inspectionsApi(db).find((row) => row.no === no)
}

export function registerInspectionsHandlers(router: MockRouter, db: MockDatabase): void {
  const editable: FieldReaders<Pick<InspectionRow, 'center' | 'findings'>> = {
    center: (input) => readString(input, 'center', { required: true }),
    findings: (input) => readString(input, 'findings')
  }

  function readInspectedOn(input: Record<string, unknown>): string {
    const inspectedOn = readDate(input, 'inspectedOn', { required: true }) ?? ''
    if (inspectedOn > todayIso()) throw unprocessable(FLEET_MESSAGES.dateInFuture)
    return inspectedOn
  }

  registerCrudResource(router, {
    basePath: '/fleet/inspections',
    feature: 'INSPECTION',
    collection: db.inspections,
    list: () => inspectionsApi(db),
    searchColumns: ['no', 'vehiclePlate', 'center'],
    optionFields: { result: 'inspectionResult', state: 'inspectionState' },
    create: (input) => {
      const vehicleNo = requireReference(db.vehicles, input, 'vehicleNo')
      if (db.vehicles.findOrFail(vehicleNo).removal) throw unknownReference('vehicleNo')
      const result =
        readEnum(input, 'result', INSPECTION_RESULTS, { required: true }) ?? 'conforming'
      const findings = editable.findings(input)
      if (result === 'non_conforming' && !findings) {
        throw unprocessable(FLEET_MESSAGES.inspectionFindingsRequired)
      }
      return {
        no: nextNo(
          db.inspections.all().map((row) => row.no),
          'INS-',
          5
        ),
        vehicleNo,
        inspectedOn: readInspectedOn(input),
        center: editable.center(input),
        result,
        findings,
        recheckDoneOn: null
      }
    },
    update: (existing, input) => {
      const patch = readPatch(input, editable)
      if (existing.result === 'non_conforming' && patch.findings === '') {
        throw unprocessable(FLEET_MESSAGES.inspectionFindingsRequired)
      }
      return patch
    }
  })

  router.post(
    '/fleet/inspections/:no/recheck',
    { feature: 'INSPECTION', action: 'update' },
    (request) => {
      const inspection = db.inspections.findOrFail(routeParam(request, 'no'))
      if (!awaitsRecheck(inspection)) throw conflict(FLEET_MESSAGES.inspectionNoRecheck)
      const recheckDoneOn = readDate(readBody(request), 'recheckDoneOn', { required: true }) ?? ''
      if (recheckDoneOn < inspection.inspectedOn || recheckDoneOn > todayIso()) {
        throw unprocessable(FLEET_MESSAGES.recheckDateInvalid)
      }
      db.inspections.update(inspection.no, { recheckDoneOn, ...stampModified(request) })
      return ok(inspectionApiOf(db, inspection.no))
    }
  )
}
