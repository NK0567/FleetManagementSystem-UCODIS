import type { MockDatabase } from '../../db/database'
import { toAccount } from '../../auth/accounts'
import { readBody, routeParam, stampModified } from '../../http/crudResource'
import { notFound, unprocessable } from '../../http/errors'
import { invalidField } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { CIRCUIT_MESSAGES } from './circuitMessages'

/** The site type of the FMS register that marks a loading depot. */
const DEPOT_TYPE = 'DEPOT'

export interface UserPerimeterApi {
  code: string
  name: string
  profile: string
  depotNos: string[]
  regions: string[]
}

export interface PerimeterOptionsApi {
  depots: { no: string; name: string; region: string; ownerName: string }[]
  regions: string[]
}

function perimetersApi(db: MockDatabase): UserPerimeterApi[] {
  const accounts = db.userAccounts.all().map(toAccount)
  return accounts
    .filter((account) => account.active && account.profile !== 'DRIVER')
    .map((account) => {
      const row = db.perimeters.find(account.code)
      return {
        code: account.code,
        name: account.name,
        profile: account.profile,
        depotNos: row?.depotNos ?? [],
        regions: row?.regions ?? []
      }
    })
}

function optionsApi(db: MockDatabase): PerimeterOptionsApi {
  const sites = db.sites.all()
  return {
    depots: sites
      .filter((site) => site.siteTypeNo === DEPOT_TYPE)
      .map((site) => ({
        no: site.no,
        name: site.name,
        region: site.region,
        ownerName: site.thirdPartyOwner
      })),
    regions: [...new Set(sites.map((site) => site.region).filter(Boolean))].sort()
  }
}

function readList(body: Record<string, unknown>, field: string): string[] {
  const raw = body[field]
  if (!Array.isArray(raw) || raw.some((item) => typeof item !== 'string')) throw invalidField(field)
  return [...new Set(raw as string[])]
}

/**
 * Each user is tied to depots and regions (TRS07-US02): he then sees only the transport orders
 * and the orders that depend on them. Nothing tied means everything is seen.
 */
export function registerPerimeterAdminHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/planning/perimeters', { feature: 'PLANNINGSETTINGS', action: 'read' }, () =>
    ok({ users: perimetersApi(db), options: optionsApi(db) })
  )

  router.put(
    '/planning/perimeters/:code',
    { feature: 'PLANNINGSETTINGS', action: 'update' },
    (request) => {
      const code = routeParam(request, 'code')
      if (!db.userAccounts.find(code)) {
        throw notFound(CIRCUIT_MESSAGES.perimeterUnknownUser)
      }
      const body = readBody(request)
      const depotNos = readList(body, 'depotNos')
      const regions = readList(body, 'regions')
      const options = optionsApi(db)
      const unknownDepot = depotNos.find((no) => !options.depots.some((depot) => depot.no === no))
      if (unknownDepot)
        throw unprocessable(CIRCUIT_MESSAGES.perimeterUnknownDepot, { no: unknownDepot })
      const unknownRegion = regions.find((region) => !options.regions.includes(region))
      if (unknownRegion) {
        throw unprocessable(CIRCUIT_MESSAGES.perimeterUnknownRegion, { region: unknownRegion })
      }
      const stamp = stampModified(request)
      if (db.perimeters.exists(code)) db.perimeters.update(code, { depotNos, regions, ...stamp })
      else {
        db.perimeters.insert({
          no: code,
          depotNos,
          regions,
          createdAt: stamp.modifiedAt,
          createdBy: stamp.modifiedBy,
          ...stamp
        })
      }
      return ok(perimetersApi(db).find((item) => item.code === code))
    }
  )
}
