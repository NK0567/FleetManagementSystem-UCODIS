import {
  INFRACTION_SEVERITIES,
  type InfractionTypeApi
} from '@/modules/fleet/infraction-types/types/infractionType.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { InfractionTypeRow } from '../../fixtures/fleet/infractionTypes'
import { registerCrudResource } from '../../http/crudResource'
import { conflict } from '../../http/errors'
import {
  readAll,
  readBoolean,
  readCode,
  readEnum,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'

type Fields = Omit<InfractionTypeRow, 'no' | keyof AuditFields>

export function infractionTypesApi(db: MockDatabase): InfractionTypeApi[] {
  const infractions = db.infractions.all()
  return db.infractionTypes.all().map((row) => ({
    ...row,
    infractionCount: infractions.filter((infraction) => infraction.infractionTypeNo === row.no)
      .length
  }))
}

export function registerInfractionTypesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    defaultSeverity: (input) =>
      readEnum(input, 'defaultSeverity', INFRACTION_SEVERITIES, { required: true }) ?? 'major',
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/fleet/infraction-types',
    feature: 'INFRACTIONTYPE',
    collection: db.infractionTypes,
    list: () => infractionTypesApi(db),
    searchColumns: ['no', 'name'],
    optionFields: { defaultSeverity: 'infractionSeverity' },
    create: (input) => ({
      no: readCode(input),
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers),
    remove: (existing) => {
      if (db.infractions.all().some((infraction) => infraction.infractionTypeNo === existing.no)) {
        throw conflict(FLEET_MESSAGES.infractionTypeInUse)
      }
    }
  })
}
