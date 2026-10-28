import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { quantityToleranceService } from '../services/quantityToleranceService'
import type {
  QuantityToleranceApi,
  QuantityToleranceSearchColumn
} from '../types/quantityTolerance.types'

export const useQuantityToleranceStore = defineStore('planning-quantity-tolerance', () => {
  const crud = useCrudState<QuantityToleranceApi, QuantityToleranceSearchColumn>({
    persistKey: 'planning-quantity-tolerance',
    service: quantityToleranceService,
    defaultSearchColumn: 'no,customerName,productName',
    entityLabelKey: 'planning.quantityTolerances.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
