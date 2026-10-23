export const TRAINING_STATUSES = ['to_plan', 'planned', 'attended', 'cancelled'] as const
export type TrainingStatus = (typeof TRAINING_STATUSES)[number]

export function trainingStatus(facts: {
  plannedOn: string | null
  attendedOn: string | null
  cancelledAt: string | null
}): TrainingStatus {
  if (facts.cancelledAt) return 'cancelled'
  if (facts.attendedOn) return 'attended'
  return facts.plannedOn ? 'planned' : 'to_plan'
}

/** Still to come: it can be rescheduled, attended or cancelled. */
export function isPending(status: TrainingStatus): boolean {
  return status === 'to_plan' || status === 'planned'
}

/** One training per origin and driver: an infraction or a claim does not train twice. */
export function isSameTraining(
  a: { employeeNo: string; originNo: string },
  b: { employeeNo: string; originNo: string; status: TrainingStatus }
): boolean {
  return (
    !!a.originNo &&
    a.originNo === b.originNo &&
    a.employeeNo === b.employeeNo &&
    b.status !== 'cancelled'
  )
}
