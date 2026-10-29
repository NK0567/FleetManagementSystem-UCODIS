import type {
  ExpiredDateMode,
  IntakeSettings,
  OfferedChannel,
  PlanningSettings
} from '../domain/planningSettings'

export interface PlanningSettingsApi extends PlanningSettings {
  modifiedAt: string
  modifiedBy: string
}

/** The settings every screen of the order circuit adapts to (TRS07-US05). */
export interface PlanningCircuitApi {
  intake: IntakeSettings
  /** « none » first, then the channels the company offers. */
  channels: ('none' | OfferedChannel)[]
  externalReferenceLabel: string
  externalReferenceRequired: boolean
  countingUnit: string
  expiredDateMode: ExpiredDateMode
}
