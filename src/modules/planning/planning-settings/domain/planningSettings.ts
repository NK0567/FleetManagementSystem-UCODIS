import { settingFieldIssues, type SettingField } from '@/core/utils/settingFields'

export const FREIGHT_PAYERS = ['orderer', 'recipient'] as const
export type FreightPayer = (typeof FREIGHT_PAYERS)[number]

export const EXPIRED_DATE_MODES = ['alert', 'block'] as const
export type ExpiredDateMode = (typeof EXPIRED_DATE_MODES)[number]

export const OVER_TOLERANCE_MODES = ['flag', 'block'] as const
export type OverToleranceMode = (typeof OVER_TOLERANCE_MODES)[number]

export const VOLUME15_METHODS = ['coefficient', 'typed'] as const
export type Volume15Method = (typeof VOLUME15_METHODS)[number]

export interface ScheduleSettings {
  /** Prefilled departure time of a new order; empty leaves it to the planner. */
  defaultDepartureTime: string
  /** Used to time the stops when a route template gives no duration. */
  averageSpeedKmh: number
  /** A stop reached later than planned plus this margin counts as late. */
  lateMarginMin: number
}

export interface ConfirmationSettings {
  /** Days after delivery without an answer before the recipient is held to have confirmed; empty never. */
  tacitConfirmationDays: number | null
}

export interface GoodsSettings {
  countingUnit: string
  prefillQuantities: boolean
}

export interface RequestSettings {
  externalReferenceLabel: string
  externalReferenceRequired: boolean
  expiredDateMode: ExpiredDateMode
}

export interface QuantitySettings {
  overToleranceMode: OverToleranceMode
  /** coefficient computes V15; typed keeps only the value entered on the measure. */
  volume15Method: Volume15Method
}

export interface BillingSettings {
  defaultFreightPayer: FreightPayer
  /** Gap accepted between a carrier's invoice and the agreed amount. */
  carrierInvoiceToleranceAmount: number
}

/** Capacity and calendar are checked with a warning the planner may override, unless made strict. */
export interface ControlSettings {
  strictCapacity: boolean
  strictCalendar: boolean
}

export interface ClosingSettings {
  /** Comma-separated document kinds required before an order can be closed. A dash requires none. */
  requiredDocuments: string
}

export interface PlanningSettings {
  schedule: ScheduleSettings
  confirmation: ConfirmationSettings
  goods: GoodsSettings
  requests: RequestSettings
  quantities: QuantitySettings
  billing: BillingSettings
  controls: ControlSettings
  closing: ClosingSettings
}

export type PlanningSettingsSection = keyof PlanningSettings

export const PLANNING_SETTINGS_SECTIONS = [
  'schedule',
  'confirmation',
  'goods',
  'requests',
  'quantities',
  'billing',
  'controls',
  'closing'
] as const

export type PlanningSettingUnit = 'kmh' | 'min' | 'days' | 'amount'

type Field = SettingField<PlanningSettingUnit>

export const PLANNING_SETTING_FIELDS: Record<PlanningSettingsSection, readonly Field[]> = {
  schedule: [
    { key: 'defaultDepartureTime', kind: 'time' },
    { key: 'averageSpeedKmh', kind: 'number', unit: 'kmh', min: 1, max: 130 },
    { key: 'lateMarginMin', kind: 'number', unit: 'min', min: 0, max: 240 }
  ],
  confirmation: [
    { key: 'tacitConfirmationDays', kind: 'optionalNumber', unit: 'days', min: 1, max: 60 }
  ],
  goods: [
    { key: 'countingUnit', kind: 'text', maxLength: 30 },
    { key: 'prefillQuantities', kind: 'boolean' }
  ],
  requests: [
    { key: 'externalReferenceLabel', kind: 'text', maxLength: 40 },
    { key: 'externalReferenceRequired', kind: 'boolean' },
    {
      key: 'expiredDateMode',
      kind: 'choice',
      optionsKey: 'expiredDateMode',
      values: EXPIRED_DATE_MODES
    }
  ],
  quantities: [
    {
      key: 'overToleranceMode',
      kind: 'choice',
      optionsKey: 'overToleranceMode',
      values: OVER_TOLERANCE_MODES
    },
    {
      key: 'volume15Method',
      kind: 'choice',
      optionsKey: 'volume15Method',
      values: VOLUME15_METHODS
    }
  ],
  billing: [
    {
      key: 'defaultFreightPayer',
      kind: 'choice',
      optionsKey: 'freightPayer',
      values: FREIGHT_PAYERS
    },
    {
      key: 'carrierInvoiceToleranceAmount',
      kind: 'number',
      unit: 'amount',
      min: 0,
      max: 100_000_000
    }
  ],
  controls: [
    { key: 'strictCapacity', kind: 'boolean' },
    { key: 'strictCalendar', kind: 'boolean' }
  ],
  closing: [{ key: 'requiredDocuments', kind: 'text', maxLength: 200 }]
}

export const DEFAULT_PLANNING_SETTINGS: PlanningSettings = {
  schedule: { defaultDepartureTime: '08:00', averageSpeedKmh: 45, lateMarginMin: 30 },
  confirmation: { tacitConfirmationDays: 3 },
  goods: { countingUnit: 'cartons', prefillQuantities: true },
  requests: {
    externalReferenceLabel: 'N° de commande client',
    externalReferenceRequired: false,
    expiredDateMode: 'alert'
  },
  quantities: { overToleranceMode: 'flag', volume15Method: 'coefficient' },
  billing: { defaultFreightPayer: 'orderer', carrierInvoiceToleranceAmount: 0 },
  controls: { strictCapacity: false, strictCalendar: false },
  closing: { requiredDocuments: 'loading_list,delivery_note' }
}

export function isPlanningSettingsSection(value: string): value is PlanningSettingsSection {
  return (PLANNING_SETTINGS_SECTIONS as readonly string[]).includes(value)
}

export function planningSettingsIssues(
  section: PlanningSettingsSection,
  values: Record<string, unknown>
) {
  return settingFieldIssues(PLANNING_SETTING_FIELDS[section], values)
}
