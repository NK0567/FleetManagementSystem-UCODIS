import { reasonListKey } from '@/modules/planning/reasons/domain/reasonLists'
import { PLANNING_REASON_KINDS } from '@/modules/planning/reasons/types/planningReason.types'
import type { ReferenceItem } from '@/types/reference.types'
import type { MockDatabase } from '../../db/database'

export function planningReferenceData(db: MockDatabase): Record<string, ReferenceItem[]> {
  const customers = db.customers.all()
  const asItem = (customer: (typeof customers)[number]) => ({
    code: customer.no,
    description: customer.name,
    active: customer.active
  })
  return {
    ordererCustomers: customers.filter((customer) => customer.isOrderer).map(asItem),
    billableCustomers: customers.filter((customer) => customer.nature === 'external').map(asItem),
    carriers: db.providers
      .all()
      .filter((provider) => provider.providerType === 'carrier')
      .map((provider) => ({
        code: provider.no,
        description: provider.name,
        active: provider.authorized
      })),
    recipientCustomers: customers.filter((customer) => customer.isRecipient).map(asItem),
    products: db.products
      .all()
      .map((product) => ({ code: product.no, description: product.name, active: product.active })),
    ...Object.fromEntries(
      PLANNING_REASON_KINDS.map((kind) => [
        reasonListKey(kind),
        db.planningReasons
          .all()
          .filter((reason) => reason.kind === kind)
          .map((reason) => ({ code: reason.no, description: reason.name, active: reason.active }))
      ])
    ),
    deliveryPoints: db.deliveryPoints.all().map((point) => ({
      code: point.no,
      description: point.name,
      active: point.active,
      parentCode: point.customerNo
    })),
    // The regions of the sites, to filter the transport orders by the places they serve.
    planningRegions: [
      ...new Set(
        db.sites
          .all()
          .map((site) => site.region)
          .filter(Boolean)
      )
    ]
      .sort((a, b) => a.localeCompare(b))
      .map((region) => ({ code: region, description: region, active: true })),
    // The loading depots, where an order is picked up (TRS01-US02, TRS07-US02).
    depotPoints: db.deliveryPoints
      .all()
      .filter((point) => point.kind === 'depot')
      .map((point) => ({ code: point.no, description: point.name, active: point.active }))
  }
}
