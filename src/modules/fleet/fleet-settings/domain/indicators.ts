/**
 * The indicators the application measures. Their computation is fixed (its definition is in the
 * appendix of the settings page); the company sets their code, their label and their target.
 */
export const INDICATOR_KEYS = [
  'availabilityRate',
  'preventiveShare',
  'mtbf',
  'mttr',
  'costPerKm',
  'fuelConsumption',
  'documentCompliance',
  'driverScore'
] as const
export type IndicatorKey = (typeof INDICATOR_KEYS)[number]

export type IndicatorUnit = 'percent' | 'hours' | 'km' | 'amountPerKm' | 'l100' | 'points'
/** Whether the indicator is good above or below its target. */
export type IndicatorDirection = 'higher' | 'lower'

export interface IndicatorSetting {
  key: IndicatorKey
  code: string
  label: string
  target: number | null
}

export const INDICATOR_SPECS: Record<
  IndicatorKey,
  { unit: IndicatorUnit; direction: IndicatorDirection; min: number; max: number }
> = {
  availabilityRate: { unit: 'percent', direction: 'higher', min: 0, max: 100 },
  preventiveShare: { unit: 'percent', direction: 'higher', min: 0, max: 100 },
  mtbf: { unit: 'km', direction: 'higher', min: 0, max: 1_000_000 },
  mttr: { unit: 'hours', direction: 'lower', min: 0, max: 10_000 },
  costPerKm: { unit: 'amountPerKm', direction: 'lower', min: 0, max: 1_000_000 },
  fuelConsumption: { unit: 'l100', direction: 'lower', min: 0, max: 200 },
  documentCompliance: { unit: 'percent', direction: 'higher', min: 0, max: 100 },
  driverScore: { unit: 'points', direction: 'higher', min: 0, max: 100 }
}

export const DEFAULT_INDICATORS: IndicatorSetting[] = [
  { key: 'availabilityRate', code: 'TDISPO', label: 'Taux de disponibilité', target: 90 },
  { key: 'preventiveShare', code: 'PMPREV', label: 'Part de maintenance préventive', target: 60 },
  { key: 'mtbf', code: 'MTBF', label: 'Kilométrage moyen entre pannes', target: 20_000 },
  { key: 'mttr', code: 'MTTR', label: 'Temps moyen de réparation', target: 24 },
  { key: 'costPerKm', code: 'CKM', label: 'Coût au kilomètre', target: 450 },
  { key: 'fuelConsumption', code: 'CONSO', label: 'Consommation moyenne', target: 36 },
  { key: 'documentCompliance', code: 'CONFDOC', label: 'Conformité documentaire', target: 100 },
  { key: 'driverScore', code: 'SCORE', label: 'Score moyen de conduite', target: 80 }
]

export type IndicatorIssue =
  | { code: 'unknownIndicator'; key: string }
  | { code: 'missingIndicator'; key: string }
  | { code: 'codeRequired'; key: string }
  | { code: 'codeInvalid'; key: string }
  | { code: 'duplicateCode'; key: string }
  | { code: 'labelRequired'; key: string }
  | { code: 'targetOutOfRange'; key: string; min: number; max: number }

const CODE_PATTERN = /^[A-Z0-9_]{1,12}$/

/** What prevents the indicators from being saved; empty when they are valid. */
export function indicatorIssues(indicators: readonly IndicatorSetting[]): IndicatorIssue[] {
  const issues: IndicatorIssue[] = []
  const codes = new Set<string>()
  for (const indicator of indicators) {
    const spec = INDICATOR_SPECS[indicator.key as IndicatorKey]
    if (!spec) {
      issues.push({ code: 'unknownIndicator', key: indicator.key })
      continue
    }
    const code = indicator.code.trim().toUpperCase()
    if (!code) issues.push({ code: 'codeRequired', key: indicator.key })
    else if (!CODE_PATTERN.test(code)) issues.push({ code: 'codeInvalid', key: indicator.key })
    else if (codes.has(code)) issues.push({ code: 'duplicateCode', key: indicator.key })
    codes.add(code)
    if (!indicator.label.trim()) issues.push({ code: 'labelRequired', key: indicator.key })
    if (
      indicator.target !== null &&
      (!Number.isFinite(indicator.target) ||
        indicator.target < spec.min ||
        indicator.target > spec.max)
    ) {
      issues.push({ code: 'targetOutOfRange', key: indicator.key, min: spec.min, max: spec.max })
    }
  }
  for (const key of INDICATOR_KEYS) {
    if (!indicators.some((indicator) => indicator.key === key)) {
      issues.push({ code: 'missingIndicator', key })
    }
  }
  return issues
}
