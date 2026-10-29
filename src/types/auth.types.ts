export const USER_PROFILES = [
  'ADMIN',
  'FLEET_MANAGER',
  'MAINTENANCE_MANAGER',
  'MAINTENANCE_TECHNICIAN',
  'PLANNER',
  'DELIVERY_MANAGER',
  'BILLING',
  'CUSTOMER_SERVICE',
  'SALES',
  'DEPOT',
  'MANAGEMENT',
  'DRIVER',
  'DRIVER_ASSISTANT'
] as const

export type UserProfileCode = (typeof USER_PROFILES)[number]

export interface User {
  code: string
  name: string
  email?: string
  profile: UserProfileCode
  employeeNo?: string
  orgUnitNo?: string
  orgUnitName?: string
  language?: string
  /** Preferred landing page, used when the user may read it. */
  landingRoute?: string
  /** An orderer account works on the orders of this orderer only. */
  ordererNo?: string
}

export interface LoginRequest {
  userCode: string
  userPassword: string
}

export interface LoginResponseData {
  accessToken: string
  user: User
}

export interface DemoAccount {
  code: string
  name: string
  profile: UserProfileCode
  /** Demo accounts only, served by the mock backend: their password is public. */
  password: string
}

export interface UserPermissionRow {
  feature: string
  insert: boolean
  update: boolean
  read: boolean
  delete: boolean
  execute: boolean
  export: boolean
  /** Restricts lists to the records the user owns. */
  myOnly?: boolean
  /** Restricts lists to the records of the user's org unit. */
  myTeam?: boolean
  /** False when the feature only serves the user's own screens and stays out of the menus. */
  menu?: boolean
}

export type PermissionAction = 'insert' | 'update' | 'read' | 'delete' | 'execute' | 'export'

export type PermissionsMap = Record<string, Record<PermissionAction, boolean>>

/** Menu keys the user may open, derived from the permissions. */
export type UserMenu = Record<string, boolean>
