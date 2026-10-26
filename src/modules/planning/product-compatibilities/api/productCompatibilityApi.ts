import { createCrudApi } from '@/core/factories'
import type { ProductCompatibilityApi } from '../types/productCompatibility.types'

export const productCompatibilityApi = createCrudApi<ProductCompatibilityApi>({
  basePath: '/planning/product-compatibilities'
})
