import type { DeliveryPointApi } from '@/modules/planning/delivery-points/types/deliveryPoint.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { DeliveryPointRow } from '../../fixtures/planning/deliveryPoints'
import { registerCrudResource } from '../../http/crudResource'
import { unprocessable } from '../../http/errors'
import {
  readAll,
  readBoolean,
  readEnum,
  readNumber,
  readPatch,
  readString,
  readStringList,
  type FieldReaders
} from '../../http/input'
import { optionalReference, requireReference, unknownReference } from '../../http/references'
import type { MockRouter } from '../../http/router'
import { PLANNING_MESSAGES } from './messages'

type Fields = Omit<DeliveryPointRow, 'no' | keyof AuditFields>

export function deliveryPointsApi(db: MockDatabase): DeliveryPointApi[] {
  const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
  const sites = new Map(db.sites.all().map((site) => [site.no, site]))
  return db.deliveryPoints.all().map((row) => {
    const site = row.siteNo ? sites.get(row.siteNo) : undefined
    return {
      ...row,
      kind: row.kind ?? 'delivery',
      siteNo: row.siteNo ?? null,
      siteName: site?.name ?? '',
      siteRegion: site?.region ?? '',
      ownerName: row.ownerName ?? '',
      customerName: customers.get(row.customerNo) ?? ''
    }
  })
}

/**
 * A point tied to a site of the FMS register takes its place from there: coordinates, address,
 * city and, for a depot, the third party that owns it (TRS07-US02).
 */
function fromSite(db: MockDatabase, siteNo: string | null) {
  if (!siteNo) return {}
  const site = db.sites.findOrFail(siteNo)
  return {
    latitude: site.latitude,
    longitude: site.longitude,
    city: site.city,
    address: site.address || site.name
  }
}

/** The owner of a depot tied to a site comes from the register; null when not tied. */
function siteOwner(db: MockDatabase, siteNo: string | null): string | null {
  return siteNo ? (db.sites.find(siteNo)?.thirdPartyOwner ?? '') : null
}

export function registerDeliveryPointsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Omit<Fields, 'customerNo'>> = {
    name: (input) => readString(input, 'name', { required: true }),
    address: (input) => readString(input, 'address'),
    city: (input) => readString(input, 'city'),
    // Tied to a site of the register, the place comes from the site.
    latitude: (input) =>
      readNumber(input, 'latitude', { required: !input.siteNo, min: -90, max: 90 }) ?? 0,
    longitude: (input) =>
      readNumber(input, 'longitude', { required: !input.siteNo, min: -180, max: 180 }) ?? 0,
    pumpRequired: (input) => readBoolean(input, 'pumpRequired'),
    acceptedVehicleTypeNos: (input) => {
      const types = [...new Set(readStringList(input, 'acceptedVehicleTypeNos'))]
      if (types.some((type) => !db.vehicleTypes.exists(type))) {
        throw unknownReference('acceptedVehicleTypeNos')
      }
      return types
    },
    active: (input) => readBoolean(input, 'active', true),
    kind: (input) => readEnum(input, 'kind', ['delivery', 'depot'] as const) ?? 'delivery',
    siteNo: (input) => optionalReference(db.sites, input, 'siteNo'),
    ownerName: (input) => readString(input, 'ownerName')
  }

  // The customer is set at creation: moving a point would rewrite the deliveries made there.
  function readCustomer(input: Record<string, unknown>): string {
    const customerNo = requireReference(db.customers, input, 'customerNo')
    const customer = db.customers.findOrFail(customerNo)
    if (!customer.isRecipient || !customer.active) {
      throw unprocessable(PLANNING_MESSAGES.deliveryPointCustomerNotRecipient)
    }
    return customerNo
  }

  registerCrudResource(router, {
    basePath: '/planning/delivery-points',
    feature: 'DELIVERYPOINT',
    collection: db.deliveryPoints,
    list: () => deliveryPointsApi(db),
    searchColumns: ['no', 'name', 'customerName', 'city'],
    create: (input) => {
      const fields = readAll(input, readers)
      // A depot is the company's or a third party's, not a recipient's site.
      const customerNo = fields.kind === 'depot' ? '' : readCustomer(input)
      return {
        no: nextNo(
          db.deliveryPoints.all().map((row) => row.no),
          'DP-',
          3
        ),
        customerNo,
        ...fields,
        ...fromSite(db, fields.siteNo ?? null),
        ownerName: siteOwner(db, fields.siteNo ?? null) ?? fields.ownerName ?? ''
      }
    },
    update: (existing, input) => {
      const patch = readPatch(input, readers)
      if (patch.kind && patch.kind !== (existing.kind ?? 'delivery')) {
        throw unprocessable(PLANNING_MESSAGES.deliveryPointCustomerNotRecipient)
      }
      const siteNo = 'siteNo' in patch ? (patch.siteNo ?? null) : (existing.siteNo ?? null)
      const owner = siteOwner(db, siteNo)
      return { ...patch, ...fromSite(db, siteNo), ...(owner !== null ? { ownerName: owner } : {}) }
    },
    remove: () => undefined
  })
}
