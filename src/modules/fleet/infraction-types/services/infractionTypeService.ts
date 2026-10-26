import { createCrudService } from '@/core/factories'
import { infractionTypeApi } from '../api/infractionTypeApi'
import type { InfractionTypeApi, InfractionTypeSearchColumn } from '../types/infractionType.types'

export const infractionTypeService = createCrudService<
  InfractionTypeApi,
  InfractionTypeSearchColumn
>(infractionTypeApi)
