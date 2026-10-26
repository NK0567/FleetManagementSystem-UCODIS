import { addDays } from '@/utils/date'

export const INSPECTION_STATES = [
  'conforming',
  'recheck_pending',
  'recheck_overdue',
  'rechecked'
] as const
export type InspectionState = (typeof INSPECTION_STATES)[number]

interface InspectionFacts {
  inspectedOn: string
  result: 'conforming' | 'non_conforming'
  recheckDoneOn: string | null
}

/** A non-conforming vehicle is re-inspected within the delay set in the fleet settings. */
export function recheckDueOn(inspection: InspectionFacts, delayDays: number): string | null {
  return inspection.result === 'non_conforming' ? addDays(inspection.inspectedOn, delayDays) : null
}

export function inspectionState(
  inspection: InspectionFacts,
  delayDays: number,
  today: string
): InspectionState {
  if (inspection.result === 'conforming') return 'conforming'
  if (inspection.recheckDoneOn) return 'rechecked'
  const due = recheckDueOn(inspection, delayDays) ?? today
  return today > due ? 'recheck_overdue' : 'recheck_pending'
}

/** Until it passes its re-inspection, a non-conforming vehicle stays off the road. */
export function awaitsRecheck(inspection: InspectionFacts): boolean {
  return inspection.result === 'non_conforming' && !inspection.recheckDoneOn
}
