export const DRIVER_REPORT_KINDS = [
  'technical',
  'documentary',
  'safety',
  'road_incident',
  'suggestion',
  'feedback'
] as const
export type DriverReportKind = (typeof DRIVER_REPORT_KINDS)[number]

export const DRIVER_REPORT_SEVERITIES = ['minor', 'major', 'critical'] as const
export type DriverReportSeverity = (typeof DRIVER_REPORT_SEVERITIES)[number]

export const DRIVER_REPORT_URGENCIES = ['immediate', 'to_plan', 'observation'] as const
export type DriverReportUrgency = (typeof DRIVER_REPORT_URGENCIES)[number]

export const DRIVER_REPORT_CHANNELS = ['app', 'phone', 'debriefing', 'oral'] as const
export type DriverReportChannel = (typeof DRIVER_REPORT_CHANNELS)[number]

export const DRIVER_REPORT_ACTION_KINDS = ['corrective', 'preventive'] as const
export type DriverReportActionKind = (typeof DRIVER_REPORT_ACTION_KINDS)[number]

export const DRIVER_REPORT_STATUSES = ['open', 'in_progress', 'closed'] as const
export type DriverReportStatus = (typeof DRIVER_REPORT_STATUSES)[number]

const DAY_MS = 24 * 60 * 60 * 1000

/** Days between the facts and the report. */
export function reportDelayDays(occurredOn: string, reportedOn: string): number {
  const gap =
    new Date(`${reportedOn}T00:00:00Z`).getTime() - new Date(`${occurredOn}T00:00:00Z`).getTime()
  return Math.round(gap / DAY_MS)
}

/** In time: reported within the delay set in the fleet settings (one day, so 24 hours, at the client). */
export function isWithinDelay(occurredOn: string, reportedOn: string, maxDays: number): boolean {
  return reportDelayDays(occurredOn, reportedOn) <= maxDays
}

export function isOpen(status: DriverReportStatus): boolean {
  return status !== 'closed'
}
