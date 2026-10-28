import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { leaveTypeService } from '../services/leaveTypeService'
import type { LeaveTypeApi, LeaveTypeSearchColumn } from '../types/leaveType.types'

export const useLeaveTypeStore = defineStore('hr-leave-type', () => {
  const crud = useCrudState<LeaveTypeApi, LeaveTypeSearchColumn>({
    persistKey: 'hr-leave-type',
    service: leaveTypeService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'hr.leaveTypes.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
