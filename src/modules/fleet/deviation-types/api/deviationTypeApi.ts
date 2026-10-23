import { createCrudApi } from '@/core/factories'
import type { DeviationTypeApi } from '../types/deviationType.types'

export const deviationTypeApi = createCrudApi<DeviationTypeApi>({
  basePath: '/fleet/deviation-types'
})
