import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { useUserStore } from '@/stores/user'
import { leaveBalanceService } from '../services/leaveBalanceService'
import type { LeaveBalanceApi, LeaveBalanceSearchColumn } from '../types/leaveBalance.types'

export const useLeaveBalanceStore = defineStore('hr-leave-balance', () => {
  const crud = useCrudState<LeaveBalanceApi, LeaveBalanceSearchColumn>({
    persistKey: 'hr-leave-balance',
    service: leaveBalanceService,
    defaultSearchColumn: 'employeeNo,employeeName',
    entityLabelKey: 'hr.leaveBalances.title',
    defaultSortBy: 'employeeName',
    listAccessScope: {
      feature: 'LEAVEBALANCE',
      ownerField: 'employeeNo',
      ownerValue: () => useUserStore().user?.employeeNo ?? ''
    }
  })

  return { ...crud }
})
