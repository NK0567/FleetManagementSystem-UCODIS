import { describe, expect, it } from 'vitest'
import {
  getAppliedListFilters,
  isListFilterValueEmpty,
  serializeListFiltersParam,
  toApiListFilter
} from './listFilters'

describe('listFilters', () => {
  describe('isListFilterValueEmpty', () => {
    it('treats null, blank strings, NaN and empty arrays as empty', () => {
      expect(isListFilterValueEmpty(null)).toBe(true)
      expect(isListFilterValueEmpty(undefined)).toBe(true)
      expect(isListFilterValueEmpty('')).toBe(true)
      expect(isListFilterValueEmpty('  ')).toBe(true)
      expect(isListFilterValueEmpty([])).toBe(true)
      expect(isListFilterValueEmpty(Number.NaN)).toBe(true)
    })

    it('keeps scalars and non-empty arrays', () => {
      expect(isListFilterValueEmpty(0)).toBe(false)
      expect(isListFilterValueEmpty(false)).toBe(false)
      expect(isListFilterValueEmpty('x')).toBe(false)
      expect(isListFilterValueEmpty([1, 5])).toBe(false)
    })
  })

  describe('toApiListFilter', () => {
    it('omits the default equality operator', () => {
      expect(
        toApiListFilter({ field: 'city', valueType: 'string', value: 'Toamasina', operator: '=' })
      ).toEqual({ field: 'city', valueType: 'string', value: 'Toamasina' })
    })

    it('maps contains, starts with and ends with to LIKE with wildcards', () => {
      const filter = { field: 'name', valueType: 'string' as const, value: 'ra' }
      expect(toApiListFilter({ ...filter, operator: 'LIKE' })).toMatchObject({
        operator: 'LIKE',
        value: '%ra%'
      })
      expect(toApiListFilter({ ...filter, operator: 'STARTS' })).toMatchObject({
        operator: 'LIKE',
        value: 'ra%'
      })
      expect(toApiListFilter({ ...filter, operator: 'ENDS' })).toMatchObject({
        operator: 'LIKE',
        value: '%ra'
      })
    })

    it('forwards comparison operators', () => {
      expect(
        toApiListFilter({ field: 'days', valueType: 'number', value: 3, operator: '>=' })
      ).toEqual({ field: 'days', valueType: 'number', value: 3, operator: '>=' })
    })
  })

  describe('serializeListFiltersParam', () => {
    it('drops empty values and serializes the rest', () => {
      const json = serializeListFiltersParam([
        { field: 'status', valueType: 'string', value: ['pending', 'approved'] },
        { field: 'type', valueType: 'string', value: [] },
        { field: 'city', valueType: 'string', value: '' }
      ])
      expect(json).toBe(
        JSON.stringify([{ field: 'status', valueType: 'string', value: ['pending', 'approved'] }])
      )
    })

    it('returns undefined when nothing applies', () => {
      expect(
        serializeListFiltersParam([{ field: 'type', valueType: 'string', value: [] }])
      ).toBeUndefined()
      expect(serializeListFiltersParam('not an array')).toBeUndefined()
    })
  })

  it('getAppliedListFilters keeps only filters with a usable value', () => {
    expect(
      getAppliedListFilters([
        { field: 'a', valueType: 'number', value: [1] },
        { field: 'b', valueType: 'number', value: [] }
      ])
    ).toEqual([{ field: 'a', valueType: 'number', value: [1] }])
  })
})
