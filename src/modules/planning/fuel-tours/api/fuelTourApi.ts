import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { FuelTourApi } from '../types/fuelTour.types'

export const fuelTourApi = {
  list: () => httpClient.get<SingleResponse<FuelTourApi[]>>('/planning/fuel-tours')
}
