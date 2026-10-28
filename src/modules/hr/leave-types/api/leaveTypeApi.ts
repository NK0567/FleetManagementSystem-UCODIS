import { createCrudApi } from '@/core/factories'
import type { LeaveTypeApi } from '../types/leaveType.types'

export const leaveTypeApi = createCrudApi<LeaveTypeApi>({ basePath: '/hr/leave-types' })
