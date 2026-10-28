import { addDays } from '@/utils/date'

export const POLICY_STATES = ['upcoming', 'active', 'expiring', 'expired', 'terminated'] as const
export type PolicyState = (typeof POLICY_STATES)[number]

export interface PolicyPeriod {
  startDate: string
  endDate: string
  terminatedOn: string | null
}

/** Last day covered: the end date, or the termination when it comes first. */
export function coverageEnd(policy: PolicyPeriod): string {
  return policy.terminatedOn && policy.terminatedOn < policy.endDate
    ? policy.terminatedOn
    : policy.endDate
}

export function coversDay(policy: PolicyPeriod, day: string): boolean {
  return policy.startDate <= day && coverageEnd(policy) >= day
}

export function periodsOverlap(a: PolicyPeriod, b: PolicyPeriod): boolean {
  return a.startDate <= coverageEnd(b) && b.startDate <= coverageEnd(a)
}

export function policyState(policy: PolicyPeriod, noticeDays: number, today: string): PolicyState {
  if (policy.terminatedOn && policy.terminatedOn < today) return 'terminated'
  if (policy.startDate > today) return 'upcoming'
  if (policy.endDate < today) return 'expired'
  // A policy already terminated ahead of time is not up for renewal.
  if (!policy.terminatedOn && today >= addDays(policy.endDate, -noticeDays)) return 'expiring'
  return 'active'
}

export type PolicyIssue = 'endBeforeStart' | 'terminationOutsidePeriod'

export function policyIssues(policy: PolicyPeriod): PolicyIssue[] {
  if (policy.endDate < policy.startDate) return ['endBeforeStart']
  if (
    policy.terminatedOn &&
    (policy.terminatedOn < policy.startDate || policy.terminatedOn > policy.endDate)
  ) {
    return ['terminationOutsidePeriod']
  }
  return []
}
