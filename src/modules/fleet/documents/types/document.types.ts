import type { FileMeta } from '@/types/file.types'
import type {
  ComplianceGapReason,
  DeclaredStatus,
  DocumentState,
  DocumentValidityKind
} from '../domain/document'

export const SUBJECT_KINDS = ['vehicle', 'person'] as const
export type SubjectKind = (typeof SUBJECT_KINDS)[number]

export interface DocumentApi {
  no: string
  target: SubjectKind
  /** Number of the vehicle or of the employee holding the document. */
  subjectNo: string
  subjectName: string
  documentTypeNo: string
  documentTypeName: string
  mandatory: boolean
  validity: DocumentValidityKind
  number: string
  detail: string
  issueDate: string | null
  expiryDate: string | null
  noticeDays: number | null
  /** The notice that applies: the document's, else its type's, else the fleet default. */
  effectiveNoticeDays: number
  notifyOn: string | null
  fileNo: string | null
  file: FileMeta | null
  declaredStatus: DeclaredStatus | null
  declaredReason: string
  declaredAt: string | null
  declaredBy: string | null
  state: DocumentState
  /** E-mails and SMS sent for this document by the document alert rule (simulated). */
  notifications: { channel: 'email' | 'sms'; to: string; sentAt: string }[]
  version: number
  /** Set once a newer version replaces the document. */
  replacedByNo: string | null
  current: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type DocumentSearchColumn = 'no' | 'subjectName' | 'number' | 'no,subjectName,number'

/** A mandatory document a vehicle or a person lacks, or holds past its validity. */
export interface MissingDocumentApi {
  no: string
  target: SubjectKind
  subjectNo: string
  subjectName: string
  documentTypeNo: string
  documentTypeName: string
  reason: ComplianceGapReason
  documentNo: string | null
}

export type MissingDocumentSearchColumn =
  | 'subjectName'
  | 'documentTypeName'
  | 'subjectName,documentTypeName'
