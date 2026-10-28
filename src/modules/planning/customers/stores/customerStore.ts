import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { customerService } from '../services/customerService'
import type { CustomerApi, CustomerSearchColumn } from '../types/customer.types'

export const useCustomerStore = defineStore('planning-customer', () => {
  const crud = useCrudState<CustomerApi, CustomerSearchColumn>({
    persistKey: 'planning-customer',
    service: customerService,
    defaultSearchColumn: 'no,name,city,contactName',
    entityLabelKey: 'planning.customers.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
