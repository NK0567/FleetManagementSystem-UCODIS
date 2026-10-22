import { createCrudService } from '@/core/factories'
import { leaveBalanceApi } from '../api/leaveBalanceApi'
import type { LeaveBalanceApi, LeaveBalanceSearchColumn } from '../types/leaveBalance.types'

const crudService = createCrudService<LeaveBalanceApi, LeaveBalanceSearchColumn>(leaveBalanceApi)

export const leaveBalanceService = {
  ...crudService,
  /** The balance of a leave type tracked in balances, or null for the others. */
  async find(
    employeeNo: string,
    leaveTypeNo: string,
    year: number
  ): Promise<LeaveBalanceApi | null> {
    const response = await crudService.getAll({
      pageSize: 1,
      filters: [
        { field: 'employeeNo', valueType: 'string', value: employeeNo },
        { field: 'leaveTypeNo', valueType: 'string', value: leaveTypeNo },
        { field: 'year', valueType: 'number', value: year }
      ]
    })
    return response.data.items[0] ?? null
  }
}
