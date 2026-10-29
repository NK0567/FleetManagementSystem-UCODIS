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

export const INSPECTION_VERDICTS = ['conforming', 'observation', 'non_conforming'] as const
export type InspectionVerdict = (typeof INSPECTION_VERDICTS)[number]

/** One item of the grid as it was inspected; code and label are copied so later edits of the grid do not rewrite a signed report. */
export interface InspectionItemResult {
  itemNo: string
  label: string
  part: 'vehicle' | 'tank'
  verdict: InspectionVerdict | null
  comment: string
}

export type InspectionGridIssue = 'incomplete' | 'observationRequired'

/** Every item has a verdict, and every observation or non-conformity says what was found. */
export function inspectionGridIssues(
  items: readonly InspectionItemResult[]
): InspectionGridIssue[] {
  const issues: InspectionGridIssue[] = []
  if (!items.length || items.some((item) => !item.verdict)) issues.push('incomplete')
  if (items.some((item) => item.verdict && item.verdict !== 'conforming' && !item.comment.trim())) {
    issues.push('observationRequired')
  }
  return issues
}

/** One non-conforming item makes the inspection non-conforming, and so calls for a re-inspection. */
export function gridResult(items: readonly Pick<InspectionItemResult, 'verdict'>[]) {
  return items.some((item) => item.verdict === 'non_conforming')
    ? ('non_conforming' as const)
    : ('conforming' as const)
}

/** What the re-inspection has to look at again: the non-conforming items. */
export function itemsToRecheck(items: readonly InspectionItemResult[]): InspectionItemResult[] {
  return items.filter((item) => item.verdict === 'non_conforming')
}
