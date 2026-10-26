import {
  quantityGap,
  type ToleranceRule
} from '@/modules/planning/quantity-tolerances/domain/quantityTolerance'
import {
  lineOutOfTour,
  type LineFollowUp
} from '@/modules/planning/customer-confirmations/domain/confirmation'
import type { OverToleranceMode } from '@/modules/planning/planning-settings/domain/planningSettings'

export type GapQualification = 'gain' | 'loss'

/** A line still in the tour is settled once it is declared or refused. A simple postponement is not. */
export function lineSettled(line: LineFollowUp): boolean {
  if (lineOutOfTour(line)) return true
  return line.declaredAt !== null || line.refusalAt !== null
}

/** Delivered when every line is settled. An order with no line is not. */
export function linesDelivered(lines: readonly LineFollowUp[]): boolean {
  return lines.length > 0 && lines.every(lineSettled)
}

export interface QuantityDecision {
  gap: number | null
  outside: boolean
  blocked: boolean
}

/**
 * The received quantity is compared with the loaded one. Outside the tolerance, block mode
 * refuses the entry until a justification is given; flag mode keeps the gap to be qualified.
 */
export function receivedQuantityDecision(
  loaded: number,
  received: number,
  rule: ToleranceRule | null,
  mode: OverToleranceMode,
  justification: string
): QuantityDecision {
  if (!rule) return { gap: null, outside: false, blocked: false }
  const result = quantityGap(rule, loaded, received)
  if (!result.outside) return { gap: null, outside: false, blocked: false }
  return {
    gap: result.gap,
    outside: true,
    blocked: mode === 'block' && justification.trim() === ''
  }
}

export function qualificationFits(gap: number, kind: GapQualification): boolean {
  return kind === 'gain' ? gap > 0 : gap < 0
}
