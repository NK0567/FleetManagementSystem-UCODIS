import { createCrudService } from '@/core/factories'
import { quantityToleranceApi } from '../api/quantityToleranceApi'
import type {
  QuantityToleranceApi,
  QuantityToleranceSearchColumn
} from '../types/quantityTolerance.types'

export const quantityToleranceService = createCrudService<
  QuantityToleranceApi,
  QuantityToleranceSearchColumn
>(quantityToleranceApi)
