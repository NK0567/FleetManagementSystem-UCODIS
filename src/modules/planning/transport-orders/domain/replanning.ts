import { remainderQuantity } from '@/modules/planning/reception/domain/reception'

/**
 * Why a line waits for a new date (TRS01-US16, US17, TRS03-US13): its recipient is not available
 * before loading, the delivery was postponed on site and the goods came back, or only part of it
 * was delivered.
 */
export type ReplanKind = 'unavailable' | 'postponed' | 'remainder' | 'refused'

export interface ReplanFacts {
  quantity: number
  weightKg: number | null
  volumeM3?: number | null
  unavailableAt: string | null
  postponedAt: string | null
  returnedAt: string | null
  replannedAt: string | null
  declaredAt: string | null
  receivedQuantity: number | null
  loadedQuantity: number | null
  remainderAt: string | null
  clientProposedOn: string | null
  plannerProposedOn: string | null
  availableOn: string | null
  /** Refused on site, then received back at the warehouse (TRS04-US01). */
  refusalAt?: string | null
  warehouseReceivedAt?: string | null
}

export interface ReplanCandidate {
  kind: ReplanKind
  /** What is to deliver again: the whole line, or what was not received. */
  quantity: number
  /** Estimated at the prorata of the quantity left (TRS01-US17). */
  weightKg: number | null
  volumeM3: number | null
  /** The day the recipient gave, when he gave one. */
  recipientDate: string | null
  /** A day proposed by the planner, waiting for the recipient's agreement. */
  plannerDate: string | null
}

const share = (value: number | null | undefined, part: number, whole: number) =>
  value == null || whole <= 0 ? null : Math.round(((value * part) / whole) * 1000) / 1000

/** The line, if it is to replan; null otherwise. A line not loaded stays in its order. */
export function replanCandidate(line: ReplanFacts): ReplanCandidate | null {
  if (line.replannedAt) return null
  const whole = (kind: ReplanKind): ReplanCandidate => ({
    kind,
    quantity: line.quantity,
    weightKg: line.weightKg,
    volumeM3: line.volumeM3 ?? null,
    recipientDate: line.clientProposedOn ?? line.availableOn,
    plannerDate: line.plannerProposedOn
  })
  if (line.unavailableAt) return whole('unavailable')
  if (line.postponedAt && line.returnedAt) return whole('postponed')
  /* Refused goods are ready to replan once the warehouse has received them back; a
   * non-conformity found there stays on the line and never prevents it (TRS04-US01). */
  if (line.refusalAt && line.warehouseReceivedAt) return whole('refused')
  const left = remainderQuantity(line)
  if (left === null) return null
  const reference = line.loadedQuantity ?? line.quantity
  return {
    kind: 'remainder',
    quantity: left,
    weightKg: share(line.weightKg, left, reference),
    volumeM3: share(line.volumeM3, left, reference),
    recipientDate: line.availableOn,
    plannerDate: line.plannerProposedOn
  }
}

/**
 * The recipient answers a date on his page for a line out of his order: unavailable before
 * loading, postponed on site with the goods brought back, or a remainder (TRS01-US16, US17).
 */
export const recipientDates = (candidate: ReplanCandidate) => candidate.kind !== 'refused'

/**
 * The date the planner may retain at once: the recipient's own for an unavailability (the normal
 * path), any date he chooses for a postponement or a remainder. A date he proposes to a recipient
 * waits for that recipient's agreement.
 */
export const plannerRetains = (candidate: ReplanCandidate) => candidate.kind !== 'unavailable'
