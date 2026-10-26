import type { ToleranceUnit } from '../types/quantityTolerance.types'

export interface ToleranceRule {
  no: string
  customerNo: string | null
  productNo: string | null
  value: number
  unit: ToleranceUnit
}

export type ToleranceSource = 'customer_product' | 'customer' | 'product' | 'company'

export type ToleranceIssue = 'percentAbove100' | 'quantityNeedsProduct'

export function toleranceIssues(rule: Omit<ToleranceRule, 'no'>): ToleranceIssue[] {
  const issues: ToleranceIssue[] = []
  if (rule.unit === 'percent' && rule.value > 100) issues.push('percentAbove100')
  // A quantity is counted in the unit of one product.
  if (rule.unit === 'quantity' && !rule.productNo) issues.push('quantityNeedsProduct')
  return issues
}

export const isCompanyTolerance = (rule: Pick<ToleranceRule, 'customerNo' | 'productNo'>) =>
  !rule.customerNo && !rule.productNo

/** The most precise rule wins: customer and product, then customer, then product, then company. */
export function applicableTolerance(
  rules: readonly ToleranceRule[],
  customerNo: string | null,
  productNo: string | null
): { rule: ToleranceRule; source: ToleranceSource } | null {
  const find = (customer: string | null, product: string | null) =>
    rules.find((rule) => rule.customerNo === customer && rule.productNo === product)
  const candidates: [ToleranceRule | undefined, ToleranceSource][] = [
    [customerNo && productNo ? find(customerNo, productNo) : undefined, 'customer_product'],
    [customerNo ? find(customerNo, null) : undefined, 'customer'],
    [productNo ? find(null, productNo) : undefined, 'product'],
    [find(null, null), 'company']
  ]
  for (const [rule, source] of candidates) if (rule) return { rule, source }
  return null
}

/** Received minus loaded, and whether the gap falls outside the rule. */
export function quantityGap(rule: ToleranceRule, loaded: number, received: number) {
  const gap = received - loaded
  let measure = Math.abs(gap)
  if (rule.unit === 'percent') {
    measure = loaded > 0 ? (measure / loaded) * 100 : measure === 0 ? 0 : Infinity
  }
  return { gap, outside: measure > rule.value }
}
