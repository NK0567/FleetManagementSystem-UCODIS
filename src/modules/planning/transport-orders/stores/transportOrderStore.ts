import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { transportOrderService } from '../services/transportOrderService'
import type { TransportOrderApi, TransportOrderSearchColumn } from '../types/transportOrder.types'

export const useTransportOrderStore = defineStore('planning-transport-order', () => {
  const crud = useCrudState<TransportOrderApi, TransportOrderSearchColumn>({
    persistKey: 'planning-transport-order',
    service: transportOrderService,
    defaultSearchColumn: 'no,routeName,recipientSummary,carrierName,tripNo',
    entityLabelKey: 'planning.transportOrders.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
