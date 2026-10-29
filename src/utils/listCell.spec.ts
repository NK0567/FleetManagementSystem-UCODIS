import { describe, expect, it } from 'vitest'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { getListCellDisplay } from './listCellDisplay'
import { shouldRightAlignNumeric } from './listCellAlign'
import { formatDate } from './format'

const column = (override: Partial<TableColumn> = {}): TableColumn => ({
  sortKey: 'x',
  label: 'X',
  ...override
})

describe('getListCellDisplay', () => {
  it('lets the column formatter decide', () => {
    expect(getListCellDisplay('pending', {}, column({ formatter: (v) => `#${v}` }))).toBe(
      '#pending'
    )
  })

  it('shows a dash for empty values', () => {
    expect(getListCellDisplay(null, {}, column())).toBe('-')
    expect(getListCellDisplay('  ', {}, column())).toBe('-')
    expect(getListCellDisplay([], {}, column())).toBe('-')
  })

  it('formats ISO dates in the active language', () => {
    expect(getListCellDisplay('2026-09-04', {}, column())).toBe(formatDate('2026-09-04'))
  })

  it('joins arrays and stringifies other values', () => {
    expect(getListCellDisplay(['A', 'B'], {}, column())).toBe('A, B')
    expect(getListCellDisplay(12, {}, column())).toBe('12')
  })
})

describe('shouldRightAlignNumeric', () => {
  it('follows an explicit alignment', () => {
    expect(shouldRightAlignNumeric('x', column({ align: 'right' }))).toBe(true)
    expect(shouldRightAlignNumeric(5, column({ align: 'left' }))).toBe(false)
  })

  it('right-aligns numbers but never identifiers', () => {
    expect(shouldRightAlignNumeric(5, column({ sortKey: 'days' }))).toBe(true)
    expect(shouldRightAlignNumeric(5, column({ sortKey: 'employeeNo' }))).toBe(false)
    expect(shouldRightAlignNumeric('5', column({ sortKey: 'days' }))).toBe(false)
  })
})
