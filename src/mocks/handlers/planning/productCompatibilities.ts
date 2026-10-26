import { sameRule } from '@/modules/planning/product-compatibilities/domain/productCompatibility'
import {
  PRODUCT_COMPATIBILITY_KINDS,
  type ProductCompatibilityApi
} from '@/modules/planning/product-compatibilities/types/productCompatibility.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { ProductCompatibilityRow } from '../../fixtures/planning/productCompatibilities'
import { registerCrudResource } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readAll, readBoolean, readEnum, readPatch, type FieldReaders } from '../../http/input'
import { requireReference } from '../../http/references'
import type { MockRouter } from '../../http/router'
import { PLANNING_MESSAGES } from './messages'

type Fields = Omit<ProductCompatibilityRow, 'no' | keyof AuditFields>

export function productCompatibilitiesApi(db: MockDatabase): ProductCompatibilityApi[] {
  const products = new Map(db.products.all().map((product) => [product.no, product.name]))
  return db.productCompatibilities.all().map((row) => ({
    ...row,
    productAName: products.get(row.productANo) ?? '',
    productBName: products.get(row.productBNo) ?? ''
  }))
}

function checkRule(db: MockDatabase, rule: Fields, no?: string): void {
  if (rule.productANo === rule.productBNo) {
    throw unprocessable(PLANNING_MESSAGES.compatibilitySameProduct)
  }
  const twin = db.productCompatibilities
    .all()
    .find((other) => other.no !== no && sameRule(other, rule))
  if (twin) throw conflict(PLANNING_MESSAGES.compatibilityExists, { no: twin.no })
}

export function registerProductCompatibilitiesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    kind: (input) =>
      readEnum(input, 'kind', PRODUCT_COMPATIBILITY_KINDS, { required: true }) ?? 'together',
    productANo: (input) => requireReference(db.products, input, 'productANo'),
    productBNo: (input) => requireReference(db.products, input, 'productBNo'),
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/planning/product-compatibilities',
    feature: 'PRODUCTCOMPATIBILITY',
    collection: db.productCompatibilities,
    list: () => productCompatibilitiesApi(db),
    searchColumns: ['no', 'productAName', 'productBName'],
    optionFields: { kind: 'productCompatibilityKind' },
    create: (input) => {
      const rule = readAll(input, readers)
      checkRule(db, rule)
      return {
        no: nextNo(
          db.productCompatibilities.all().map((row) => row.no),
          'CMP-',
          3
        ),
        ...rule
      }
    },
    update: (existing, input) => {
      const patch = readPatch(input, readers)
      checkRule(db, { ...existing, ...patch }, existing.no)
      return patch
    },
    remove: () => undefined
  })
}
