import {
  isCompanyTolerance,
  toleranceIssues
} from '@/modules/planning/quantity-tolerances/domain/quantityTolerance'
import {
  TOLERANCE_UNITS,
  type QuantityToleranceApi
} from '@/modules/planning/quantity-tolerances/types/quantityTolerance.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { QuantityToleranceRow } from '../../fixtures/planning/quantityTolerances'
import { registerCrudResource } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readAll, readEnum, readNumber, readPatch, type FieldReaders } from '../../http/input'
import { optionalReference } from '../../http/references'
import type { MockRouter } from '../../http/router'
import { localize, toMockLanguage, type MockLanguage } from '../../i18n'
import { PLANNING_MESSAGES } from './messages'

type Fields = Omit<QuantityToleranceRow, 'no' | keyof AuditFields>

export function quantityTolerancesApi(
  db: MockDatabase,
  language: MockLanguage
): QuantityToleranceApi[] {
  const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
  const products = new Map(db.products.all().map((product) => [product.no, product.name]))
  return db.quantityTolerances.all().map((row) => {
    const customerName = row.customerNo ? (customers.get(row.customerNo) ?? '') : ''
    const productName = row.productNo ? (products.get(row.productNo) ?? '') : ''
    return {
      ...row,
      scopeLabel:
        [customerName, productName].filter(Boolean).join(' · ') ||
        localize(language, PLANNING_MESSAGES.companyTolerance),
      customerName,
      productName
    }
  })
}

/** One rule per customer and product pair; the company rule always exists. */
function checkTolerance(db: MockDatabase, tolerance: Fields, no?: string): void {
  const [issue] = toleranceIssues(tolerance)
  if (issue) throw unprocessable(PLANNING_MESSAGES[`tolerance_${issue}`])
  const twin = db.quantityTolerances
    .all()
    .find(
      (other) =>
        other.no !== no &&
        other.customerNo === tolerance.customerNo &&
        other.productNo === tolerance.productNo
    )
  if (twin) throw conflict(PLANNING_MESSAGES.toleranceExists, { no: twin.no })
}

export function registerQuantityTolerancesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    customerNo: (input) => optionalReference(db.customers, input, 'customerNo'),
    productNo: (input) => optionalReference(db.products, input, 'productNo'),
    value: (input) => readNumber(input, 'value', { required: true, min: 0, max: 1000000000 }) ?? 0,
    unit: (input) => readEnum(input, 'unit', TOLERANCE_UNITS, { required: true }) ?? 'percent'
  }
  const editable: FieldReaders<Pick<Fields, 'value' | 'unit'>> = {
    value: readers.value,
    unit: readers.unit
  }

  registerCrudResource(router, {
    basePath: '/planning/quantity-tolerances',
    feature: 'QUANTITYTOLERANCE',
    collection: db.quantityTolerances,
    list: (request) => quantityTolerancesApi(db, toMockLanguage(request.language)),
    searchColumns: ['no', 'scopeLabel', 'customerName', 'productName'],
    optionFields: { unit: 'toleranceUnit' },
    create: (input) => {
      const tolerance = readAll(input, readers)
      checkTolerance(db, tolerance)
      return {
        no: nextNo(
          db.quantityTolerances.all().map((row) => row.no),
          'TOL-',
          3
        ),
        ...tolerance
      }
    },
    // The scope is fixed at creation: changing it would make another rule out of this one.
    update: (existing, input) => {
      const patch = readPatch(input, editable)
      checkTolerance(db, { ...existing, ...patch }, existing.no)
      return patch
    },
    remove: (existing) => {
      if (isCompanyTolerance(existing)) throw conflict(PLANNING_MESSAGES.companyToleranceKept)
    }
  })
}
