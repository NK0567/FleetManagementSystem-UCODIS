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

describe('requestPick quantities (TRS01-US17)', () => {
  const request = {
    no: 'A',
    lines: [
      { lineNo: 1, quantity: 10 },
      { lineNo: 2, quantity: 5 }
    ],
    fullDeliveryRequired: true
  }

  it('sends a reduced quantity and warns on a full delivery', () => {
    expect(toLineInputs([request], ['A'], {}, { A: { 1: 4 } })).toEqual([
      { deliveryRequestNo: 'A', lineQuantities: { 1: 4 } }
    ])
    expect(partlyTaken(request, {}, { A: { 1: 4 } })).toBe(true)
    // The whole quantity typed again is no reduction.
    expect(partlyTaken(request, {}, { A: { 1: 10 } })).toBe(false)
  })

  it('ignores a quantity on a line left out', () => {
    expect(toLineInputs([request], ['A'], { A: [2] }, { A: { 1: 4 } })).toEqual([
      { deliveryRequestNo: 'A', requestLineNos: [2] }
    ])
  })
})
