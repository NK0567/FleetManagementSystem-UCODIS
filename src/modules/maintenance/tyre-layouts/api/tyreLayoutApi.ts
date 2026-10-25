import { createCrudApi } from '@/core/factories'
import type { TyreLayoutApi } from '../types/tyreLayout.types'

export const tyreLayoutApi = createCrudApi<TyreLayoutApi>({
  basePath: '/maintenance/tyre-layouts'
})
