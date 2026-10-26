import { productNeedsDensity, withFuelFields } from '@/modules/planning/products/domain/product'
import type { ProductApi } from '@/modules/planning/products/types/product.types'
import { normalizeSearchText } from '@/utils/search'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { ProductRow } from '../../fixtures/planning/products'
import { registerCrudResource } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  readAll,
  readBoolean,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'
import { PLANNING_MESSAGES } from './messages'

type Fields = Omit<ProductRow, 'no' | keyof AuditFields>

export function productsApi(db: MockDatabase): ProductApi[] {
  return db.products.all()
}

function checkProduct(db: MockDatabase, product: Fields, no?: string): Fields {
  const key = normalizeSearchText(product.name)
  const twin = db.products
    .all()
    .find((other) => other.no !== no && normalizeSearchText(other.name) === key)
  if (twin) throw conflict(PLANNING_MESSAGES.productNameTaken, { no: twin.no })
  if (productNeedsDensity(product)) throw unprocessable(PLANNING_MESSAGES.productNeedsDensity)
  return withFuelFields(product)
}

export function registerProductsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    family: (input) => readString(input, 'family', { required: true }),
    unit: (input) => readString(input, 'unit', { required: true }),
    active: (input) => readBoolean(input, 'active', true),
    isFuel: (input) => readBoolean(input, 'isFuel'),
    referenceDensity: (input) => readNumber(input, 'referenceDensity', { min: 0.5, max: 1.2 }),
    expansionCoefficient: (input) =>
      readNumber(input, 'expansionCoefficient', { min: 0, max: 0.005 })
  }

  registerCrudResource(router, {
    basePath: '/planning/products',
    feature: 'PRODUCT',
    collection: db.products,
    list: () => productsApi(db),
    searchColumns: ['no', 'name', 'family'],
    create: (input) => ({
      no: nextNo(
        db.products.all().map((row) => row.no),
        'PRD-',
        3
      ),
      ...checkProduct(db, readAll(input, readers))
    }),
    update: (existing, input) => {
      const patch = readPatch(input, readers)
      const merged = checkProduct(db, { ...existing, ...patch }, existing.no)
      return {
        ...patch,
        referenceDensity: merged.referenceDensity,
        expansionCoefficient: merged.expansionCoefficient
      }
    },
    remove: () => undefined
  })
}
