export const DOCUMENT_TARGETS = ['vehicle', 'person', 'company'] as const
export type DocumentTarget = (typeof DOCUMENT_TARGETS)[number]

export const PERSON_SCOPES = ['all', 'drivers', 'office'] as const
export type PersonScope = (typeof PERSON_SCOPES)[number]

export const DOCUMENT_VALIDITIES = ['limited', 'unlimited'] as const
export type DocumentValidity = (typeof DOCUMENT_VALIDITIES)[number]

export interface DocumentTypeApi {
  no: string
  name: string
  target: DocumentTarget
  personScope: PersonScope
  /** Vehicle types concerned; empty for all of them. */
  vehicleTypeNos: string[]
  mandatory: boolean
  active: boolean
  validity: DocumentValidity
  durationMonths: number | null
  noticeDays: number | null
  documentCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type DocumentTypeSearchColumn = 'no' | 'name' | 'no,name'
