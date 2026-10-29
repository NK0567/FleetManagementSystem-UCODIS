import { createCrudApi } from '@/core/factories'
import type { ActivityLogEntryApi } from '../types/activityLog.types'

export const activityLogApi = createCrudApi<ActivityLogEntryApi>({
  basePath: '/settings/activity-log'
})
