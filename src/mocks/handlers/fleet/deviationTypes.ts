import {
  DEVIATION_CATEGORIES,
  DEVIATION_SEVERITIES,
  DEVIATION_UNITS,
  type DeviationTypeApi
} from '@/modules/fleet/deviation-types/types/deviationType.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { DeviationTypeRow } from '../../fixtures/fleet/deviationTypes'
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
import { conflict } from '../../http/errors'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'

type Fields = Omit<DeviationTypeRow, 'no' | keyof AuditFields>

export function deviationTypesApi(db: MockDatabase): DeviationTypeApi[] {
  const deviations = db.routeDeviations.all()
  return db.deviationTypes.all().map((row) => ({
    ...row,
    deviationCount: deviations.filter((deviation) => deviation.deviationTypeNo === row.no).length
  }))
}

export function registerDeviationTypesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    category: (input) =>
      readEnum(input, 'category', DEVIATION_CATEGORIES, { required: true }) ?? 'route',
    severity: (input) =>
      readEnum(input, 'severity', DEVIATION_SEVERITIES, { required: true }) ?? 'major',
    threshold: (input) => readNumber(input, 'threshold', { min: 0 }),
    unit: (input) => readEnum(input, 'unit', DEVIATION_UNITS),
    autoDetected: (input) => readBoolean(input, 'autoDetected'),
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/fleet/deviation-types',
    feature: 'DEVIATIONTYPE',
    collection: db.deviationTypes,
    list: () => deviationTypesApi(db),
    searchColumns: ['no', 'name'],
    optionFields: {
      category: 'deviationCategory',
      severity: 'deviationSeverity',
      unit: 'deviationUnit'
    },
    create: (input) => ({
      no: readCode(input),
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers),
    remove: (existing) => {
      if (db.routeDeviations.all().some((deviation) => deviation.deviationTypeNo === existing.no)) {
        throw conflict(FLEET_MESSAGES.deviationTypeInUse)
      }
    }
  })
}
