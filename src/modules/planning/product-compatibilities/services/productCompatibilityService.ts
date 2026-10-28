import { createCrudService } from '@/core/factories'
import { productCompatibilityApi } from '../api/productCompatibilityApi'
import type {
  ProductCompatibilityApi,
  ProductCompatibilitySearchColumn
} from '../types/productCompatibility.types'

export const productCompatibilityService = createCrudService<
  ProductCompatibilityApi,
  ProductCompatibilitySearchColumn
>(productCompatibilityApi)
