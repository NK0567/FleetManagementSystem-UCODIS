import { createCrudService } from '@/core/factories'
import { deliveryPointApi } from '../api/deliveryPointApi'
import type { DeliveryPointApi, DeliveryPointSearchColumn } from '../types/deliveryPoint.types'

export const deliveryPointService = createCrudService<DeliveryPointApi, DeliveryPointSearchColumn>(
  deliveryPointApi
)
