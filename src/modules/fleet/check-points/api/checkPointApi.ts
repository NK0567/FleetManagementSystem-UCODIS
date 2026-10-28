import { createCrudApi } from '@/core/factories'
import type { CheckPointApi } from '../types/checkPoint.types'

export const checkPointApi = createCrudApi<CheckPointApi>({
  basePath: '/fleet/check-points'
})
