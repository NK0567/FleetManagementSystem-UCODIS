export const VEHICLE_CHECK_MOMENTS = ['before_loading', 'trip_return', 'new_vehicle'] as const
export type VehicleCheckMoment = (typeof VEHICLE_CHECK_MOMENTS)[number]

export const CHECK_RESULTS = ['ok', 'anomaly'] as const
export type CheckResult = (typeof CHECK_RESULTS)[number]

export const VEHICLE_CHECK_OUTCOMES = ['ok', 'anomaly', 'blocking'] as const
export type VehicleCheckOutcome = (typeof VEHICLE_CHECK_OUTCOMES)[number]

/** A point as it stood when the check was made: later edits to the reference do not rewrite history. */
export interface CheckPointResult {
  pointNo: string
  label: string
  blocking: boolean
  result: CheckResult
}

export function blockingAnomalies(results: readonly CheckPointResult[]): CheckPointResult[] {
  return results.filter((point) => point.result === 'anomaly' && point.blocking)
}

/** A blocking anomaly keeps the vehicle in; any other anomaly is only to follow up. */
export function vehicleCheckOutcome(results: readonly CheckPointResult[]): VehicleCheckOutcome {
  if (blockingAnomalies(results).length) return 'blocking'
  return results.some((point) => point.result === 'anomaly') ? 'anomaly' : 'ok'
}
