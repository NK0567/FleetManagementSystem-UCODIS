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
  /** The agent handling the line: while it is taken, it is not offered to the others. */
  confirmationAgent: string | null
  confirmationTakenAt: string | null
  /** Who gave the answer: the recipient through his link, or an agent on the phone. */
  answerOrigin: 'link' | 'agent' | null
  /** The driver marked his arrival at the delivery point of this line. */
  arrivedAt: string | null
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
  receptionConfirmedAt: string | null
  receptionConfirmedBy: string
  receptionContestedAt: string | null
  contestReasonNo: string | null
  contestComment: string
  contestHandledAt: string | null
  contestHandledBy: string | null
  contestNote: string
  contestHandlingReasonNo: string | null
  satisfactionScore: number | null
  satisfactionComment: string
  /** Whether a qualified gap is the driver's doing (TRS03-US17). */
  gapImputableToDriver?: boolean | null
  /** A product line left undelivered at the declaration, with its reason (TRS03-US11). */
  undeliveredReasonNo?: string | null
  undeliveredComment?: string
  /** What the driver measured at the delivery, for fuel: volume, temperature, density, 15 °C (TRS03-US10). */
  deliveryMeasures?: {
    deliveredVolumeL: number | null
    temperatureC: number | null
    density: number | null
    volume15L: number | null
  } | null
  /** A delivery note cancelled by an incident or deviated (TRS01-US25, US26). */
  incident?: {
    kind: 'cancellation' | 'deviation' | 'return'
    at: string
    by: string
    incidentTypeNo: string
    reasonTypeNo: string
    reasonCodeNo: string
    comment: string
    deviatedToRequestNo: string | null
  } | null
  /** The day from which the recipient can be delivered, given with a postponement (TRS03-US13). */
  availableFrom?: string | null
  /** Messages sent to the recipient on his channel as the delivery moves on (TRS02-US02). */
  recipientMessages?: { at: string; channel: string; kind: string }[]
  handedBackAt: string | null
  warehouseReceivedAt: string | null
  warehouseConforming: boolean | null
  returnNonconformityReasonNo: string | null
  remainderAt: string | null
  remainderRequestNo: string | null
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
    confirmationAgent: null,
    confirmationTakenAt: null,
    answerOrigin: null,
    arrivedAt: null,
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
    returnedAt: null,
    receptionConfirmedAt: null,
    receptionConfirmedBy: '',
    receptionContestedAt: null,
    contestReasonNo: null,
    contestComment: '',
    contestHandledAt: null,
    contestHandledBy: null,
    contestNote: '',
    contestHandlingReasonNo: null,
    satisfactionScore: null,
    satisfactionComment: '',
    handedBackAt: null,
    warehouseReceivedAt: null,
    warehouseConforming: null,
    returnNonconformityReasonNo: null,
    remainderAt: null,
    remainderRequestNo: null
  }
}

export type ConfirmationState = 'pending' | 'confirmed' | 'unavailable' | 'replanned'

type TourLine = {
  confirmedAt?: string | null
  unavailableAt: string | null
  replannedAt: string | null
  nonconformityAt?: string | null
  returnedAt?: string | null
  incident?: unknown
}

/** A line left the tour: the recipient is unavailable, the goods failed the loading check, or the delivery was sent back to the pool. */
export function lineOutOfTour(line: TourLine): boolean {
  return (
    line.unavailableAt !== null ||
    line.replannedAt !== null ||
    !!line.incident ||
    !!line.nonconformityAt ||
    !!line.returnedAt
  )
}

export function confirmationState(line: TourLine): ConfirmationState {
  if (line.replannedAt) return 'replanned'
  if (line.unavailableAt || line.nonconformityAt) return 'unavailable'
  if (line.confirmedAt) return 'confirmed'
  return 'pending'
}

/** The driver has marked his arrival on a point, or already settled one (TRS03-US09). */
export function firstArrivalMarked(
  lines: readonly {
    arrivedAt?: string | null
    declaredAt?: string | null
    refusalAt?: string | null
    postponedAt?: string | null
  }[]
): boolean {
  return lines.some(
    (line) => !!line.arrivedAt || !!line.declaredAt || !!line.refusalAt || !!line.postponedAt
  )
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
