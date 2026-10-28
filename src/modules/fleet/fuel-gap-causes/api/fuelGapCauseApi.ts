import { createCrudApi } from '@/core/factories'
import type { FuelGapCauseApi } from '../types/fuelGapCause.types'

export const fuelGapCauseApi = createCrudApi<FuelGapCauseApi>({
  basePath: '/fleet/fuel-gap-causes'
})
