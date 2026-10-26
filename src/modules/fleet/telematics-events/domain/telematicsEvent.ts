export const TELEMATICS_EVENT_STATUSES = ['new', 'acknowledged', 'infraction'] as const
export type TelematicsEventStatus = (typeof TELEMATICS_EVENT_STATUSES)[number]

export function telematicsEventStatus(event: {
  acknowledgedAt: string | null
  infractionNo: string | null
}): TelematicsEventStatus {
  if (event.infractionNo) return 'infraction'
  return event.acknowledgedAt ? 'acknowledged' : 'new'
}

/** Units report everything they measure; only readings past the threshold of the type are events. */
export function belowThreshold(value: number | null, threshold: number | null): boolean {
  return value !== null && threshold !== null && value < threshold
}
