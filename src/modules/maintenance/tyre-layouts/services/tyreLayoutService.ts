import { createCrudService } from '@/core/factories'
import { tyreLayoutApi } from '../api/tyreLayoutApi'
import type { TyreLayoutApi, TyreLayoutSearchColumn } from '../types/tyreLayout.types'

export const tyreLayoutService = createCrudService<TyreLayoutApi, TyreLayoutSearchColumn>(
  tyreLayoutApi
)
