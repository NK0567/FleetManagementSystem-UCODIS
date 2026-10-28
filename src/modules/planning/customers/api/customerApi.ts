import { createCrudApi } from '@/core/factories'
import type { CustomerApi } from '../types/customer.types'

export const customerApi = createCrudApi<CustomerApi>({
  basePath: '/planning/customers'
})
