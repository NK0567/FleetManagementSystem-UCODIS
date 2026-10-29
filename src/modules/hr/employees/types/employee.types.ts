export const EMPLOYEE_STATUSES = [
  'active',
  'on_leave',
  'suspended',
  'contract_ended',
  'archived'
] as const
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number]

export const CONTRACT_TYPES = ['permanent', 'fixed_term'] as const
export type ContractType = (typeof CONTRACT_TYPES)[number]

export const GENDERS = ['female', 'male'] as const
export type Gender = (typeof GENDERS)[number]

export const MARITAL_STATUSES = ['single', 'married', 'divorced', 'widowed'] as const
export type MaritalStatus = (typeof MARITAL_STATUSES)[number]

export const ID_DOCUMENT_TYPES = ['national_id', 'passport', 'residence_permit'] as const
export type IdDocumentType = (typeof ID_DOCUMENT_TYPES)[number]

export interface EmployeeApi {
  no: string
  firstName: string
  lastName: string
  fullName: string
  jobPositionNo: string
  jobPositionName: string
  orgUnitNo: string
  orgUnitName: string
  categoryNo: string
  categoryName: string
  siteCode: string
  phone: string
  email: string
  nationalId: string
  idDocumentType: IdDocumentType | null
  birthDate: string | null
  birthPlace: string
  gender: Gender | null
  maritalStatus: MaritalStatus | null
  contractType: ContractType
  hireDate: string
  exitDate: string | null
  status: EmployeeStatus
  statusReason: string
  /** Inherited from the job position. */
  drives: boolean
  drivingAuthorized: boolean
  drivingAuthorizedBy: string | null
  drivingAuthorizedAt: string | null
  hasSystemAccount: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type EmployeeSearchColumn =
  | 'no'
  | 'fullName'
  | 'nationalId'
  | 'phone'
  | 'no,fullName'
  | 'no,fullName,nationalId,phone'

/** What a synchronization with the HR system did. */
export interface StaffSyncReport {
  created: string[]
  updated: string[]
  unchanged: number
  skipped: { externalId: string; reason: string }[]
}
