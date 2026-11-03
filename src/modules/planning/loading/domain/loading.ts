import type { LineFollowUp } from '@/modules/planning/customer-confirmations/domain/confirmation'
import { lineOutOfTour } from '@/modules/planning/customer-confirmations/domain/confirmation'

/** A line the warehouse still has to load and the depot still has to check. */
export function stillToLoad(line: LineFollowUp): boolean {
  return !lineOutOfTour(line)
}

/**
 * Ready to leave once the driver has checked every line (TRS03-US02 CA06): a conforming line must
 * also have its loaded quantity, a non-conforming one never blocks. A line that left the tour
 * before the check (unavailable recipient, replanned) is not checked.
 */
export function loadingReady(lines: readonly LineFollowUp[]): boolean {
  const toCheck = lines.filter((line) => !lineOutOfTour({ ...line, nonconformityAt: null }))
  return (
    toCheck.length > 0 &&
    toCheck.every(
      (line) =>
        line.nonconformityAt !== null ||
        (line.conformingAt !== null && line.loadedQuantity !== null)
    )
  )
}
