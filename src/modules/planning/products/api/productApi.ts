import { createCrudApi } from '@/core/factories'
import type { ProductApi } from '../types/product.types'

export const productApi = createCrudApi<ProductApi>({
  basePath: '/planning/products'
})
