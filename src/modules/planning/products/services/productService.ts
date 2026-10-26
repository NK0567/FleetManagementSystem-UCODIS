import { createCrudService } from '@/core/factories'
import { productApi } from '../api/productApi'
import type { ProductApi, ProductSearchColumn } from '../types/product.types'

export const productService = createCrudService<ProductApi, ProductSearchColumn>(productApi)
