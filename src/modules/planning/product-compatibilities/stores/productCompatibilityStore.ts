import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { productCompatibilityService } from '../services/productCompatibilityService'
import type {
  ProductCompatibilityApi,
  ProductCompatibilitySearchColumn
} from '../types/productCompatibility.types'

export const useProductCompatibilityStore = defineStore('planning-product-compatibility', () => {
  const crud = useCrudState<ProductCompatibilityApi, ProductCompatibilitySearchColumn>({
    persistKey: 'planning-product-compatibility',
    service: productCompatibilityService,
    defaultSearchColumn: 'no,productAName,productBName',
    entityLabelKey: 'planning.productCompatibilities.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
