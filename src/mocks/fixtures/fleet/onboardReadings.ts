/**
 * What the on-board computer of each tractor reads besides its position: the fuel gauge and the
 * engine. The demonstration has no real unit; the level is the one read when the vehicle left on
 * its trip (or now, off a trip) and the engine follows the way each driver behaves at a stop.
 */
export interface OnboardProfile {
  /** Level of the tank, in percent, at the start of the trip on the road or now off a trip. */
  fuelPct: number
  /** Minutes the engine keeps running once the vehicle has stopped at a stop of its trip. */
  idleAtStopMin: number
  /** The engine runs while the vehicle stands parked (warming up before loading). */
  runningWhileParked: boolean
}

export const ONBOARD_PROFILES: Readonly<Record<string, OnboardProfile>> = {
  'VEH-001': { fuelPct: 82, idleAtStopMin: 5, runningWhileParked: false },
  'VEH-002': { fuelPct: 64, idleAtStopMin: 5, runningWhileParked: false },
  'VEH-003': { fuelPct: 91, idleAtStopMin: 25, runningWhileParked: false },
  'VEH-004': { fuelPct: 47, idleAtStopMin: 20, runningWhileParked: true },
  'VEH-005': { fuelPct: 18, idleAtStopMin: 5, runningWhileParked: false },
  'VEH-006': { fuelPct: 22, idleAtStopMin: 10, runningWhileParked: false },
  'VEH-007': { fuelPct: 73, idleAtStopMin: 5, runningWhileParked: false },
  'VEH-008': { fuelPct: 35, idleAtStopMin: 5, runningWhileParked: false },
  'VEH-009': { fuelPct: 58, idleAtStopMin: 5, runningWhileParked: false },
  'VEH-010': { fuelPct: 69, idleAtStopMin: 5, runningWhileParked: false }
}

/** A vehicle of the fleet added later, without a profile, reads a half-full tank. */
export const DEFAULT_ONBOARD_PROFILE: OnboardProfile = {
  fuelPct: 50,
  idleAtStopMin: 5,
  runningWhileParked: false
}

/** Lowest level the simulated gauge goes down to: the driver refills before running dry. */
export const RESERVE_FUEL_PCT = 6

/** Spacing and number of the readings kept for the telemetry table of a vehicle. */
export const READING_STEP_MIN = 35
export const READING_COUNT = 5
