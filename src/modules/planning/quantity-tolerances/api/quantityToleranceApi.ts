import { createCrudApi } from '@/core/factories'
import type { QuantityToleranceApi } from '../types/quantityTolerance.types'

export const quantityToleranceApi = createCrudApi<QuantityToleranceApi>({
  basePath: '/planning/quantity-tolerances'
})
