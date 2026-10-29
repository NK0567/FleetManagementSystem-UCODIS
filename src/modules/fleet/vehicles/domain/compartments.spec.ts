import { describe, expect, it } from 'vitest'
import { allocate, compartmentsOf, familyAllowed, type CompartmentRules } from './compartments'

const tank = (no: number, volumeL: number, rules: Partial<CompartmentRules> = {}) => ({
  no,
  volumeL,
  families: ['Carburant'],
  content: 'one_product' as const,
  fullFill: false,
  ...rules
})
const line = (lineNo: number, productNo: string, volumeL: number | null, family = 'Carburant') => ({
  lineNo,
  productNo,
  productName: productNo,
  family,
  volumeL
})

describe('compartments', () => {
  it('treats a vehicle with no separation as one compartment open to everything', () => {
    expect(compartmentsOf([], 30000)).toEqual([
      { no: 1, volumeL: 30000, families: [], content: 'mixed', fullFill: false }
    ])
    expect(compartmentsOf([{ volumeL: 5000 }], null)[0]).toMatchObject({ content: 'mixed' })
  })

  it('never mixes two products in a one-product compartment', () => {
    const { uses, issues } = allocate(
      [tank(1, 10000), tank(2, 10000)],
      [line(1, 'SUPER', 6000), line(2, 'GAZOLE', 8000)]
    )
    expect(issues).toEqual([])
    expect(uses[0]?.lines.map((item) => item.productName)).toEqual(['GAZOLE'])
    expect(uses[1]?.lines.map((item) => item.productName)).toEqual(['SUPER'])
  })

  it('reports a line that finds no room, without refusing the others', () => {
    const { issues } = allocate([tank(1, 10000)], [line(1, 'SUPER', 6000), line(2, 'GAZOLE', 3000)])
    expect(issues).toEqual([{ code: 'noRoom', lineNo: 2, productName: 'GAZOLE' }])
  })

  it('spreads a large line over several compartments and flags one left part full', () => {
    const { uses, issues } = allocate(
      [tank(1, 10000, { fullFill: true }), tank(2, 10000, { fullFill: true })],
      [line(1, 'GAZOLE', 15000)]
    )
    expect(uses.map((item) => item.usedL)).toEqual([10000, 5000])
    expect(issues).toEqual([{ code: 'notFull', no: 2, usedL: 5000, volumeL: 10000 }])
  })

  it('looks for the combination that fits rather than the first that comes', async () => {
    // First come would split the gazole over 1 and 2 and leave the petrol without room.
    const { uses, issues } = allocate(
      [tank(1, 12000), tank(2, 10000), tank(3, 8000)],
      [line(1, 'GAZOLE', 18000), line(2, 'SUPER', 9000)]
    )
    expect(issues).toEqual([])
    // Each compartment holds one product, and every litre is on board.
    expect(uses.every((use) => new Set(use.lines.map((item) => item.productName)).size <= 1)).toBe(
      true
    )
    expect(uses.reduce((total, use) => total + use.usedL, 0)).toBe(27000)
  })

  it('keeps a compartment to its families', () => {
    const { issues } = allocate([tank(1, 10000)], [line(1, 'RIZ', 100, 'Alimentaire')])
    expect(issues).toHaveLength(1)
    expect(familyAllowed([], 'Alimentaire')).toBe(true)
    expect(familyAllowed(['Carburant'], 'Alimentaire')).toBe(false)
  })
})
