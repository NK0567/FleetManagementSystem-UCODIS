import { lineOutOfTour } from '@/modules/planning/customer-confirmations/domain/confirmation'
import { receptionAttested } from '@/modules/planning/reception/domain/reception'
import type { FreightPayer } from '@/modules/planning/planning-settings/domain/planningSettings'
import type { TariffAmount } from '@/modules/planning/transport-tariffs/domain/transportTariff'

export type BillIssue =
  | 'not_delivered'
  | 'internal'
  | 'reception'
  | 'gap'
  | 'contestation'
  | 'tariff'

export interface BillLine {
  declaredAt: string | null
  unavailableAt: string | null
  replannedAt: string | null
  nonconformityAt: string | null
  returnedAt: string | null
  receptionConfirmedAt: string | null
  receptionContestedAt: string | null
  contestHandledAt: string | null
  quantityGap: number | null
  gapQualification: 'gain' | 'loss' | null
}

/** Who is invoiced. An internal department that pays the freight is not invoiced. */
export function billedCustomer(line: {
  freightPayer: FreightPayer
  ordererNo: string | null
  ordererInternal: boolean
  recipientNo: string
  recipientInternal: boolean
}): string | 'internal' {
  if (line.freightPayer === 'orderer') {
    if (!line.ordererNo || line.ordererInternal) return 'internal'
    return line.ordererNo
  }
  if (line.recipientInternal) return 'internal'
  return line.recipientNo
}

export function billIssue(
  line: BillLine,
  today: string,
  tacitDays: number | null,
  tariff: TariffAmount | null
): BillIssue | null {
  if (!line.declaredAt || lineOutOfTour(line)) return 'not_delivered'
  if (line.receptionContestedAt && !line.contestHandledAt) return 'contestation'
  if (!line.receptionContestedAt && !receptionAttested(line, today, tacitDays)) return 'reception'
  if (line.quantityGap !== null && line.quantityGap !== 0 && !line.gapQualification) return 'gap'
  if (!tariff) return 'tariff'
  return null
}

export interface FlatPart {
  key: string
  /** Share already frozen on an issued invoice. */
  invoicedShare: number | null
}

/**
 * A flat rate is charged once for the expedition and split across the customer's
 * deliveries still to invoice. The last open delivery takes the remainder.
 */
export function flatShare(total: number, parts: readonly FlatPart[], key: string): number {
  const already = parts.reduce((sum, part) => sum + (part.invoicedShare ?? 0), 0)
  const open = parts.filter((part) => part.invoicedShare === null)
  const share = open.length ? Math.round((total - already) / open.length) : 0
  const last = open[open.length - 1]?.key === key
  const amount = last ? total - already - share * (open.length - 1) : share
  return Math.max(0, amount)
}

/** Net of the credit notes already recorded on the line. Never negative. */
export function netAmount(gross: number, credit: number): number {
  return Math.max(0, Math.round(gross) - Math.round(credit))
}
