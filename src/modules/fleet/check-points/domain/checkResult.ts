export const CHECK_RESULTS = ['ok', 'anomaly', 'na'] as const
export type CheckResultValue = (typeof CHECK_RESULTS)[number]

/** One point as it was checked; label and blocking are copied so later edits of the point do not rewrite history. */
export interface CheckResult {
  pointNo: string
  label: string
  blocking: boolean
  result: CheckResultValue | null
  comment: string
}

export type CheckIssue = 'incomplete' | 'commentRequired'

/** Every point answered, and every anomaly explained. */
export function checkIssues(results: readonly CheckResult[]): CheckIssue[] {
  const issues: CheckIssue[] = []
  if (results.some((point) => !point.result)) issues.push('incomplete')
  if (results.some((point) => point.result === 'anomaly' && !point.comment.trim())) {
    issues.push('commentRequired')
  }
  return issues
}

export function anomalies(results: readonly CheckResult[]): CheckResult[] {
  return results.filter((point) => point.result === 'anomaly')
}

/** An anomaly on a blocking point keeps the vehicle or the driver from leaving. */
export function blockingAnomalies(results: readonly CheckResult[]): CheckResult[] {
  return anomalies(results).filter((point) => point.blocking)
}
