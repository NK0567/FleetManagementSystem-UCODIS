import { createCrudService } from '@/core/factories'
import { leaveTypeApi } from '../api/leaveTypeApi'
import type { LeaveTypeApi, LeaveTypeSearchColumn } from '../types/leaveType.types'

export const leaveTypeService = createCrudService<LeaveTypeApi, LeaveTypeSearchColumn>(leaveTypeApi)
