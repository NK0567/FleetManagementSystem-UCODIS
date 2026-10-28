import type { CompanyDocumentStatus } from '../types/companyDocument.types'

/** A rejection always tells the depositor what to fix. */
export const MIN_REJECTION_REASON_LENGTH = 10

export type DecisionBlock = 'notPending' | 'ownDocument'

/** Four eyes: whoever uploaded a document does not approve or reject it. */
export function decisionBlock(
  document: { status: CompanyDocumentStatus; createdBy: string },
  userCode: string
): DecisionBlock | null {
  if (document.status !== 'pending') return 'notPending'
  if (document.createdBy === userCode) return 'ownDocument'
  return null
}

export function isRejectionReasonValid(reason: string): boolean {
  return reason.trim().length >= MIN_REJECTION_REASON_LENGTH
}
