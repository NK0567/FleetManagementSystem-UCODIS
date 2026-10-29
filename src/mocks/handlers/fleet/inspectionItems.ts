import {
  INSPECTION_PARTS,
  type InspectionItemApi,
  type InspectionPart
} from '@/modules/fleet/inspection-items/types/inspectionItem.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { InspectionItemRow } from '../../fixtures/fleet/inspectionItems'
import { registerCrudResource } from '../../http/crudResource'
import {
  readAll,
  readBoolean,
  readCode,
  readEnum,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'

type Fields = Omit<InspectionItemRow, 'no' | keyof AuditFields>

export function inspectionItemsApi(db: MockDatabase): InspectionItemApi[] {
  return db.inspectionItems.all()
}

/** The active items of the grid, vehicle first, then the tank when the vehicle carries one. */
export function activeInspectionItems(
  db: MockDatabase,
  parts: readonly InspectionPart[]
): InspectionItemRow[] {
  return db.inspectionItems
    .all()
    .filter((item) => item.active && parts.includes(item.part))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

/** The periodic inspection grid: its items are kept in the reference data, not in the code. */
export function registerInspectionItemsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    label: (input) => readString(input, 'label', { required: true }),
    part: (input) => readEnum(input, 'part', INSPECTION_PARTS, { required: true }) ?? 'vehicle',
    sortOrder: (input) => readNumber(input, 'sortOrder', { required: true, min: 1, max: 999 }) ?? 0,
    active: (input) => readBoolean(input, 'active', true)
  }

  // An item already used by a report stays: past reports keep their own copy of its label.
  registerCrudResource(router, {
    basePath: '/fleet/inspection-items',
    feature: 'INSPECTIONITEM',
    collection: db.inspectionItems,
    list: () => inspectionItemsApi(db),
    searchColumns: ['no', 'label'],
    optionFields: { part: 'inspectionPart' },
    create: (input) => ({ no: readCode(input), ...readAll(input, readers) }),
    update: (_existing, input) => readPatch(input, readers),
    remove: () => undefined
  })
}
