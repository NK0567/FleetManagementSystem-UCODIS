import type { LineFollowUp } from '@/modules/planning/customer-confirmations/domain/confirmation'
import { lineOutOfTour } from '@/modules/planning/customer-confirmations/domain/confirmation'

/** A line the warehouse still has to load and the depot still has to check. */
export function stillToLoad(line: LineFollowUp): boolean {
  return !lineOutOfTour(line)
}

/** Ready to leave once every line still in the tour was checked conforming. */
export function loadingReady(lines: readonly LineFollowUp[]): boolean {
  const staying = lines.filter(stillToLoad)
  return staying.length > 0 && staying.every((line) => line.conformingAt !== null && line.loadedQuantity !== null)
}
