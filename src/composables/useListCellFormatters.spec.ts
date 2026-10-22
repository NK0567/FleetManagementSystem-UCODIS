import { describe, expect, it } from 'vitest'
import {
  formatDateCell,
  formatDateTimeCell,
  formatDecimalCell,
  formatIntegerCell
} from './useListCellFormatters'
import { formatDate, formatNumber } from '@/utils/format'

describe('list cell formatters', () => {
  it('formats numbers with the active locale and keeps zero', () => {
    expect(formatIntegerCell(1234.7, {})).toBe(formatNumber(1235))
    expect(formatIntegerCell(0, {})).toBe('0')
    expect(formatDecimalCell('2.5', {})).toBe(formatNumber(2.5, 1))
  })

  it('shows a dash for empty or invalid numbers', () => {
    expect(formatIntegerCell(null, {})).toBe('—')
    expect(formatIntegerCell('', {})).toBe('—')
    expect(formatIntegerCell('abc', {})).toBe('—')
  })

  it('formats ISO dates and shows a dash otherwise', () => {
    expect(formatDateCell('2026-03-14', {})).toBe(formatDate('2026-03-14'))
    expect(formatDateCell(null, {})).toBe('—')
    expect(formatDateCell('not-a-date', {})).toBe('—')
    expect(formatDateTimeCell(undefined, {})).toBe('—')
  })
})
