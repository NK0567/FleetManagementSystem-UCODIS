import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { deliveryPointService } from '../services/deliveryPointService'
import type { DeliveryPointApi, DeliveryPointSearchColumn } from '../types/deliveryPoint.types'

export const useDeliveryPointStore = defineStore('planning-delivery-point', () => {
  const crud = useCrudState<DeliveryPointApi, DeliveryPointSearchColumn>({
    persistKey: 'planning-delivery-point',
    service: deliveryPointService,
    defaultSearchColumn: 'no,name,customerName,city',
    entityLabelKey: 'planning.deliveryPoints.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
