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
  readNumber,
  readPatch,
  readString,
  readStringList,
  type FieldReaders
} from '../../http/input'
import { requireReference, unknownReference } from '../../http/references'
import type { MockRouter } from '../../http/router'
import { PLANNING_MESSAGES } from './messages'

type Fields = Omit<DeliveryPointRow, 'no' | keyof AuditFields>

export function deliveryPointsApi(db: MockDatabase): DeliveryPointApi[] {
  const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
  return db.deliveryPoints.all().map((row) => ({
    ...row,
    customerName: customers.get(row.customerNo) ?? ''
  }))
}

export function registerDeliveryPointsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Omit<Fields, 'customerNo'>> = {
    name: (input) => readString(input, 'name', { required: true }),
    address: (input) => readString(input, 'address'),
    city: (input) => readString(input, 'city'),
    latitude: (input) => readNumber(input, 'latitude', { required: true, min: -90, max: 90 }) ?? 0,
    longitude: (input) =>
      readNumber(input, 'longitude', { required: true, min: -180, max: 180 }) ?? 0,
    pumpRequired: (input) => readBoolean(input, 'pumpRequired'),
    acceptedVehicleTypeNos: (input) => {
      const types = [...new Set(readStringList(input, 'acceptedVehicleTypeNos'))]
      if (types.some((type) => !db.vehicleTypes.exists(type))) {
        throw unknownReference('acceptedVehicleTypeNos')
      }
      return types
    },
    active: (input) => readBoolean(input, 'active', true)
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
    create: (input) => ({
      no: nextNo(
        db.deliveryPoints.all().map((row) => row.no),
        'DP-',
        3
      ),
      customerNo: readCustomer(input),
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers),
    remove: () => undefined
  })
}
