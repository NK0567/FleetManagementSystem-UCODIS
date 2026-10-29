import type { UserProfileCode } from '@/types/auth.types'

export interface UserAccountApi {
  /** The user code typed to sign in. */
  no: string
  name: string
  email: string
  profile: UserProfileCode
  employeeNo: string | null
  orgUnitNo: string | null
  orgUnitName: string
  language: 'fr' | 'en'
  active: boolean
  lastLoginAt: string | null
  statusChangedAt: string | null
  statusChangedBy: string | null
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type UserAccountSearchColumn = 'no' | 'name' | 'email' | 'no,name,email'
