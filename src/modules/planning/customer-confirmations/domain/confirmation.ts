import { addDays } from '@/utils/date'

/** How long a tracking link stays valid. The public page itself arrives in phase 5. */
export const TRACKING_TOKEN_DAYS = 30

export interface LineFollowUp {
  confirmedAt: string | null
  confirmedBy: string | null
  unavailableAt: string | null
  unavailabilityReasonNo: string | null
  unavailabilityComment: string
  availableOn: string | null
  clientProposedOn: string | null
  plannerProposedOn: string | null
  replannedAt: string | null
  trackingToken: string | null
  trackingExpiresOn: string | null
  loadedQuantity: number | null
  conformingAt: string | null
  nonconformityAt: string | null
  nonconformityReasonNo: string | null
  nonconformityComment: string
  declaredAt: string | null
  declaredBy: string | null
  receivedQuantity: number | null
  quantityGap: number | null
  gapQualification: 'gain' | 'loss' | null
  gapComment: string
  refusalAt: string | null
  refusalReasonNo: string | null
  refusalComment: string
  postponedAt: string | null
  postponementReasonNo: string | null
  postponementComment: string
  returnedAt: string | null
}

export function emptyFollowUp(): LineFollowUp {
  return {
    confirmedAt: null,
    confirmedBy: null,
    unavailableAt: null,
    unavailabilityReasonNo: null,
    unavailabilityComment: '',
    availableOn: null,
    clientProposedOn: null,
    plannerProposedOn: null,
    replannedAt: null,
    trackingToken: null,
    trackingExpiresOn: null,
    loadedQuantity: null,
    conformingAt: null,
    nonconformityAt: null,
    nonconformityReasonNo: null,
    nonconformityComment: '',
    declaredAt: null,
    declaredBy: null,
    receivedQuantity: null,
    quantityGap: null,
    gapQualification: null,
    gapComment: '',
    refusalAt: null,
    refusalReasonNo: null,
    refusalComment: '',
    postponedAt: null,
    postponementReasonNo: null,
    postponementComment: '',
    returnedAt: null
  }
}

export type ConfirmationState = 'pending' | 'confirmed' | 'unavailable' | 'replanned'

type TourLine = {
  confirmedAt?: string | null
  unavailableAt: string | null
  replannedAt: string | null
  nonconformityAt?: string | null
  returnedAt?: string | null
}

/** A line left the tour: the recipient is unavailable, the goods failed the loading check, or the delivery was sent back to the pool. */
export function lineOutOfTour(line: TourLine): boolean {
  return line.unavailableAt !== null || line.replannedAt !== null || !!line.nonconformityAt || !!line.returnedAt
}

export function confirmationState(line: TourLine): ConfirmationState {
  if (line.replannedAt) return 'replanned'
  if (line.unavailableAt || line.nonconformityAt) return 'unavailable'
  if (line.confirmedAt) return 'confirmed'
  return 'pending'
}

/** Nothing left in the tour still waits for a yes. An empty tour counts as confirmed. */
export function linesConfirmed(lines: readonly TourLine[]): boolean {
  return lines.filter((line) => !lineOutOfTour(line)).every((line) => line.confirmedAt != null)
}

/**
 * After delivery, silence for the configured number of days counts as a confirmation.
 * An empty delay never confirms tacitly. Before delivery there is nothing to confirm.
 */
export function tacitlyConfirmed(
  deliveredOn: string | null,
  today: string,
  tacitDays: number | null
): boolean {
  if (!deliveredOn || tacitDays === null) return false
  return addDays(deliveredOn.slice(0, 10), tacitDays) <= today
}

export function trackingExpiry(today: string): string {
  return addDays(today, TRACKING_TOKEN_DAYS)
}

export function opaqueToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
