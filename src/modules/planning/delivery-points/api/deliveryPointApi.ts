import { createCrudApi } from '@/core/factories'
import type { DeliveryPointApi } from '../types/deliveryPoint.types'

export const deliveryPointApi = createCrudApi<DeliveryPointApi>({
  basePath: '/planning/delivery-points'
})
