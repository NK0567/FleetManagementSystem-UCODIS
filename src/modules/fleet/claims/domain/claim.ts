export const INSURANCE_STATUSES = [
  'not_declared',
  'declared',
  'assessment',
  'accepted',
  'refused',
  'settled'
] as const
export type InsuranceStatus = (typeof INSURANCE_STATUSES)[number]

export const CLAIM_STATUSES = ['open', 'closed'] as const
export type ClaimStatus = (typeof CLAIM_STATUSES)[number]

/** The insurer's handling only moves forward, one step at a time. */
const NEXT_INSURANCE_STATUSES: Record<InsuranceStatus, readonly InsuranceStatus[]> = {
  not_declared: ['declared'],
  declared: ['assessment'],
  assessment: ['accepted', 'refused'],
  accepted: ['settled'],
  refused: [],
  settled: []
}

export function nextInsuranceStatuses(status: InsuranceStatus): readonly InsuranceStatus[] {
  return NEXT_INSURANCE_STATUSES[status]
}

/** The insurer pays an amount once it accepts the claim. */
export function needsIndemnity(status: InsuranceStatus): boolean {
  return status === 'accepted' || status === 'settled'
}

export type IndemnityIssue = 'indemnityRequired' | 'indemnityAboveDamage'

export function indemnityIssues(
  status: InsuranceStatus,
  indemnity: number | null,
  damage: number | null
): IndemnityIssue[] {
  if (!needsIndemnity(status)) return []
  if (indemnity == null) return ['indemnityRequired']
  if (indemnity > (damage ?? 0)) return ['indemnityAboveDamage']
  return []
}

/** Accidents for every million kilometres the park has run; null without a distance. */
export function accidentsPerMillionKm(accidents: number, fleetKm: number): number | null {
  return fleetKm > 0 ? Math.round((accidents / fleetKm) * 1_000_000 * 100) / 100 : null
}

export function residualCost(damage: number | null, indemnity: number | null): number {
  return Math.max(0, (damage ?? 0) - (indemnity ?? 0))
}

export type ClosureBlock =
  | 'alreadyClosed'
  | 'analysisRequired'
  | 'liabilityUndetermined'
  | 'insurancePending'
  | 'repairOpen'

/** What still stands in the way of closing the file. */
export function closureBlocks(claim: {
  status: ClaimStatus
  analysis: string
  liability: string
  insuranceStatus: InsuranceStatus
  /** A repair order still under way for the damage. */
  repairOpen?: boolean
}): ClosureBlock[] {
  if (claim.status === 'closed') return ['alreadyClosed']
  const blocks: ClosureBlock[] = []
  if (!claim.analysis.trim()) blocks.push('analysisRequired')
  if (claim.liability === 'to_determine') blocks.push('liabilityUndetermined')
  if (claim.insuranceStatus === 'declared' || claim.insuranceStatus === 'assessment') {
    blocks.push('insurancePending')
  }
  if (claim.repairOpen) blocks.push('repairOpen')
  return blocks
}
