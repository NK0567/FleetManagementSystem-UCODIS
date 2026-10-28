import type { SiteApi } from '@/modules/fleet/sites/types/site.types'
import { isValidEmail } from '@/utils/email'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { SiteRow } from '../../fixtures/fleet/sites'
import { registerCrudResource } from '../../http/crudResource'
import { conflict } from '../../http/errors'
import {
  invalidField,
  readAll,
  readBoolean,
  readCode,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { requireReference } from '../../http/references'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'
import { fleetSettings } from './settings'

type Fields = Omit<SiteRow, 'no' | keyof AuditFields>

export function sitesApi(db: MockDatabase): SiteApi[] {
  const types = new Map(db.siteTypes.all().map((type) => [type.no, type]))
  const fallbackRadius = fleetSettings(db).geofencing.defaultSiteRadiusM
  return db.sites.all().map((site) => {
    const type = types.get(site.siteTypeNo)
    return {
      ...site,
      siteTypeName: type?.name ?? '',
      effectiveRadiusM: site.radiusM ?? type?.defaultRadiusM ?? fallbackRadius
    }
  })
}

/** Vehicles still in the fleet that start from this site. */
function homeBaseCount(db: MockDatabase, no: string): number {
  return db.vehicles.all().filter((vehicle) => vehicle.homeSiteNo === no && !vehicle.removal).length
}

/** A site still referenced is deactivated, never deleted. */
function assertUnused(db: MockDatabase, no: string): void {
  const count = homeBaseCount(db, no)
  if (count > 0) throw conflict(FLEET_MESSAGES.siteIsHomeBase, { count })
  if (db.employees.all().some((employee) => employee.siteCode === no)) {
    throw conflict(FLEET_MESSAGES.siteUsedByStaff)
  }
  if (db.orgUnits.all().some((unit) => unit.siteCode === no)) {
    throw conflict(FLEET_MESSAGES.siteUsedByOrgUnits)
  }
}

export function registerSitesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    siteTypeNo: (input) => requireReference(db.siteTypes, input, 'siteTypeNo'),
    city: (input) => readString(input, 'city'),
    region: (input) => readString(input, 'region'),
    address: (input) => readString(input, 'address'),
    email: (input) => {
      const email = readString(input, 'email')
      if (email && !isValidEmail(email)) throw invalidField('email')
      return email
    },
    thirdPartyOwner: (input) => readString(input, 'thirdPartyOwner'),
    active: (input) => readBoolean(input, 'active', true),
    latitude: (input) => readNumber(input, 'latitude', { required: true, min: -90, max: 90 }) ?? 0,
    longitude: (input) =>
      readNumber(input, 'longitude', { required: true, min: -180, max: 180 }) ?? 0,
    radiusM: (input) => readNumber(input, 'radiusM', { min: 50, max: 20000 })
  }

  const assertUniqueName = (name: string | undefined, no?: string) => {
    if (name === undefined) return
    const twin = db.sites
      .all()
      .find((site) => site.no !== no && site.name.toLowerCase() === name.toLowerCase())
    if (twin) throw conflict(FLEET_MESSAGES.duplicateSiteName, { no: twin.no })
  }

  registerCrudResource(router, {
    basePath: '/fleet/sites',
    feature: 'SITE',
    collection: db.sites,
    list: () => sitesApi(db),
    searchColumns: ['no', 'name', 'city'],
    create: (input) => {
      const fields = readAll(input, readers)
      assertUniqueName(fields.name)
      return { no: readCode(input), ...fields }
    },
    update: (existing, input) => {
      const patch = readPatch(input, readers)
      assertUniqueName(patch.name, existing.no)
      const count = homeBaseCount(db, existing.no)
      if (patch.active === false && existing.active && count > 0) {
        throw conflict(FLEET_MESSAGES.siteIsHomeBase, { count })
      }
      return patch
    },
    remove: (existing) => assertUnused(db, existing.no)
  })
}
