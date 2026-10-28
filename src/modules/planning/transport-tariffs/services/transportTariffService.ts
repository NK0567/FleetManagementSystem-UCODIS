import { createCrudService } from '@/core/factories'
import { transportTariffApi } from '../api/transportTariffApi'
import type {
  TransportTariffApi,
  TransportTariffSearchColumn
} from '../types/transportTariff.types'

export const transportTariffService = createCrudService<
  TransportTariffApi,
  TransportTariffSearchColumn
>(transportTariffApi)
