import { lineOutOfTour } from '@/modules/planning/customer-confirmations/domain/confirmation'
import { receptionAttested } from '@/modules/planning/reception/domain/reception'
import { protestStatus, type ProtestNote } from '@/modules/planning/delivery-quality/domain/quality'

export const CLOSING_BLOCKS = [
  'not_delivered',
  'reception',
  'contestation',
  'protest',
  'gap',
  'document'
] as const
export type ClosingBlock = (typeof CLOSING_BLOCKS)[number]

export interface OrderDocument {
  kind: string
  fileNo: string
}

export interface OrderDebriefing {
  voucherNo: string
  loadedAt: string
  unloadedAt: string
  observations: string
  savedAt: string
  savedBy: string
}

export interface OrderDossier {
  closedAt: string | null
  closedBy: string | null
  documents: OrderDocument[]
  debriefing: OrderDebriefing | null
}

export function emptyDossier(): OrderDossier {
  return { closedAt: null, closedBy: null, documents: [], debriefing: null }
}

/** Kinds required before closing, from the settings text. A dash means none. */
export function requiredDocumentKinds(text: string): string[] {
  const kinds = text
    .split(',')
    .map((kind) => kind.trim().toLowerCase())
    .filter((kind) => kind !== '' && kind !== '-')
  return [...new Set(kinds)]
}

export interface ClosingLine {
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
  protests: readonly Pick<ProtestNote, 'issuedAt' | 'closedAt'>[]
}

/**
 * Every reason an order cannot be closed. The screen and the server read the same list.
 * A tacit confirmation counts: silence past the delay attests the reception.
 */
export function closingBlocks(order: {
  delivered: boolean
  lines: readonly ClosingLine[]
  today: string
  tacitDays: number | null
  documentKinds: readonly string[]
  requiredKinds: readonly string[]
}): ClosingBlock[] {
  const blocks: ClosingBlock[] = []
  if (!order.delivered) blocks.push('not_delivered')
  const present = new Set(order.documentKinds)
  let reception = false
  let contestation = false
  let protest = false
  let gap = false
  for (const line of order.lines) {
    const contested = line.receptionContestedAt !== null
    if (contested && !line.contestHandledAt) contestation = true
    else if (
      line.declaredAt &&
      !lineOutOfTour(line) &&
      !receptionAttested(line, order.today, order.tacitDays)
    ) {
      reception = true
    }
    if (line.protests.some((note) => protestStatus(note) !== 'closed')) protest = true
    if (line.quantityGap !== null && line.quantityGap !== 0 && !line.gapQualification) gap = true
  }
  if (reception) blocks.push('reception')
  if (contestation) blocks.push('contestation')
  if (protest) blocks.push('protest')
  if (gap) blocks.push('gap')
  if (order.requiredKinds.some((kind) => !present.has(kind))) blocks.push('document')
  return blocks
}

export interface DebriefingDraft {
  voucherNo: string
  loadedAt: string
  unloadedAt: string
  observations: string
}

export type DebriefingIssue = 'voucher' | 'vehicle' | 'dates'

/** The vehicle and the trailer are read from the trip. The gain or loss text is derived, never typed. */
export function debriefingIssue(draft: DebriefingDraft, vehicle: string): DebriefingIssue | null {
  if (!draft.voucherNo.trim()) return 'voucher'
  if (!vehicle.trim()) return 'vehicle'
  if (draft.loadedAt && draft.unloadedAt && draft.unloadedAt < draft.loadedAt) return 'dates'
  return null
}

export function gainLossText(
  lines: readonly { quantityGap: number | null; gapQualification: 'gain' | 'loss' | null }[]
): string {
  return lines
    .filter((line) => line.gapQualification && line.quantityGap)
    .map((line) => `${line.gapQualification} ${line.quantityGap}`)
    .join('; ')
}
