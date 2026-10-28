import {
  DOWNTIME_FAMILIES,
  DOWNTIME_ROLES,
  type DowntimeCodeApi
} from '@/modules/maintenance/downtime-codes/types/downtimeCode.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { DowntimeCodeRow } from '../../fixtures/maintenance/downtimeCodes'
import { registerCrudResource } from '../../http/crudResource'
import {
  readAll,
  readBoolean,
  readCode,
  readEnum,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { conflict } from '../../http/errors'
import type { MockRouter } from '../../http/router'
import { MAINTENANCE_MESSAGES } from './messages'

type Fields = Omit<DowntimeCodeRow, 'no' | keyof AuditFields>

export function downtimeCodesApi(db: MockDatabase): DowntimeCodeApi[] {
  return db.downtimeCodes.all()
}

export function registerDowntimeCodesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    family: (input) =>
      readEnum(input, 'family', DOWNTIME_FAMILIES, { required: true }) ?? 'technical',
    systemRole: (input) => readEnum(input, 'systemRole', DOWNTIME_ROLES),
    active: (input) => readBoolean(input, 'active', true)
  }

  /** The application picks the cause of a breakdown, a service or an accident on its own. */
  function assertRoleFree(code: Pick<DowntimeCodeRow, 'no' | 'systemRole'>) {
    const holder = db.downtimeCodes
      .all()
      .find((row) => row.no !== code.no && code.systemRole && row.systemRole === code.systemRole)
    if (holder) throw conflict(MAINTENANCE_MESSAGES.downtimeRoleTaken, { no: holder.no })
  }

  registerCrudResource(router, {
    basePath: '/maintenance/downtime-codes',
    feature: 'DOWNTIMECODE',
    collection: db.downtimeCodes,
    list: () => downtimeCodesApi(db),
    searchColumns: ['no', 'name'],
    optionFields: { family: 'downtimeFamily', systemRole: 'downtimeRole' },
    create: (input) => {
      const code = { no: readCode(input), ...readAll(input, readers) }
      assertRoleFree(code)
      return code
    },
    update: (existing, input) => {
      const patch = readPatch(input, readers)
      assertRoleFree({ ...existing, ...patch })
      return patch
    },
    remove: (existing) => {
      if (existing.systemRole) throw conflict(MAINTENANCE_MESSAGES.downtimeCodeHasRole)
    }
  })
}
