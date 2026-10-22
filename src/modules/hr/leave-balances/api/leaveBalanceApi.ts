import { createCrudApi } from '@/core/factories'
import type { LeaveBalanceApi } from '../types/leaveBalance.types'

/** Read-only: balances are computed by the server from entitlements, adjustments and requests. */
export const leaveBalanceApi = createCrudApi<LeaveBalanceApi>({ basePath: '/hr/leave-balances' })
