import {
  TELEMATICS_FAMILIES,
  TELEMATICS_SEVERITIES,
  TELEMATICS_UNITS,
  type TelematicsEventTypeApi
} from '@/modules/fleet/telematics-event-types/types/telematicsEventType.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { TelematicsEventTypeRow } from '../../fixtures/fleet/telematicsEventTypes'
import { registerCrudResource } from '../../http/crudResource'
import { conflict } from '../../http/errors'
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
import { optionalReference } from '../../http/references'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'

type Fields = Omit<TelematicsEventTypeRow, 'no' | keyof AuditFields>

export function telematicsEventTypesApi(db: MockDatabase): TelematicsEventTypeApi[] {
  const events = db.telematicsEvents.all()
  const infractionTypes = new Map(db.infractionTypes.all().map((type) => [type.no, type.name]))
  return db.telematicsEventTypes.all().map((row) => ({
    ...row,
    infractionTypeName: infractionTypes.get(row.infractionTypeNo ?? '') ?? '',
    eventCount: events.filter((event) => event.eventTypeNo === row.no).length
  }))
}

export function registerTelematicsEventTypesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    family: (input) =>
      readEnum(input, 'family', TELEMATICS_FAMILIES, { required: true }) ?? 'behavior',
    severity: (input) =>
      readEnum(input, 'severity', TELEMATICS_SEVERITIES, { required: true }) ?? 'major',
    threshold: (input) => readNumber(input, 'threshold', { min: 0 }),
    unit: (input) => readEnum(input, 'unit', TELEMATICS_UNITS),
    raisesAlert: (input) => readBoolean(input, 'raisesAlert'),
    affectsScore: (input) => readBoolean(input, 'affectsScore'),
    infractionTypeNo: (input) => optionalReference(db.infractionTypes, input, 'infractionTypeNo'),
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/fleet/telematics-event-types',
    feature: 'TELEMATICSEVENTTYPE',
    collection: db.telematicsEventTypes,
    list: () => telematicsEventTypesApi(db),
    searchColumns: ['no', 'name'],
    optionFields: {
      family: 'telematicsFamily',
      severity: 'telematicsSeverity',
      unit: 'telematicsUnit'
    },
    create: (input) => ({
      no: readCode(input),
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers),
    remove: (existing) => {
      if (db.telematicsEvents.all().some((event) => event.eventTypeNo === existing.no)) {
        throw conflict(FLEET_MESSAGES.telematicsEventTypeInUse)
      }
    }
  })
}
