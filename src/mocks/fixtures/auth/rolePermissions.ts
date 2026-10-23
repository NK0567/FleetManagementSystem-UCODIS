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
const HR_READ_FEATURES = ['EMPLOYEE', 'ORGUNIT', 'LEAVEBALANCE', ...HR_SETTINGS]

function grant(features: readonly string[], access: Grant): Record<string, Grant> {
  return Object.fromEntries(features.map((feature) => [feature, access]))
}

const FLEET_REFERENCE = [
  'VEHICLETYPE',
  'EQUIPMENTTYPE',
  'SITETYPE',
  'DOCUMENTTYPE',
  'INFRACTIONTYPE',
  'CHECKPOINT',
  'TELEMATICSEVENTTYPE',
  'DEVIATIONTYPE',
  'ROUTETEMPLATE',
  'SITE',
  'PROVIDER'
]
const FLEET_OPERATIONS = [
  'FLEETDASHBOARD',
  'LIVEMAP',
  'TRIP',
  'VEHICLE',
  'COUPLING',
  'DRIVERASSIGNMENT',
  'DRIVER',
  'FLEETSTATUS',
  'DOCUMENT',
  'COMPANYDOCUMENT',
  'INSURANCEPOLICY',
  'CLAIM',
  'INFRACTION',
  'TRAINING',
  'ALERT',
  'ROADCHECKLIST',
  'INSPECTION',
  'DEPARTUREAUTHORIZATION',
  'ROUTEDEVIATION',
  'FUELREFILL',
  'FUELCONSUMPTION',
  'FUELCARD',
  'TELEMATICS',
  'FLEETREPORT'
]
/** Vehicles are removed from the park through an action, never deleted. */
const FLEET_MANAGEMENT: Record<string, Grant> = {
  ...grant([...FLEET_REFERENCE, ...FLEET_OPERATIONS], FULL),
  VEHICLE: allRecords(['read', 'insert', 'update', 'execute', 'export']),
  FLEETSETTINGS: allRecords(['read', 'update'])
}

/**
 * Back-office staff read HR reference data and the park, plan their week, and see and submit their
 * own leave.
 * The HR dashboard names absent colleagues: it stays with the people who manage them.
 */
const backOffice: Record<string, Grant> = {
  ...grant(HR_READ_FEATURES, READ),
  ...grant(['VEHICLE', 'SITE', 'TRIP', 'ROUTETEMPLATE'], READ),
  MYPLANNING: READ,
  LEAVEBALANCE: ownRecords(['read']),
  LEAVEREQUEST: ownRecords(['read', 'insert'])
}

/**
 * What each profile may do. Employees are archived, never deleted. Only the administrator and the
 * fleet manager decide on leave requests and run the fleet; management reads and exports everything.
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
    ...FLEET_MANAGEMENT,
    MODULETOGGLE: allRecords(['read', 'update'])
  },
  FLEET_MANAGER: {
    ...grant(HR_SETTINGS, EDIT),
    HRDASHBOARD: READ_EXPORT,
    MYPLANNING: READ,
    EMPLOYEE: allRecords([...EDIT.actions, 'execute']),
    ORGUNIT: READ_EXPORT,
    LEAVEREQUEST: allRecords(['read', 'insert', 'execute', 'export']),
    LEAVEBALANCE: READ_EXPORT,
    ...FLEET_MANAGEMENT
  },
  MANAGEMENT: {
    ...grant([...HR_READ_FEATURES, 'HRDASHBOARD', 'LEAVEREQUEST'], READ_EXPORT),
    ...grant([...FLEET_REFERENCE, ...FLEET_OPERATIONS], READ_EXPORT),
    FLEETSETTINGS: READ,
    MYPLANNING: READ
  },
  MAINTENANCE_TECHNICIAN: {
    ...backOffice,
    ...grant(['VEHICLETYPE', 'EQUIPMENTTYPE', 'COUPLING', 'DOCUMENT', 'FLEETSTATUS'], READ),
    ...grant(['ROADCHECKLIST', 'INSPECTION'], allRecords(['read', 'insert', 'update'])),
    CHECKPOINT: READ
  },
  CUSTOMER_SERVICE: backOffice,
  SALES: backOffice,
  DEPOT: backOffice,
  DRIVER: {},
  DRIVER_ASSISTANT: {}
}
