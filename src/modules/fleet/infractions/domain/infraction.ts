import type { InfractionSeverity } from '@/modules/fleet/infraction-types/types/infractionType.types'
import { addDays, minutesBetween } from '@/utils/date'

export const INFRACTION_STATUSES = ['new', 'in_progress', 'closed'] as const
export type InfractionStatus = (typeof INFRACTION_STATUSES)[number]

export const INFRACTION_SOURCES = ['manual', 'telematics'] as const
export type InfractionSource = (typeof INFRACTION_SOURCES)[number]

export const INFRACTION_OUTCOMES = [
  'reminder',
  'warning',
  'training',
  'sanction',
  'fine_paid',
  'dismissed'
] as const
export type InfractionOutcome = (typeof INFRACTION_OUTCOMES)[number]

/** Each outcome says whether it sends the driver to a training and whether it lifts the infraction. */
const OUTCOME_RULES: Record<InfractionOutcome, { triggersTraining: boolean; lifts: boolean }> = {
  reminder: { triggersTraining: false, lifts: false },
  warning: { triggersTraining: false, lifts: false },
  training: { triggersTraining: true, lifts: false },
  sanction: { triggersTraining: false, lifts: false },
  fine_paid: { triggersTraining: false, lifts: false },
  dismissed: { triggersTraining: false, lifts: true }
}

export function triggersTraining(outcome: InfractionOutcome): boolean {
  return OUTCOME_RULES[outcome].triggersTraining
}

export function infractionStatus(facts: {
  handlerCode: string | null
  outcome: InfractionOutcome | null
}): InfractionStatus {
  if (facts.outcome) return 'closed'
  return facts.handlerCode ? 'in_progress' : 'new'
}

/** Held against the driver: closed with an outcome that does not lift it. */
export function isUpheld(outcome: InfractionOutcome | null): boolean {
  return !!outcome && !OUTCOME_RULES[outcome].lifts
}

/** The same type on the same vehicle within ten minutes is one infraction reported twice. */
export const DUPLICATE_WINDOW_MIN = 10

type Occurrence = { vehicleNo: string; infractionTypeNo: string; occurredAt: string }

export function isDuplicate(a: Occurrence, b: Occurrence): boolean {
  return (
    a.vehicleNo === b.vehicleNo &&
    a.infractionTypeNo === b.infractionTypeNo &&
    Math.abs(minutesBetween(a.occurredAt, b.occurredAt)) < DUPLICATE_WINDOW_MIN
  )
}

/** Who is handling the file now: the manager first, then up the line when it drags. */
export const INFRACTION_HANDLING_LEVELS = ['manager', 'superior', 'general_management'] as const
export type InfractionHandlingLevel = (typeof INFRACTION_HANDLING_LEVELS)[number]

/** Days given to settle an infraction before it is late, by severity; set in the fleet settings. */
export type HandlingDelays = Record<InfractionSeverity, number>

export const DEFAULT_HANDLING_DELAYS: HandlingDelays = { minor: 15, major: 10, serious: 5 }

export function defaultDueOn(
  occurredAt: string,
  severity: InfractionSeverity,
  delays: HandlingDelays = DEFAULT_HANDLING_DELAYS
): string {
  return addDays(occurredAt.slice(0, 10), delays[severity])
}

/** Late: still open past its deadline. */
export function isOverdue(
  facts: { dueOn: string | null; outcome: InfractionOutcome | null },
  today: string
): boolean {
  return !facts.outcome && !!facts.dueOn && facts.dueOn < today
}
