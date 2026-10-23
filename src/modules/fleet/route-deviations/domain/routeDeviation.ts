import { addMinutes } from '@/utils/date'

export const DEVIATION_NATURES = ['to_qualify', 'authorized', 'endured', 'unjustified'] as const
export type DeviationNature = (typeof DEVIATION_NATURES)[number]
export type QualifiedNature = Exclude<DeviationNature, 'to_qualify'>

export const DEVIATION_DECISIONS = ['dismissed', 'warning', 'sanction'] as const
export type DeviationDecision = (typeof DEVIATION_DECISIONS)[number]

export const DEVIATION_SOURCES = ['manual', 'telematics'] as const
export type DeviationSource = (typeof DEVIATION_SOURCES)[number]

export interface DeviationQualification {
  nature: QualifiedNature
  decision: DeviationDecision
  reason: string
  by: string
  at: string
}

export function deviationNature(qualification: DeviationQualification | null): DeviationNature {
  return qualification?.nature ?? 'to_qualify'
}

/** Only an unjustified deviation can lead to a warning or a sanction. */
export function allowedDecisions(nature: QualifiedNature): readonly DeviationDecision[] {
  return nature === 'unjustified' ? DEVIATION_DECISIONS : ['dismissed']
}

/** The driver explains a deviation once, within the delay set in the fleet settings. */
export function justificationDeadline(detectedAt: string, delayHours: number): string {
  return addMinutes(detectedAt, delayHours * 60)
}

/** Share of finished trips with no unjustified deviation, in percent; none without finished trips. */
export function complianceRate(
  finishedTripNos: readonly string[],
  unjustifiedTripNos: ReadonlySet<string>
): number | null {
  if (!finishedTripNos.length) return null
  const compliant = finishedTripNos.filter((no) => !unjustifiedTripNos.has(no)).length
  return Math.round((compliant / finishedTripNos.length) * 100)
}
