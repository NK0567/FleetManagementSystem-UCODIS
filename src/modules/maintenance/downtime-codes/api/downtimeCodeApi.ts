import { createCrudApi } from '@/core/factories'
import type { DowntimeCodeApi } from '../types/downtimeCode.types'

export const downtimeCodeApi = createCrudApi<DowntimeCodeApi>({
  basePath: '/maintenance/downtime-codes'
})
