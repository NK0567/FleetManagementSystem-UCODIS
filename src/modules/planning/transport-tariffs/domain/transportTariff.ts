import { normalizeSearchText } from '@/utils/search'
import type { TariffBasis, TariffTarget } from '../types/transportTariff.types'

export interface TariffRule {
  no: string
  target: TariffTarget
  customerNo: string | null
  carrierNo: string | null
  basis: TariffBasis
  price: number
  routeTemplateNo: string | null
  family: string
  productNo: string | null
  active: boolean
}

/** What is priced: who, on which route or distance, how much of which product. */
export interface TariffedService {
  target: TariffTarget
  partyNo: string
  routeTemplateNo: string | null
  /** The route template's reference distance, never the distance driven. */
  distanceKm: number | null
  quantity: number | null
  weightKg: number | null
  productNo: string | null
  family: string | null
}

export interface TariffAmount {
  rule: TariffRule
  /** Kilometres, tonnes or units the price applies to; 1 for a flat rate. */
  base: number
  amount: number
}

export type TariffIssue = 'partyMissing' | 'routeNeeded'

export const partyOf = (rule: Pick<TariffRule, 'target' | 'customerNo' | 'carrierNo'>) =>
  rule.target === 'customer' ? rule.customerNo : rule.carrierNo

export function tariffIssues(rule: Omit<TariffRule, 'no'>): TariffIssue[] {
  const issues: TariffIssue[] = []
  if (!partyOf(rule)) issues.push('partyMissing')
  if (rule.basis === 'route_template' && !rule.routeTemplateNo) issues.push('routeNeeded')
  return issues
}

/** Two rules priced on the same party, basis, route and goods would compete. */
export function sameGrid(a: Omit<TariffRule, 'no'>, b: Omit<TariffRule, 'no'>): boolean {
  return (
    a.target === b.target &&
    partyOf(a) === partyOf(b) &&
    a.basis === b.basis &&
    a.routeTemplateNo === b.routeTemplateNo &&
    normalizeSearchText(a.family) === normalizeSearchText(b.family) &&
    a.productNo === b.productNo
  )
}

function baseOf(rule: TariffRule, service: TariffedService): number | null {
  switch (rule.basis) {
    case 'route_template':
      return rule.routeTemplateNo === service.routeTemplateNo ? 1 : null
    case 'distance':
      return service.distanceKm
    case 'weight':
      return service.weightKg == null ? null : service.weightKg / 1_000
    case 'quantity':
      return service.quantity
  }
}

// A product beats a family, a family beats all goods; at equal reach a flat route rate wins.
const precision = (rule: TariffRule) =>
  (rule.productNo ? 4 : rule.family ? 2 : 0) + (rule.basis === 'route_template' ? 1 : 0)

/** The most precise active rule that can price the service, with its amount; null when none can. */
export function applicableTariff(
  rules: readonly TariffRule[],
  service: TariffedService
): TariffAmount | null {
  const family = normalizeSearchText(service.family)
  const candidates = rules
    .filter(
      (rule) =>
        rule.active &&
        rule.target === service.target &&
        partyOf(rule) === service.partyNo &&
        (!rule.productNo || rule.productNo === service.productNo) &&
        (!rule.family || normalizeSearchText(rule.family) === family)
    )
    .map((rule) => ({ rule, base: baseOf(rule, service) }))
    .filter((candidate): candidate is { rule: TariffRule; base: number } => candidate.base != null)
    .sort((a, b) => precision(b.rule) - precision(a.rule) || a.rule.no.localeCompare(b.rule.no))
  const best = candidates[0]
  return best ? { ...best, amount: Math.round(best.base * best.rule.price) } : null
}
