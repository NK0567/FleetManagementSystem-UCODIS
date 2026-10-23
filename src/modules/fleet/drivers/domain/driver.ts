export const DRIVER_AVAILABILITIES = [
  'available',
  'on_trip',
  'trip_planned',
  'on_leave',
  'unavailable'
] as const
export type DriverAvailability = (typeof DRIVER_AVAILABILITIES)[number]

export type IneligibilityReason =
  | 'not_on_staff'
  | 'suspended'
  | 'position_does_not_drive'
  | 'not_authorized'
  | 'on_leave'
  | 'documents'

export interface DriverFacts {
  onStaff: boolean
  suspended: boolean
  positionDrives: boolean
  drivingAuthorized: boolean
  onLeave: boolean
  /** Unknown (null) until the documents are tracked. */
  documentsCompliant: boolean | null
  onTrip: boolean
  tripPlanned: boolean
}

/** Why the employee may not be given a vehicle; empty when they may. */
export function driverIneligibility(facts: DriverFacts): IneligibilityReason[] {
  const reasons: IneligibilityReason[] = []
  if (!facts.onStaff) reasons.push('not_on_staff')
  if (facts.suspended) reasons.push('suspended')
  if (!facts.positionDrives) reasons.push('position_does_not_drive')
  if (!facts.drivingAuthorized) reasons.push('not_authorized')
  if (facts.onLeave) reasons.push('on_leave')
  if (facts.documentsCompliant === false) reasons.push('documents')
  return reasons
}

export function driverAvailability(facts: DriverFacts): DriverAvailability {
  if (!facts.onStaff || facts.suspended) return 'unavailable'
  if (facts.onLeave) return 'on_leave'
  if (facts.onTrip) return 'on_trip'
  if (facts.tripPlanned) return 'trip_planned'
  return 'available'
}
