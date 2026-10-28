import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { productService } from '../services/productService'
import type { ProductApi, ProductSearchColumn } from '../types/product.types'

export const useProductStore = defineStore('planning-product', () => {
  const crud = useCrudState<ProductApi, ProductSearchColumn>({
    persistKey: 'planning-product',
    service: productService,
    defaultSearchColumn: 'no,name,family',
    entityLabelKey: 'planning.products.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
