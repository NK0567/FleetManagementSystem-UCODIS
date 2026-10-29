import { createCrudService } from '@/core/factories'
import { fuelReferenceApi } from '../api/fuelReferenceApi'
import type { FuelReferenceApi, FuelReferenceSearchColumn } from '../types/fuelReference.types'

export const fuelReferenceService = createCrudService<FuelReferenceApi, FuelReferenceSearchColumn>(
  fuelReferenceApi
)
