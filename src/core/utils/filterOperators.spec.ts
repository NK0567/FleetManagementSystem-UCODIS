import { describe, expect, it } from 'vitest'
import {
  allowsMultipleFilters,
  defaultOperatorForKind,
  operatorWhenAddingFilter,
  operatorsForKind
} from './filterOperators'

describe('filterOperators', () => {
  it('offers no operator for multi-select option fields', () => {
    expect(operatorsForKind('option')).toEqual([])
    expect(defaultOperatorForKind('option')).toBeUndefined()
  })

  it('offers comparison operators for numbers and dates', () => {
    expect(operatorsForKind('number').map((option) => option.value)).toEqual([
      '=',
      '<>',
      '<',
      '<=',
      '>',
      '>='
    ])
    expect(defaultOperatorForKind('date')).toBe('=')
  })

  it('adds contains, starts with and ends with for text-like fields', () => {
    const operators = operatorsForKind('text').map((option) => option.value)
    expect(operators).toEqual(expect.arrayContaining(['LIKE', 'STARTS', 'ENDS']))
    expect(operatorsForKind('lookup').map((option) => option.value)).toContain('LIKE')
  })

  it('limits boolean fields to equality operators', () => {
    expect(operatorsForKind('boolean').map((option) => option.value)).toEqual(['=', '<>'])
  })

  it('allows several filters on the same field only for dates and numbers', () => {
    expect(allowsMultipleFilters('date')).toBe(true)
    expect(allowsMultipleFilters('number')).toBe(true)
    expect(allowsMultipleFilters('text')).toBe(false)
    expect(allowsMultipleFilters('option')).toBe(false)
  })

  it('suggests >= then <= to build a range', () => {
    expect(operatorWhenAddingFilter('date', [])).toBe('>=')
    expect(operatorWhenAddingFilter('date', ['>='])).toBe('<=')
    expect(operatorWhenAddingFilter('number', ['>'])).toBe('<=')
    expect(operatorWhenAddingFilter('date', ['<='])).toBe('>=')
    expect(operatorWhenAddingFilter('text', [])).toBe('=')
  })
})
