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
    recipientCustomers: customers.filter((customer) => customer.isRecipient).map(asItem),
    deliveryPoints: db.deliveryPoints.all().map((point) => ({
      code: point.no,
      description: point.name,
      active: point.active,
      parentCode: point.customerNo
    }))
  }
}
