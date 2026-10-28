import type { MissionTypeApi } from '@/modules/maintenance/mission-types/types/missionType.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { MissionTypeRow } from '../../fixtures/maintenance/missionTypes'
import { registerCrudResource } from '../../http/crudResource'
import {
  readAll,
  readBoolean,
  readCode,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'

type Fields = Omit<MissionTypeRow, 'no' | keyof AuditFields>

export function missionTypesApi(db: MockDatabase): MissionTypeApi[] {
  return db.missionTypes.all()
}

export function registerMissionTypesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    isControl: (input) => readBoolean(input, 'isControl'),
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/maintenance/mission-types',
    feature: 'MISSIONTYPE',
    collection: db.missionTypes,
    list: () => missionTypesApi(db),
    searchColumns: ['no', 'name'],
    create: (input) => ({
      no: readCode(input),
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers),
    remove: () => undefined
  })
}
