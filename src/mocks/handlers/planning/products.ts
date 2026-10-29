import {
  defaultMeasures,
  FUEL_MEASURES,
  measureIssues,
  PRODUCT_MEASURES,
  productNeedsDensity,
  withFuelFields,
  type ProductMeasure
} from '@/modules/planning/products/domain/product'
import type { ProductApi } from '@/modules/planning/products/types/product.types'
import { normalizeSearchText } from '@/utils/search'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { ProductRow } from '../../fixtures/planning/products'
import { registerCrudResource } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  invalidField,
  readAll,
  readBoolean,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'
import { CIRCUIT_MESSAGES } from './circuitMessages'
import { PLANNING_MESSAGES } from './messages'

type Fields = Omit<ProductRow, 'no' | keyof AuditFields>

export function productsApi(db: MockDatabase): ProductApi[] {
  return db.products.all().map((row) => ({
    ...row,
    unitWeightKg: row.unitWeightKg ?? null,
    unitVolumeM3: row.unitVolumeM3 ?? null,
    loadingMeasures: row.loadingMeasures ?? defaultMeasures(row.isFuel),
    deliveryMeasures: row.deliveryMeasures ?? defaultMeasures(row.isFuel)
  }))
}

function readMeasures(input: Record<string, unknown>, field: string): ProductMeasure[] {
  const raw = input[field]
  if (raw == null) return []
  if (!Array.isArray(raw) || raw.some((item) => !PRODUCT_MEASURES.includes(item as never))) {
    throw invalidField(field)
  }
  return [...new Set(raw as ProductMeasure[])]
}

/** The quantity is always measured; temperature, density and volume at 15 °C, only on a fuel. */
function checkMeasures(product: Fields): void {
  for (const measures of [product.loadingMeasures, product.deliveryMeasures]) {
    const [issue] = measureIssues(product.isFuel, measures ?? defaultMeasures(product.isFuel))
    if (issue === 'quantityRequired') throw unprocessable(CIRCUIT_MESSAGES.measureQuantityRequired)
    if (issue === 'fuelOnly') throw unprocessable(CIRCUIT_MESSAGES.measureFuelOnly)
  }
}

function checkProduct(db: MockDatabase, product: Fields, no?: string): Fields {
  const key = normalizeSearchText(product.name)
  const twin = db.products
    .all()
    .find((other) => other.no !== no && normalizeSearchText(other.name) === key)
  if (twin) throw conflict(PLANNING_MESSAGES.productNameTaken, { no: twin.no })
  if (productNeedsDensity(product)) throw unprocessable(PLANNING_MESSAGES.productNeedsDensity)
  checkMeasures(product)
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
      readNumber(input, 'expansionCoefficient', { min: 0, max: 0.005 }),
    unitWeightKg: (input) => readNumber(input, 'unitWeightKg', { min: 0, max: 100000 }),
    unitVolumeM3: (input) => readNumber(input, 'unitVolumeM3', { min: 0, max: 1000 }),
    // Left out, a product takes the default measures of its kind.
    loadingMeasures: (input) =>
      'loadingMeasures' in input
        ? readMeasures(input, 'loadingMeasures')
        : defaultMeasures(input.isFuel === true),
    deliveryMeasures: (input) =>
      'deliveryMeasures' in input
        ? readMeasures(input, 'deliveryMeasures')
        : defaultMeasures(input.isFuel === true)
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
      const isFuel = patch.isFuel ?? existing.isFuel
      // A product that stops being a fuel drops the measures of a fuel, as its density.
      const kept = (field: 'loadingMeasures' | 'deliveryMeasures') =>
        field in input
          ? patch[field]
          : (existing[field] ?? defaultMeasures(existing.isFuel)).filter(
              (measure) => isFuel || !FUEL_MEASURES.includes(measure)
            )
      const measures = {
        loadingMeasures: kept('loadingMeasures'),
        deliveryMeasures: kept('deliveryMeasures')
      }
      const merged = checkProduct(db, { ...existing, ...patch, ...measures }, existing.no)
      return {
        ...patch,
        ...measures,
        referenceDensity: merged.referenceDensity,
        expansionCoefficient: merged.expansionCoefficient
      }
    },
    remove: () => undefined
  })
}
