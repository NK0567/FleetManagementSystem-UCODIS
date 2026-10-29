import { customerIssues } from '@/modules/planning/customers/domain/customer'
import {
  CUSTOMER_NATURES,
  DELIVERY_SLOTS,
  NOTIFICATION_CHANNELS,
  type CustomerApi
} from '@/modules/planning/customers/types/customer.types'
import { isValidEmail } from '@/utils/email'
import { normalizeSearchText } from '@/utils/search'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { CustomerRow } from '../../fixtures/planning/customers'
import { registerCrudResource } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  invalidField,
  readAll,
  readBoolean,
  readEnum,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'
import { PLANNING_MESSAGES } from './messages'

type Fields = Omit<CustomerRow, 'no' | keyof AuditFields>

export function customersApi(db: MockDatabase): CustomerApi[] {
  const pointCounts = new Map<string, number>()
  for (const point of db.deliveryPoints.all()) {
    pointCounts.set(point.customerNo, (pointCounts.get(point.customerNo) ?? 0) + 1)
  }
  return db.customers.all().map((row) => ({
    ...row,
    deliveryPointCount: pointCounts.get(row.no) ?? 0
  }))
}

function checkCustomer(db: MockDatabase, customer: Fields, no?: string): void {
  const key = normalizeSearchText(customer.name)
  const twin = db.customers
    .all()
    .find((other) => other.no !== no && normalizeSearchText(other.name) === key)
  if (twin) throw conflict(PLANNING_MESSAGES.customerNameTaken, { no: twin.no })
  const [issue] = customerIssues(customer)
  if (issue) throw unprocessable(PLANNING_MESSAGES[`customer_${issue}`])
}

export function registerCustomersHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    isOrderer: (input) => readBoolean(input, 'isOrderer'),
    isRecipient: (input) => readBoolean(input, 'isRecipient', true),
    nature: (input) =>
      readEnum(input, 'nature', CUSTOMER_NATURES, { required: true }) ?? 'external',
    address: (input) => readString(input, 'address'),
    city: (input) => readString(input, 'city'),
    contactName: (input) => readString(input, 'contactName'),
    phone: (input) => readString(input, 'phone'),
    email: (input) => {
      const email = readString(input, 'email')
      if (email && !isValidEmail(email)) throw invalidField('email')
      return email
    },
    notificationChannel: (input) =>
      readEnum(input, 'notificationChannel', NOTIFICATION_CHANNELS, { required: true }) ?? 'sms',
    confirmationRequired: (input) => readBoolean(input, 'confirmationRequired', true),
    preferredSlot: (input) => readEnum(input, 'preferredSlot', DELIVERY_SLOTS) ?? 'any',
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/planning/customers',
    feature: 'CUSTOMER',
    collection: db.customers,
    list: () => customersApi(db),
    searchColumns: ['no', 'name', 'city', 'contactName'],
    optionFields: {
      nature: 'customerNature',
      notificationChannel: 'notificationChannel',
      preferredSlot: 'deliverySlot'
    },
    create: (input) => {
      const customer = readAll(input, readers)
      checkCustomer(db, customer)
      return {
        no: nextNo(
          db.customers.all().map((row) => row.no),
          'CLI-',
          3
        ),
        ...customer
      }
    },
    update: (existing, input) => {
      const patch = readPatch(input, readers)
      const merged = { ...existing, ...patch }
      checkCustomer(db, merged, existing.no)
      if (
        !merged.isRecipient &&
        db.deliveryPoints.all().some((p) => p.customerNo === existing.no)
      ) {
        throw conflict(PLANNING_MESSAGES.customerHasDeliveryPoints)
      }
      return patch
    },
    remove: (existing) => {
      if (db.deliveryPoints.all().some((point) => point.customerNo === existing.no)) {
        throw conflict(PLANNING_MESSAGES.customerHasDeliveryPoints)
      }
    }
  })
}
