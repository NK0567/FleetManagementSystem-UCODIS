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
  'PROVIDERTYPE',
  'DOCUMENTTYPE',
  'INFRACTIONTYPE',
  'CHECKPOINT',
  /* The periodic inspection grid (FLT01-US10) and the reference consumptions (FLT02-US04). */
  'INSPECTIONITEM',
  'FUELREFERENCE',
  'ALERTRULE',
  'FUELGAPCAUSE',
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
const MAINTENANCE_REFERENCE = [
  'TECHNICIAN',
  'COMPETENCE',
  'FAILURECODE',
  'DOWNTIMECODE',
  'MISSIONTYPE',
  'MAINTENANCEPLAN',
  'VEHICLECHECKPOINT',
  'TYRELAYOUT'
]
const MAINTENANCE_OPERATIONS = [
  'MAINTENANCEDASHBOARD',
  'WORKORDER',
  'SERVICEDUE',
  'DOWNTIME',
  'WORKSHOPLOAD',
  'VEHICLECHECK',
  'MOBILEINTERVENTION',
  'TYRE',
  'PURCHASEREQUEST',
  'STOCKITEM',
  'RELIABILITY'
]
const PLANNING_REFERENCE = [
  'PLANNINGREASON',
  'CUSTOMER',
  'DELIVERYPOINT',
  'PRODUCT',
  'PRODUCTCOMPATIBILITY',
  'QUANTITYTOLERANCE',
  'TRANSPORTTARIFF'
]
const PLANNING_OPERATIONS = [
  'DELIVERYREQUEST',
  'TRANSPORTORDER',
  'LOADING',
  'LOADINGPLAN',
  'GOODSRETURN',
  'DELIVERYQUALITY',
  'CUSTOMERBILLING',
  'CARRIERINVOICE',
  'PLANNINGCALENDAR',
  'PLANNINGDASHBOARD',
  'TRANSPORTREPORT'
]
/** Planning rights replace the old role lists of the planning settings. */
const PLANNING_MANAGEMENT: Record<string, Grant> = {
  ...grant([...PLANNING_REFERENCE, ...PLANNING_OPERATIONS], FULL),
  PLANNINGSETTINGS: allRecords(['read', 'update'])
}
/** Execute covers what commits the workshop: validating or refusing a closing, cancelling, adjusting stock. */
const MAINTENANCE_MANAGEMENT: Record<string, Grant> = {
  ...grant([...MAINTENANCE_REFERENCE, ...MAINTENANCE_OPERATIONS], FULL),
  MAINTENANCESETTINGS: allRecords(['read', 'update'])
}

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
    ...MAINTENANCE_MANAGEMENT,
    ...PLANNING_MANAGEMENT,
    MODULETOGGLE: allRecords(['read', 'update']),
    /* The company identity, the sign-in accounts and the activity log stay with the administrator;
     * accounts are switched off, never deleted. */
    COMPANYSETTINGS: allRecords(['read', 'update']),
    USERACCOUNT: allRecords(['read', 'insert', 'update', 'execute', 'export']),
    ACTIVITYLOG: READ_EXPORT
  },
  FLEET_MANAGER: {
    ...grant(HR_SETTINGS, EDIT),
    HRDASHBOARD: READ_EXPORT,
    MYPLANNING: READ,
    EMPLOYEE: allRecords([...EDIT.actions, 'execute']),
    ORGUNIT: READ_EXPORT,
    LEAVEREQUEST: allRecords(['read', 'insert', 'execute', 'export']),
    LEAVEBALANCE: READ_EXPORT,
    ...FLEET_MANAGEMENT,
    ...MAINTENANCE_MANAGEMENT
  },
  MANAGEMENT: {
    ...grant([...HR_READ_FEATURES, 'HRDASHBOARD', 'LEAVEREQUEST'], READ_EXPORT),
    ...grant([...FLEET_REFERENCE, ...FLEET_OPERATIONS], READ_EXPORT),
    ...grant([...MAINTENANCE_REFERENCE, ...MAINTENANCE_OPERATIONS], READ_EXPORT),
    FLEETSETTINGS: READ,
    ...grant([...PLANNING_REFERENCE, ...PLANNING_OPERATIONS], READ_EXPORT),
    MAINTENANCESETTINGS: READ,
    PLANNINGSETTINGS: READ,
    MYPLANNING: READ
  },
  /* The maintenance manager plans the workshop, validates the closings and follows reliability
   * (FLT01-US01, US02, US06, US07, US08, US11, US12, US13, US17, FLT04-US04, FLT07-US03). */
  MAINTENANCE_MANAGER: {
    ...backOffice,
    ...MAINTENANCE_MANAGEMENT,
    ...grant(['VEHICLETYPE', 'EQUIPMENTTYPE', 'COUPLING', 'DOCUMENT', 'FLEETSTATUS'], READ),
    ...grant(['ROADCHECKLIST', 'INSPECTION', 'CHECKPOINT', 'PROVIDER', 'TELEMATICS'], READ),
    ALERT: allRecords(['read', 'update'])
  },
  MAINTENANCE_TECHNICIAN: {
    ...backOffice,
    ...grant(['VEHICLETYPE', 'EQUIPMENTTYPE', 'COUPLING', 'DOCUMENT', 'FLEETSTATUS'], READ),
    ...grant(['ROADCHECKLIST', 'INSPECTION'], allRecords(['read', 'insert', 'update'])),
    CHECKPOINT: READ,
    ALERT: allRecords(['read', 'update']),
    ...grant([...MAINTENANCE_REFERENCE, 'MAINTENANCESETTINGS', 'WORKSHOPLOAD', 'STOCKITEM'], READ),
    ...grant(['MAINTENANCEDASHBOARD', 'RELIABILITY'], READ),
    ...grant(
      ['WORKORDER', 'SERVICEDUE', 'VEHICLECHECK', 'MOBILEINTERVENTION', 'TYRE'],
      allRecords(['read', 'insert', 'update'])
    ),
    ...grant(['DOWNTIME', 'PURCHASEREQUEST'], allRecords(['read', 'insert']))
  },
  /* The transport roles follow the actors of the user stories: the planner composes and plans
   * the transport orders, the delivery manager runs loading, quality and the reference data, the
   * billing manager invoices, the agent confirms the recipients, the orderer places orders. */
  PLANNER: {
    ...backOffice,
    ...grant(PLANNING_REFERENCE, READ),
    ...grant(['PROVIDER', 'DRIVER'], READ),
    DELIVERYREQUEST: allRecords(['read', 'insert', 'update', 'execute', 'export']),
    TRANSPORTORDER: FULL,
    PLANNINGCALENDAR: READ,
    /* He follows the position of the vehicles (TRS02-US01). */
    LIVEMAP: READ,
    /* The « Confirmations destinataires » tab is the agent's alone (TRS01-US15): the planner
     * reads the answers on the order card. */
    LOADING: READ,
    LOADINGPLAN: READ,
    GOODSRETURN: READ,
    PLANNINGDASHBOARD: READ
  },
  DELIVERY_MANAGER: {
    ...backOffice,
    /* He keeps the recipients, orderers and products (TRS06-US03, US04); the delivery sites,
     * the compatibilities, the tolerances and the reason lists are the administrator's
     * settings (TRS07-US02, US04, US06): he reads them. */
    ...grant(['CUSTOMER', 'PRODUCT'], FULL),
    ...grant(
      ['PLANNINGREASON', 'DELIVERYPOINT', 'PRODUCTCOMPATIBILITY', 'QUANTITYTOLERANCE'],
      READ
    ),
    TRANSPORTTARIFF: READ,
    ...grant(['DRIVER'], READ),
    PROVIDER: EDIT,
    DELIVERYREQUEST: READ_EXPORT,
    TRANSPORTORDER: allRecords(['read', 'execute', 'export']),
    PLANNINGCALENDAR: READ,
    LOADING: FULL,
    /* He prepares the loading of several vehicles from a depot (TRS01-US20 to US23). */
    LOADINGPLAN: FULL,
    GOODSRETURN: READ,
    DELIVERYQUALITY: FULL,
    /* He follows the dashboard and the indicators (TRS08-US01 to US04); the director exports
     * them (TRS08-US05). */
    PLANNINGDASHBOARD: READ,
    TRANSPORTREPORT: READ
  },
  BILLING: {
    ...backOffice,
    ...grant(PLANNING_REFERENCE, READ),
    PROVIDER: READ,
    TRANSPORTORDER: READ_EXPORT,
    CUSTOMERBILLING: FULL,
    CARRIERINVOICE: FULL,
    TRANSPORTREPORT: READ
  },
  CUSTOMER_SERVICE: {
    ...backOffice,
    ...grant([...PLANNING_REFERENCE, 'DELIVERYREQUEST', 'TRANSPORTORDER'], READ),
    CUSTOMERCONFIRMATION: allRecords(['read', 'execute'])
  },
  SALES: {
    ...backOffice,
    ...grant(PLANNING_REFERENCE, READ),
    DELIVERYREQUEST: allRecords(['read', 'insert', 'update', 'export'])
  },
  DEPOT: {
    ...backOffice,
    ...grant(PLANNING_REFERENCE, READ),
    LOADING: allRecords(['read', 'update', 'execute']),
    /* Returns are checked and received by the warehouse (TRS04-US01). */
    GOODSRETURN: allRecords(['read', 'execute'])
  },
  DRIVER: {
    MYSPACE: allRecords(['read', 'execute']),
    LEAVEBALANCE: ownRecords(['read']),
    LEAVEREQUEST: ownRecords(['read', 'insert'])
  },
  DRIVER_ASSISTANT: {
    MYSPACE: allRecords(['read']),
    LEAVEBALANCE: ownRecords(['read']),
    LEAVEREQUEST: ownRecords(['read', 'insert'])
  }
}

