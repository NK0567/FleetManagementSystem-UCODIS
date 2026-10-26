import { fuelTourApi } from '../api/fuelTourApi'
import type { FuelTourApi } from '../types/fuelTour.types'

export const fuelTourService = {
  async list(): Promise<FuelTourApi[]> {
    return (await fuelTourApi.list()).data.data
  }
}
