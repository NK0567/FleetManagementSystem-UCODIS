import type { DocumentValidity } from '@/modules/fleet/document-types'
import type { DocumentState } from '@/modules/fleet/documents'
import type { FileMeta } from '@/types/file.types'

export const COMPANY_DOCUMENT_STATUSES = ['pending', 'approved', 'rejected'] as const
export type CompanyDocumentStatus = (typeof COMPANY_DOCUMENT_STATUSES)[number]

export interface CompanyDocumentApi {
  no: string
  name: string
  documentTypeNo: string
  orgUnitNo: string | null
  keywords: string[]
  issueDate: string
  expiryDate: string | null
  fileNo: string | null
  status: CompanyDocumentStatus
  decidedBy: string | null
  decidedAt: string | null
  decisionReason: string
  /** Approved document this upload replaces once it is approved in turn. */
  supersedesNo: string | null
  replacedByNo: string | null
  version: number
  documentTypeName: string
  orgUnitName: string
  keywordText: string
  validity: DocumentValidity
  /** Validity of an approved document; none while it awaits or after a rejection. */
  state: DocumentState | null
  /** Approved and not replaced: the version that is authoritative. */
  current: boolean
  effectiveNoticeDays: number
  notifyOn: string | null
  file: FileMeta | null
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type CompanyDocumentSearchColumn =
  | 'no'
  | 'name'
  | 'documentTypeName'
  | 'keywordText'
  | 'no,name,documentTypeName,keywordText'
