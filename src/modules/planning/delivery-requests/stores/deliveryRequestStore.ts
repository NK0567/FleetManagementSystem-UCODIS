import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { deliveryRequestService } from '../services/deliveryRequestService'
import type {
  DeliveryRequestApi,
  DeliveryRequestSearchColumn
} from '../types/deliveryRequest.types'

export const useDeliveryRequestStore = defineStore('planning-delivery-request', () => {
  const crud = useCrudState<DeliveryRequestApi, DeliveryRequestSearchColumn>({
    persistKey: 'planning-delivery-request',
    service: deliveryRequestService,
    defaultSearchColumn: 'no,ordererName,deliveryPointName,externalReference',
    entityLabelKey: 'planning.deliveryRequests.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
