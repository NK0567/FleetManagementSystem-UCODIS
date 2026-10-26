import { addDays, addMonths } from '@/utils/date'

export const DOCUMENT_STATES = ['valid', 'expiring', 'expired', 'cancelled', 'lost'] as const
export type DocumentState = (typeof DOCUMENT_STATES)[number]

export const DECLARED_STATUSES = ['cancelled', 'lost'] as const
export type DeclaredStatus = (typeof DECLARED_STATUSES)[number]

export type DocumentValidityKind = 'limited' | 'unlimited'

/** One rule everywhere: the notice of the document, else of its type, else of the fleet. */
export function noticeDaysOf(
  documentNotice: number | null,
  typeNotice: number | null,
  defaultNotice: number
): number {
  return documentNotice ?? typeNotice ?? defaultNotice
}

export function notifyOn(expiryDate: string | null, noticeDays: number): string | null {
  return expiryDate ? addDays(expiryDate, -noticeDays) : null
}

export function documentState(
  document: { expiryDate: string | null; declaredStatus: DeclaredStatus | null },
  validity: DocumentValidityKind,
  noticeDays: number,
  today: string
): DocumentState {
  if (document.declaredStatus) return document.declaredStatus
  if (validity === 'unlimited' || !document.expiryDate) return 'valid'
  if (document.expiryDate < today) return 'expired'
  return today >= addDays(document.expiryDate, -noticeDays) ? 'expiring' : 'valid'
}

/** A document still usable: valid, or close to its end but not past it. */
export function isUsableState(state: DocumentState): boolean {
  return state === 'valid' || state === 'expiring'
}

export type DocumentIssue = 'expiryRequired' | 'expiryBeforeIssue' | 'issueInFuture'

export function documentIssues(
  document: { issueDate: string | null; expiryDate: string | null },
  validity: DocumentValidityKind,
  today: string
): DocumentIssue[] {
  const issues: DocumentIssue[] = []
  if (validity === 'limited' && !document.expiryDate) issues.push('expiryRequired')
  if (document.issueDate && document.issueDate > today) issues.push('issueInFuture')
  if (document.issueDate && document.expiryDate && document.expiryDate < document.issueDate) {
    issues.push('expiryBeforeIssue')
  }
  return issues
}

export function suggestedExpiry(issueDate: string | null, durationMonths: number | null) {
  return issueDate && durationMonths ? addMonths(issueDate, durationMonths) : null
}

export type ComplianceGapReason = 'missing' | 'expired' | 'cancelled' | 'lost'

export interface ComplianceGap {
  documentTypeNo: string
  reason: ComplianceGapReason
}

/** Mandatory documents a subject lacks, or holds past their validity. */
export function complianceGaps(
  mandatoryTypeNos: readonly string[],
  currentDocuments: readonly { documentTypeNo: string; state: DocumentState }[]
): ComplianceGap[] {
  return mandatoryTypeNos.flatMap((typeNo) => {
    const document = currentDocuments.find((current) => current.documentTypeNo === typeNo)
    if (!document) return [{ documentTypeNo: typeNo, reason: 'missing' as const }]
    if (isUsableState(document.state)) return []
    return [{ documentTypeNo: typeNo, reason: document.state as ComplianceGapReason }]
  })
}
