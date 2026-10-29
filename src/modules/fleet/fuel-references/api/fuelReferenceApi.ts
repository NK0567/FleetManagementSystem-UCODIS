import { createCrudApi } from '@/core/factories'
import type { FuelReferenceApi } from '../types/fuelReference.types'

export const fuelReferenceApi = createCrudApi<FuelReferenceApi>({
  basePath: '/fleet/fuel-references'
})
