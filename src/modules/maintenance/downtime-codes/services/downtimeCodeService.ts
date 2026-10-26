import { createCrudService } from '@/core/factories'
import { downtimeCodeApi } from '../api/downtimeCodeApi'
import type { DowntimeCodeApi, DowntimeCodeSearchColumn } from '../types/downtimeCode.types'

export const downtimeCodeService = createCrudService<DowntimeCodeApi, DowntimeCodeSearchColumn>(
  downtimeCodeApi
)
