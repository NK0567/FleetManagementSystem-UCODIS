import { createCrudApi } from '@/core/factories'
import type { TransportTariffApi } from '../types/transportTariff.types'

export const transportTariffApi = createCrudApi<TransportTariffApi>({
  basePath: '/planning/transport-tariffs'
})
