import { createCrudService } from '@/core/factories'
import { deviationTypeApi } from '../api/deviationTypeApi'
import type { DeviationTypeApi, DeviationTypeSearchColumn } from '../types/deviationType.types'

export const deviationTypeService = createCrudService<DeviationTypeApi, DeviationTypeSearchColumn>(
  deviationTypeApi
)
