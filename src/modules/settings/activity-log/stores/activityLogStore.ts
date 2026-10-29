import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { activityLogService } from '../services/activityLogService'
import type { ActivityLogEntryApi, ActivityLogSearchColumn } from '../types/activityLog.types'

export const useActivityLogStore = defineStore('settings-activity-log', () =>
  useCrudState<ActivityLogEntryApi, ActivityLogSearchColumn>({
    persistKey: 'settings-activity-log',
    service: activityLogService,
    defaultSearchColumn: 'byName,by,actionLabel,entityLabel,recordNo,detail',
    entityLabelKey: 'settings.activityLog.title',
    defaultSortBy: 'at',
    defaultSortDirection: 'DESC'
  })
)
