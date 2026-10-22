import { describe, expect, it } from 'vitest'
import { applyListQuery, compareValues, matchesFilter, parseFilters } from './listQuery'
import { MockHttpError } from './errors'

const rows = [
  { no: 'UCT-001', name: 'Faniry Rakotoarisoa', city: 'Antananarivo', days: 6, active: true },
  { no: 'UCT-002', name: 'Hery Andriamalala', city: 'Toamasina', days: 1, active: true },
  { no: 'UCT-010', name: 'Solofo Rakotomanga', city: null, days: 12, active: false },
  { no: 'UCT-004', name: 'Miora Randrianasolo', city: 'Antsirabe', days: 3, active: true }
]

describe('parseFilters', () => {
  it('accepts the serialized JSON array and empty values', () => {
    expect(parseFilters(JSON.stringify([{ field: 'a', valueType: 'string', value: 'x' }]))).toEqual(
      [{ field: 'a', valueType: 'string', value: 'x' }]
    )
    expect(parseFilters(undefined)).toEqual([])
  })

  it('rejects malformed filters with a 400', () => {
    expect(() => parseFilters('{oops')).toThrow(MockHttpError)
    expect(() => parseFilters(JSON.stringify([{ nope: 1 }]))).toThrow(MockHttpError)
  })
})

describe('matchesFilter', () => {
  const row = rows[0]!

  it('compares text without case or accents', () => {
    expect(matchesFilter(row, { field: 'city', valueType: 'string', value: 'ANTANANARIVO' })).toBe(
      true
    )
    expect(
      matchesFilter(
        { name: 'Équipe dépôt' },
        { field: 'name', valueType: 'string', value: 'equipe depot' }
      )
    ).toBe(true)
  })

  it('supports LIKE wildcards', () => {
    const filter = { field: 'name', valueType: 'string' as const, operator: 'LIKE' as const }
    expect(matchesFilter(row, { ...filter, value: 'Fan%' })).toBe(true)
    expect(matchesFilter(row, { ...filter, value: '%soa' })).toBe(true)
    expect(matchesFilter(row, { ...filter, value: '%rako%' })).toBe(true)
    expect(matchesFilter(row, { ...filter, value: 'rako%' })).toBe(false)
  })

  it('treats arrays as IN and supports negation', () => {
    expect(
      matchesFilter(row, {
        field: 'city',
        valueType: 'string',
        value: ['Toamasina', 'Antananarivo']
      })
    ).toBe(true)
    expect(
      matchesFilter(row, {
        field: 'city',
        valueType: 'string',
        value: ['Antananarivo'],
        operator: '<>'
      })
    ).toBe(false)
  })

  it('compares numbers and booleans by type', () => {
    expect(
      matchesFilter(row, { field: 'days', valueType: 'number', value: 5, operator: '>' })
    ).toBe(true)
    expect(
      matchesFilter(row, { field: 'days', valueType: 'number', value: '6', operator: '<=' })
    ).toBe(true)
    expect(matchesFilter(row, { field: 'active', valueType: 'boolean', value: 'true' })).toBe(true)
  })

  it('only lets <> match missing values', () => {
    const missing = rows[2]!
    expect(matchesFilter(missing, { field: 'city', valueType: 'string', value: 'Toamasina' })).toBe(
      false
    )
    expect(
      matchesFilter(missing, {
        field: 'city',
        valueType: 'string',
        value: 'Toamasina',
        operator: '<>'
      })
    ).toBe(true)
  })

  it('compares ISO dates in calendar order', () => {
    expect(
      matchesFilter(
        { startDate: '2026-09-14' },
        { field: 'startDate', valueType: 'date', value: '2026-09-01', operator: '>=' }
      )
    ).toBe(true)
  })
})

describe('compareValues', () => {
  it('sorts numbers numerically, text naturally and missing values last', () => {
    expect([10, 2, 1].sort(compareValues)).toEqual([1, 2, 10])
    expect(['UCT-010', 'UCT-002'].sort(compareValues)).toEqual(['UCT-002', 'UCT-010'])
    expect([null, 'b', 'a'].sort(compareValues)).toEqual(['a', 'b', null])
  })
})

describe('applyListQuery', () => {
  it('searches across the requested columns', () => {
    const result = applyListQuery(rows, { searchQuery: 'toam', searchColumns: 'no,name,city' })
    expect(result.items.map((row) => row.no)).toEqual(['UCT-002'])
  })

  it('falls back to the default search columns', () => {
    const result = applyListQuery(rows, { searchQuery: 'hery' }, { searchColumns: ['name'] })
    expect(result.items.map((row) => row.no)).toEqual(['UCT-002'])
  })

  it('applies filters, sort and paging together', () => {
    const result = applyListQuery(rows, {
      filters: JSON.stringify([{ field: 'active', valueType: 'boolean', value: true }]),
      sortBy: 'days',
      sortDirection: 'DESC',
      page: 2,
      pageSize: 2
    })
    expect(result.items.map((row) => row.no)).toEqual(['UCT-002'])
    expect(result.meta).toEqual({ total: 3, page: 2, limit: 2, totalPages: 2 })
  })

  it('returns an empty page beyond the last one', () => {
    const result = applyListQuery(rows, { page: 9, pageSize: 25 })
    expect(result.items).toEqual([])
    expect(result.meta.total).toBe(4)
  })
})
