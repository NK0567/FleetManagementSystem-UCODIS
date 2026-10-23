import { createCrudService } from '@/core/factories'
import { fuelGapCauseApi } from '../api/fuelGapCauseApi'
import type { FuelGapCauseApi, FuelGapCauseSearchColumn } from '../types/fuelGapCause.types'

export const fuelGapCauseService = createCrudService<FuelGapCauseApi, FuelGapCauseSearchColumn>(
  fuelGapCauseApi
)
