import type { SiteTypeApi } from '@/modules/fleet/site-types/types/siteType.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { SiteTypeRow } from '../../fixtures/fleet/siteTypes'
import { registerCrudResource } from '../../http/crudResource'
import {
  readAll,
  readBoolean,
  readCode,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'
import { conflict } from '../../http/errors'
import { FLEET_MESSAGES } from './messages'

type Fields = Omit<SiteTypeRow, 'no' | keyof AuditFields>

export function siteTypesApi(db: MockDatabase): SiteTypeApi[] {
  const sites = db.sites.all()
  return db.siteTypes.all().map((row) => ({
    ...row,
    siteCount: sites.filter((site) => site.siteTypeNo === row.no).length
  }))
}

export function registerSiteTypesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    defaultRadiusM: (input) =>
      readNumber(input, 'defaultRadiusM', { required: true, min: 50 }) ?? 0,
    color: (input) => readString(input, 'color'),
    loadingDepot: (input) => readBoolean(input, 'loadingDepot'),
    restAllowed: (input) => readBoolean(input, 'restAllowed'),
    restricted: (input) => readBoolean(input, 'restricted'),
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/fleet/site-types',
    feature: 'SITETYPE',
    collection: db.siteTypes,
    list: () => siteTypesApi(db),
    searchColumns: ['no', 'name'],
    create: (input) => ({
      no: readCode(input),
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers),
    remove: (existing) => {
      if (db.sites.all().some((site) => site.siteTypeNo === existing.no)) {
        throw conflict(FLEET_MESSAGES.siteTypeInUse)
      }
    }
  })
}
