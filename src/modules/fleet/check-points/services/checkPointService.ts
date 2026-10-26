import { createCrudService } from '@/core/factories'
import { checkPointApi } from '../api/checkPointApi'
import type { CheckPointApi, CheckPointSearchColumn } from '../types/checkPoint.types'

export const checkPointService = createCrudService<CheckPointApi, CheckPointSearchColumn>(
  checkPointApi
)
