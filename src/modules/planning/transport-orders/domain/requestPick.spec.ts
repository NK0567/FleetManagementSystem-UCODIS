import { describe, expect, it } from 'vitest'
import { leftOut, partlyTaken, toLineInputs } from './requestPick'

const order = (no: string, count: number, fullDeliveryRequired = false) => ({
  no,
  lines: Array.from({ length: count }, (_, index) => ({ lineNo: index + 1 })),
  fullDeliveryRequired
})

describe('requestPick', () => {
  it('takes an order whole when no line is left out', () => {
    const requests = [order('A', 3)]
    expect(toLineInputs(requests, ['A'], { A: [1, 2, 3] })).toEqual([{ deliveryRequestNo: 'A' }])
    expect(toLineInputs(requests, ['A'], {})).toEqual([{ deliveryRequestNo: 'A' }])
  })

  it('sends the lines taken when part of an order is left out', () => {
    const requests = [order('A', 3)]
    expect(toLineInputs(requests, ['A'], { A: [3, 1] })).toEqual([
      { deliveryRequestNo: 'A', requestLineNos: [1, 3] }
    ])
    expect(leftOut(order('A', 3), { A: [3, 1] })).toEqual([2])
  })

  it('warns only for an order that must leave whole', () => {
    expect(partlyTaken(order('A', 2, true), { A: [1] })).toBe(true)
    expect(partlyTaken(order('A', 2, false), { A: [1] })).toBe(false)
    expect(partlyTaken(order('A', 2, true), { A: [1, 2] })).toBe(false)
  })
})
