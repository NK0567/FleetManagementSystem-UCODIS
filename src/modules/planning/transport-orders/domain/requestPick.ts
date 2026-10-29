/** Orders picked for a transport order, each with the product lines taken (all by default). */
export type PickedLines = Record<string, number[]>

export interface PickableRequest {
  no: string
  lines: readonly { lineNo: number }[]
  fullDeliveryRequired: boolean
}

/** The lines left out of a picked order; empty when it is taken whole. */
export function leftOut(request: PickableRequest, picked: PickedLines): number[] {
  const kept = picked[request.no]
  if (!kept) return []
  return request.lines.map((line) => line.lineNo).filter((no) => !kept.includes(no))
}

/** A picked order that must leave whole but is only partly taken: warned, never blocked. */
export function partlyTaken(request: PickableRequest, picked: PickedLines): boolean {
  return request.fullDeliveryRequired && leftOut(request, picked).length > 0
}

/** What the server expects: whole orders by number, a part with the line numbers taken. */
export function toLineInputs(
  requests: readonly PickableRequest[],
  picked: readonly string[],
  lines: PickedLines
): { deliveryRequestNo: string; requestLineNos?: number[] }[] {
  return picked.map((no) => {
    const request = requests.find((item) => item.no === no)
    const kept = lines[no]
    return request && kept && leftOut(request, lines).length
      ? { deliveryRequestNo: no, requestLineNos: [...kept].sort((a, b) => a - b) }
      : { deliveryRequestNo: no }
  })
}