/**
 * What each profile finds in its menus, from the actors of the user stories: a user sees his own
 * work, nothing else. The other features a profile may read only serve its own screens (a product
 * name, a vehicle in a list of choices) and stay out of the menus. The administrator configures
 * everything and sees every menu.
 */
const PERSONAL = ['MYPLANNING', 'LEAVEREQUEST', 'LEAVEBALANCE']
export const ROLE_MENUS: Record<UserProfileCode, readonly string[] | 'all'> = {
  ADMIN: 'all',
  FLEET_MANAGER: [
    ...PERSONAL,
    /* He decides the leave of his drivers and keeps the people of the FMS (FLT05-US08). */
    'EMPLOYEE',
    ...FLEET_OPERATIONS,
    ...FLEET_REFERENCE,
    'FLEETSETTINGS'
  ],
  MAINTENANCE_MANAGER: [
    ...PERSONAL,
    ...MAINTENANCE_OPERATIONS,
    ...MAINTENANCE_REFERENCE,
    'MAINTENANCESETTINGS'
  ],
  /* The technician diagnoses, links the parts, mounts and reads the tyres, records the vehicle
   * checks and the tyres bought (FLT01-US04, US05, US09, US14, US15, US16). */
  MAINTENANCE_TECHNICIAN: [...PERSONAL, 'WORKORDER', 'VEHICLECHECK', 'TYRE', 'STOCKITEM'],
  PLANNER: [...PERSONAL, 'DELIVERYREQUEST', 'TRANSPORTORDER', 'PLANNINGCALENDAR', 'LIVEMAP'],
  DELIVERY_MANAGER: [
    ...PERSONAL,
    'PLANNINGDASHBOARD',
    'TRANSPORTREPORT',
    'TRANSPORTORDER',
    'LOADINGPLAN',
    'LOADING',
    'DELIVERYQUALITY',
    'CUSTOMER',
    'PRODUCT',
    'PROVIDER'
  ],
  BILLING: [...PERSONAL, 'CUSTOMERBILLING', 'CARRIERINVOICE'],
  CUSTOMER_SERVICE: [...PERSONAL, 'CUSTOMERCONFIRMATION'],
  SALES: [...PERSONAL, 'DELIVERYREQUEST'],
  DEPOT: [...PERSONAL, 'LOADING'],
  /* The director reads the summaries and exports the reports (FLT07-US06, TRS08-US05). */
  MANAGEMENT: [
    ...PERSONAL,
    'HRDASHBOARD',
    'FLEETDASHBOARD',
    'FLEETREPORT',
    'MAINTENANCEDASHBOARD',
    'RELIABILITY',
    'PLANNINGDASHBOARD',
    'TRANSPORTREPORT'
  ],
  /* The driver works from his own space only, where his absences are. */
  DRIVER: ['MYSPACE'],
  DRIVER_ASSISTANT: ['MYSPACE']
}
