import { describe, expect, it } from 'vitest'
import { buildOrgTree, descendantNos, filterOrgTree, wouldCreateCycle } from './orgTree'

const units = [
  { no: 'UCT', parentNo: null },
  { no: 'FLT', parentNo: 'UCT' },
  { no: 'CND', parentNo: 'FLT' },
  { no: 'MNT', parentNo: 'UCT' },
  { no: 'ORPHAN', parentNo: 'GONE' }
]

describe('orgTree', () => {
  it('nests units under their parent and keeps orphans as roots', () => {
    const tree = buildOrgTree(units)
    expect(tree.map((node) => node.unit.no)).toEqual(['UCT', 'ORPHAN'])
    expect(tree[0]?.children.map((node) => node.unit.no)).toEqual(['FLT', 'MNT'])
    expect(tree[0]?.children[0]?.children.map((node) => node.unit.no)).toEqual(['CND'])
  })

  it('lists every descendant of a unit', () => {
    expect(descendantNos(units, 'UCT')).toEqual(['FLT', 'CND', 'MNT'])
    expect(descendantNos(units, 'CND')).toEqual([])
  })

  it('detects a parent change that would create a loop', () => {
    expect(wouldCreateCycle(units, 'FLT', 'CND')).toBe(true)
    expect(wouldCreateCycle(units, 'FLT', 'FLT')).toBe(true)
    expect(wouldCreateCycle(units, 'CND', 'MNT')).toBe(false)
    expect(wouldCreateCycle(units, 'UCT', null)).toBe(false)
  })

  it('keeps the path to matching units when filtering the tree', () => {
    const tree = filterOrgTree(buildOrgTree(units), (unit) => unit.no === 'CND')
    expect(tree.map((node) => node.unit.no)).toEqual(['UCT'])
    expect(tree[0]?.children.map((node) => node.unit.no)).toEqual(['FLT'])
    expect(tree[0]?.children[0]?.children.map((node) => node.unit.no)).toEqual(['CND'])
    expect(filterOrgTree(buildOrgTree(units), () => false)).toEqual([])
  })
})
