import { createCrudService } from '@/core/factories'
import { customerApi } from '../api/customerApi'
import type { CustomerApi, CustomerSearchColumn } from '../types/customer.types'

export const customerService = createCrudService<CustomerApi, CustomerSearchColumn>(customerApi)
