import type { ProductCompatibilityKind } from '../types/productCompatibility.types'

export interface CompatibilityRule {
  kind: ProductCompatibilityKind
  productANo: string
  productBNo: string
  active: boolean
}

/** A "together" rule binds both orders of its pair; a succession rule only A then B. */
export function sameRule(a: CompatibilityRule, b: CompatibilityRule): boolean {
  if (a.kind !== b.kind) return false
  const forward = a.productANo === b.productANo && a.productBNo === b.productBNo
  const backward = a.productANo === b.productBNo && a.productBNo === b.productANo
  return a.kind === 'together' ? forward || backward : forward
}

/** Active rules that forbid some of these products in the same vehicle. */
export function forbiddenTogether(
  rules: readonly CompatibilityRule[],
  productNos: readonly string[]
): CompatibilityRule[] {
  const loaded = new Set(productNos)
  return rules.filter(
    (rule) =>
      rule.active &&
      rule.kind === 'together' &&
      loaded.has(rule.productANo) &&
      loaded.has(rule.productBNo)
  )
}

/** The rule that forbids loading `nextNo` where `previousNo` was, unless the compartment was cleaned. */
export function forbiddenSuccession(
  rules: readonly CompatibilityRule[],
  previousNo: string | null,
  nextNo: string,
  cleaned: boolean
): CompatibilityRule | null {
  if (!previousNo || cleaned) return null
  return (
    rules.find(
      (rule) =>
        rule.active &&
        rule.kind === 'succession' &&
        rule.productANo === previousNo &&
        rule.productBNo === nextNo
    ) ?? null
  )
}
