import { settingFieldIssues, type SettingField } from '@/core/utils/settingFields'

export const FREIGHT_PAYERS = ['orderer', 'recipient'] as const
export type FreightPayer = (typeof FREIGHT_PAYERS)[number]

export const EXPIRED_DATE_MODES = ['alert', 'block'] as const
export type ExpiredDateMode = (typeof EXPIRED_DATE_MODES)[number]

export const OVER_TOLERANCE_MODES = ['flag', 'block'] as const
export type OverToleranceMode = (typeof OVER_TOLERANCE_MODES)[number]

export const VOLUME15_METHODS = ['coefficient', 'typed'] as const
export type Volume15Method = (typeof VOLUME15_METHODS)[number]

/** When the agents call the recipients who answer by phone (TRS01-US15). */
export const CALL_MOMENTS = ['day_before', 'same_day'] as const
export type CallMoment = (typeof CALL_MOMENTS)[number]

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
  /** The calls of a delivery fall due the day before it, or on the day itself. */
  callMoment: CallMoment
}

/**
 * How orders come in, chosen by each company (TRS01-US01, TRS07-US05): typed by the planner,
 * imported from a file, received from the management system, sent through the API by external
 * orderers, or transmitted by a service (the orderer accounts). None is imposed.
 */
export interface IntakeSettings {
  manualEntry: boolean
  fileImport: boolean
  erpConnector: boolean
  ordererApi: boolean
  serviceTransmission: boolean
  /** The planner may key an order directly in a transport order (TRS01-US06, TRS07-US05). */
  plannerDirectEntry: boolean
}

/** The notification channels the company offers its recipients (TRS01-US14, TRS07-US05). */
export interface ChannelSettings {
  sms: boolean
  call: boolean
  email: boolean
  whatsapp: boolean
}

export const CHANNEL_KEYS = ['sms', 'call', 'email', 'whatsapp'] as const
export type OfferedChannel = (typeof CHANNEL_KEYS)[number]

/** A list kept by the administrator for cancellations and deviations (TRS07-US06). */
export interface IncidentListItem {
  no: string
  name: string
  active: boolean
}

export interface ReasonCodeItem extends IncidentListItem {
  reasonTypeNo: string
}

export interface IncidentSettings {
  incidentTypes: IncidentListItem[]
  reasonTypes: IncidentListItem[]
  reasonCodes: ReasonCodeItem[]
}

export const INCIDENT_LISTS = ['incidentTypes', 'reasonTypes', 'reasonCodes'] as const
export type IncidentList = (typeof INCIDENT_LISTS)[number]

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
  intake: IntakeSettings
  channels: ChannelSettings
  goods: GoodsSettings
  requests: RequestSettings
  quantities: QuantitySettings
  billing: BillingSettings
  controls: ControlSettings
  closing: ClosingSettings
  /** Lists rather than single values: saved through their own route, not as a section. */
  incidents: IncidentSettings
}

export type PlanningSettingsSection = Exclude<keyof PlanningSettings, 'incidents'>

export const PLANNING_SETTINGS_SECTIONS = [
  'schedule',
  'confirmation',
  'intake',
  'channels',
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
    { key: 'tacitConfirmationDays', kind: 'optionalNumber', unit: 'days', min: 1, max: 60 },
    { key: 'callMoment', kind: 'choice', optionsKey: 'callMoment', values: CALL_MOMENTS }
  ],
  intake: [
    { key: 'manualEntry', kind: 'boolean' },
    { key: 'fileImport', kind: 'boolean' },
    { key: 'erpConnector', kind: 'boolean' },
    { key: 'ordererApi', kind: 'boolean' },
    { key: 'serviceTransmission', kind: 'boolean' },
    { key: 'plannerDirectEntry', kind: 'boolean' }
  ],
  channels: [
    { key: 'sms', kind: 'boolean' },
    { key: 'call', kind: 'boolean' },
    { key: 'email', kind: 'boolean' },
    { key: 'whatsapp', kind: 'boolean' }
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
  confirmation: { tacitConfirmationDays: 3, callMoment: 'day_before' },
  intake: {
    manualEntry: true,
    fileImport: true,
    erpConnector: true,
    ordererApi: true,
    serviceTransmission: true,
    plannerDirectEntry: true
  },
  channels: { sms: true, call: true, email: true, whatsapp: true },
  goods: { countingUnit: 'cartons', prefillQuantities: true },
  requests: {
    externalReferenceLabel: 'N° de commande client',
    externalReferenceRequired: false,
    expiredDateMode: 'alert'
  },
  quantities: { overToleranceMode: 'flag', volume15Method: 'coefficient' },
  billing: { defaultFreightPayer: 'orderer', carrierInvoiceToleranceAmount: 0 },
  controls: { strictCapacity: false, strictCalendar: false },
  closing: { requiredDocuments: 'loading_list,delivery_note' },
  incidents: {
    incidentTypes: [
      { no: 'INC-CANCEL', name: 'Annulation', active: true },
      { no: 'INC-DEVIATION', name: 'Déviation', active: true }
    ],
    reasonTypes: [
      { no: 'MTY-CLIENT', name: 'Motif lié au client', active: true },
      { no: 'MTY-OPERATIONS', name: 'Motif lié à l’exploitation', active: true },
      { no: 'MTY-ROAD', name: 'Motif lié à la route', active: true }
    ],
    reasonCodes: [
      {
        no: 'MCO-CLIENT-REQUEST',
        name: 'Demande du client',
        reasonTypeNo: 'MTY-CLIENT',
        active: true
      },
      {
        no: 'MCO-SITE-CLOSED',
        name: 'Site du client fermé',
        reasonTypeNo: 'MTY-CLIENT',
        active: true
      },
      {
        no: 'MCO-VEHICLE-DOWN',
        name: 'Véhicule en panne',
        reasonTypeNo: 'MTY-OPERATIONS',
        active: true
      },
      {
        no: 'MCO-STOCK',
        name: 'Produit indisponible au dépôt',
        reasonTypeNo: 'MTY-OPERATIONS',
        active: true
      },
      { no: 'MCO-ROAD-CLOSED', name: 'Route coupée', reasonTypeNo: 'MTY-ROAD', active: true },
      {
        no: 'MCO-SECURITY',
        name: 'Insécurité sur l’itinéraire',
        reasonTypeNo: 'MTY-ROAD',
        active: true
      }
    ]
  }
}

/** The channels on offer; « none » is always possible, since no channel is imposed. */
export function offeredChannels(channels: ChannelSettings): ('none' | OfferedChannel)[] {
  return ['none', ...CHANNEL_KEYS.filter((key) => channels[key])]
}

export type IncidentListIssue = 'nameRequired' | 'codeRequired' | 'codeTaken' | 'unknownReasonType'

/** What makes a set of incident lists unusable; empty when it can be saved. */
export function incidentListIssues(lists: IncidentSettings): IncidentListIssue[] {
  const issues = new Set<IncidentListIssue>()
  for (const list of INCIDENT_LISTS) {
    const seen = new Set<string>()
    for (const item of lists[list]) {
      if (!item.no.trim()) issues.add('codeRequired')
      if (!item.name.trim()) issues.add('nameRequired')
      if (seen.has(item.no)) issues.add('codeTaken')
      seen.add(item.no)
    }
  }
  const types = new Set(lists.reasonTypes.map((item) => item.no))
  if (lists.reasonCodes.some((item) => !types.has(item.reasonTypeNo))) {
    issues.add('unknownReasonType')
  }
  return [...issues]
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
