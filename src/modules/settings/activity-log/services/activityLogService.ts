import { createCrudService } from '@/core/factories'
import { activityLogApi } from '../api/activityLogApi'
import type { ActivityLogEntryApi, ActivityLogSearchColumn } from '../types/activityLog.types'

export const activityLogService = createCrudService<ActivityLogEntryApi, ActivityLogSearchColumn>(
  activityLogApi
)
