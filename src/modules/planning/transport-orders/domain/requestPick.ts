/** Orders picked for a transport order, each with the product lines taken (all by default). */
export type PickedLines = Record<string, number[]>

/** A reduced quantity for some lines of a picked order (TRS01-US17); absent takes it whole. */
export type PickedQuantities = Record<string, Record<number, number>>

export interface PickableRequest {
  no: string
  lines: readonly { lineNo: number; quantity?: number }[]
  fullDeliveryRequired: boolean
}

type LineInput = {
  deliveryRequestNo: string
  requestLineNos?: number[]
  lineQuantities?: Record<number, number>
}

/** The lines left out of a picked order; empty when it is taken whole. */
export function leftOut(request: PickableRequest, picked: PickedLines): number[] {
  const kept = picked[request.no]
  if (!kept) return []
  return request.lines.map((line) => line.lineNo).filter((no) => !kept.includes(no))
}

/** The lines of a picked order taken with less than their quantity. */
export function reducedLines(
  request: PickableRequest,
  quantities: PickedQuantities = {}
): number[] {
  const asked = quantities[request.no] ?? {}
  return request.lines
    .filter((line) => {
      const quantity = asked[line.lineNo]
      return quantity !== undefined && line.quantity !== undefined && quantity < line.quantity
    })
    .map((line) => line.lineNo)
}

/**
 * A picked order that must leave whole but is only partly taken, by its lines or by a quantity:
 * warned, never blocked (TRS01-US17).
 */
export function partlyTaken(
  request: PickableRequest,
  picked: PickedLines,
  quantities: PickedQuantities = {}
): boolean {
  return (
    request.fullDeliveryRequired &&
    (leftOut(request, picked).length > 0 || reducedLines(request, quantities).length > 0)
  )
}

/** What the server expects: whole orders by number, a part with the lines and quantities taken. */
export function toLineInputs(
  requests: readonly PickableRequest[],
  picked: readonly string[],
  lines: PickedLines,
  quantities: PickedQuantities = {}
): LineInput[] {
  return picked.map((no) => {
    const request = requests.find((item) => item.no === no)
    const kept = lines[no]
    const input: LineInput =
      request && kept && leftOut(request, lines).length
        ? { deliveryRequestNo: no, requestLineNos: [...kept].sort((a, b) => a - b) }
        : { deliveryRequestNo: no }
    const taken = new Set(input.requestLineNos ?? request?.lines.map((line) => line.lineNo) ?? [])
    const reduced = request ? reducedLines(request, quantities) : []
    const lineQuantities = Object.fromEntries(
      reduced
        .filter((lineNo) => taken.has(lineNo))
        .map((lineNo) => [lineNo, quantities[no]![lineNo]!])
    )
    return Object.keys(lineQuantities).length ? { ...input, lineQuantities } : input
  })
}
