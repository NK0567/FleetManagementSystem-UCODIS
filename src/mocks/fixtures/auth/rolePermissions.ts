import type { PermissionAction, UserProfileCode } from '@/types/auth.types'

type Actions = readonly PermissionAction[]

/** Actions on a feature; `myOnly` limits the user to the records that concern them. */
export interface Grant {
  actions: Actions
  myOnly?: boolean
}

const allRecords = (actions: Actions): Grant => ({ actions })
const ownRecords = (actions: Actions): Grant => ({ actions, myOnly: true })

const READ = allRecords(['read'])
const READ_EXPORT = allRecords(['read', 'export'])
const EDIT = allRecords(['read', 'insert', 'update', 'export'])
const FULL = allRecords(['read', 'insert', 'update', 'delete', 'execute', 'export'])

const HR_SETTINGS = [
  'JOBPOSITION',
  'EMPLOYEECATEGORY',
  'LEAVETYPE',
  'PUBLICHOLIDAY',
  'WORKINGCALENDAR'
]
const HR_READ_FEATURES = ['HRDASHBOARD', 'EMPLOYEE', 'ORGUNIT', 'LEAVEBALANCE', ...HR_SETTINGS]

function grant(features: readonly string[], access: Grant): Record<string, Grant> {
  return Object.fromEntries(features.map((feature) => [feature, access]))
}

/** Back-office staff read HR data, plan their week, and see and submit their own leave. */
const backOffice: Record<string, Grant> = {
  ...grant(HR_READ_FEATURES, READ),
  MYPLANNING: READ,
  LEAVEBALANCE: ownRecords(['read']),
  LEAVEREQUEST: ownRecords(['read', 'insert'])
}

/**
 * What each profile may do. Employees are archived, never deleted. Only the administrator and the
 * fleet manager decide on leave requests; management reads and exports everything.
 */
export const ROLE_PERMISSIONS: Record<UserProfileCode, Record<string, Grant>> = {
  ADMIN: {
    ...grant(HR_SETTINGS, FULL),
    HRDASHBOARD: READ_EXPORT,
    MYPLANNING: READ,
    EMPLOYEE: allRecords([...EDIT.actions, 'execute']),
    ORGUNIT: FULL,
    LEAVEREQUEST: allRecords(['read', 'insert', 'execute', 'export']),
    LEAVEBALANCE: READ_EXPORT,
    MODULETOGGLE: allRecords(['read', 'update'])
  },
  FLEET_MANAGER: {
    ...grant(HR_SETTINGS, EDIT),
    HRDASHBOARD: READ_EXPORT,
    MYPLANNING: READ,
    EMPLOYEE: allRecords([...EDIT.actions, 'execute']),
    ORGUNIT: READ_EXPORT,
    LEAVEREQUEST: allRecords(['read', 'insert', 'execute', 'export']),
    LEAVEBALANCE: READ_EXPORT
  },
  MANAGEMENT: {
    ...grant([...HR_READ_FEATURES, 'LEAVEREQUEST'], READ_EXPORT),
    MYPLANNING: READ
  },
  MAINTENANCE_TECHNICIAN: backOffice,
  CUSTOMER_SERVICE: backOffice,
  SALES: backOffice,
  DEPOT: backOffice,
  DRIVER: {},
  DRIVER_ASSISTANT: {}
}
