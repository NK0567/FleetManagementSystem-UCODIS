export const LEAVE_REQUEST_STATUSES = ['pending', 'approved', 'sent_back', 'rejected'] as const

export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number]

export type LeaveRequestDecision = 'approve' | 'send-back' | 'reject'

/** A send-back or a rejection always explains itself to the employee. */
export const MIN_DECISION_COMMENT_LENGTH = 10

const DECISION_STATUS: Record<LeaveRequestDecision, LeaveRequestStatus> = {
  approve: 'approved',
  'send-back': 'sent_back',
  reject: 'rejected'
}

export function decisionStatus(decision: LeaveRequestDecision): LeaveRequestStatus {
  return DECISION_STATUS[decision]
}

/** Only a pending request can be decided; a sent-back request comes back as a new submission. */
export function canDecide(status: LeaveRequestStatus): boolean {
  return status === 'pending'
}

export function decisionNeedsComment(decision: LeaveRequestDecision): boolean {
  return decision !== 'approve'
}

export function isDecisionCommentValid(decision: LeaveRequestDecision, comment: string): boolean {
  return !decisionNeedsComment(decision) || comment.trim().length >= MIN_DECISION_COMMENT_LENGTH
}

/** Statuses that consume days: approved ones are taken, pending ones are reserved. */
export function countsAgainstBalance(status: LeaveRequestStatus): boolean {
  return status === 'approved' || status === 'pending'
}
