import {
  awaitsRecheck,
  gridResult,
  INSPECTION_VERDICTS,
  inspectionGridIssues,
  inspectionState,
  itemsToRecheck,
  recheckDueOn,
  type InspectionItemResult
} from '@/modules/fleet/inspections/domain/inspection'
import type { InspectionApi } from '@/modules/fleet/inspections/types/inspection.types'
import type { InspectionPart } from '@/modules/fleet/inspection-items/types/inspectionItem.types'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { InspectionRow } from '../../fixtures/fleet/inspections'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  readBoolean,
  readDate,
  readEnum,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { requireReference, unknownReference } from '../../http/references'
import { ok } from '../../http/responses'
import { sessionUser } from '../../http/types'
import { nowIso } from '../../clock'
import { activeInspectionItems } from './inspectionItems'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'
import { workOrdersBySource } from '../maintenance/workOrderSources'
import { fleetSettings } from './settings'

export function inspectionsApi(db: MockDatabase): InspectionApi[] {
  const today = todayIso()
  const delay = fleetSettings(db).safety.recheckDelayDays
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const orders = workOrdersBySource(db)
  return db.inspections.all().map((inspection) => ({
    ...inspection,
    workOrderNo: orders.get(`inspection ${inspection.no}`)?.no ?? null,
    vehiclePlate: plates.get(inspection.vehicleNo) ?? inspection.vehicleNo,
    recheckItemNos: itemsToRecheck(inspection.items).map((item) => item.itemNo),
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

/** The parts of the grid a vehicle is inspected on: the tank only when it carries one. */
function partsOf(db: MockDatabase, vehicleNo: string): InspectionPart[] {
  const vehicle = db.vehicles.findOrFail(vehicleNo)
  return vehicle.compartments.length || vehicle.vehicleTypeNo === 'TANKER'
    ? ['vehicle', 'tank']
    : ['vehicle']
}

/**
 * The verdicts given on the grid of the vehicle, labels copied from the grid: the client only says
 * which item got which verdict.
 */
function readGrid(db: MockDatabase, vehicleNo: string, input: Record<string, unknown>) {
  const raw = Array.isArray(input.items) ? (input.items as Record<string, unknown>[]) : []
  const grid = activeInspectionItems(db, partsOf(db, vehicleNo))
  if (raw.some((entry) => !grid.some((item) => item.no === entry.itemNo))) {
    throw unknownReference('items')
  }
  const items: InspectionItemResult[] = grid.map((item) => {
    const entry = raw.find((candidate) => candidate.itemNo === item.no) ?? {}
    return {
      itemNo: item.no,
      label: item.label,
      part: item.part,
      verdict: readEnum(entry, 'verdict', INSPECTION_VERDICTS),
      comment: readString(entry, 'comment')
    }
  })
  const [issue] = inspectionGridIssues(items)
  if (issue === 'incomplete') throw unprocessable(FLEET_MESSAGES.inspectionItemsIncomplete)
  if (issue) throw unprocessable(FLEET_MESSAGES.inspectionObservationRequired)
  return items
}

export function registerInspectionsHandlers(router: MockRouter, db: MockDatabase): void {
  // The grid to fill for a vehicle, before the inspection is recorded.
  router.get('/fleet/inspections/grid', { feature: 'INSPECTION', action: 'insert' }, (request) => {
    const vehicleNo = requireReference(db.vehicles, request.query, 'vehicleNo')
    return ok(
      activeInspectionItems(db, partsOf(db, vehicleNo)).map((item) => ({
        itemNo: item.no,
        label: item.label,
        part: item.part
      }))
    )
  })

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
    // The report follows the grid, item by item, and is signed by the inspector: its verdicts cannot change after.
    create: (input, request) => {
      const vehicleNo = requireReference(db.vehicles, input, 'vehicleNo')
      if (db.vehicles.findOrFail(vehicleNo).removal) throw unknownReference('vehicleNo')
      const items = readGrid(db, vehicleNo, input)
      const result = gridResult(items)
      const inspector = readString(input, 'inspector')
      if (!inspector || !readBoolean(input, 'signed')) {
        throw unprocessable(FLEET_MESSAGES.inspectionSignatureRequired)
      }
      const findings =
        editable.findings(input) ||
        itemsToRecheck(items)
          .map((item) => `${item.itemNo} ${item.label} : ${item.comment}`)
          .join(' ; ')
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
        recheckDoneOn: null,
        items,
        inspector,
        signedBy: sessionUser(request).code,
        signedAt: nowIso()
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
