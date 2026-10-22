import { beforeEach, describe, expect, it } from 'vitest'
import { createCollection, type CollectionDefinition, type MockRow } from './collection'
import { MOCK_STORAGE_PREFIX, readStoredCollection } from './storage'
import { nextNo } from './numbering'
import { MockHttpError } from '../http/errors'

interface LeaveRow extends MockRow {
  startDate: string
  birthDate: string
  label: string
}

const audit = { createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '' }

const definition: CollectionDefinition<LeaveRow> = {
  name: 'test-leaves',
  seed: () => [
    { no: 'LR-0001', startDate: '2026-09-14', birthDate: '1990-01-01', label: 'A', ...audit }
  ],
  dateFields: ['startDate']
}

beforeEach(() => {
  localStorage.clear()
})

describe('createCollection', () => {
  it('seeds with the declared date fields moved to today', () => {
    const collection = createCollection(definition, { seedVersion: 1, dayOffset: 10 })

    expect(collection.find('LR-0001')).toMatchObject({
      startDate: '2026-09-24',
      birthDate: '1990-01-01'
    })
  })

  it('keeps user changes across reloads', () => {
    createCollection(definition, { seedVersion: 1, dayOffset: 0 }).update('LR-0001', { label: 'B' })

    const reloaded = createCollection(definition, { seedVersion: 1, dayOffset: 0 })
    expect(reloaded.find('LR-0001')?.label).toBe('B')
  })

  it('moves stored dates by the days elapsed since the last visit', () => {
    createCollection(definition, { seedVersion: 1, dayOffset: 0 }).update('LR-0001', { label: 'B' })

    const nextDay = createCollection(definition, { seedVersion: 1, dayOffset: 3 })
    expect(nextDay.find('LR-0001')).toMatchObject({ startDate: '2026-09-17', label: 'B' })
    expect(readStoredCollection('test-leaves')?.dayOffset).toBe(3)
  })

  it('reseeds when the seed version changes', () => {
    createCollection(definition, { seedVersion: 1, dayOffset: 0 }).update('LR-0001', { label: 'B' })

    expect(
      createCollection(definition, { seedVersion: 2, dayOffset: 0 }).find('LR-0001')?.label
    ).toBe('A')
  })

  it('reseeds when the stored value is corrupted', () => {
    localStorage.setItem(MOCK_STORAGE_PREFIX + 'test-leaves', '{not json')

    expect(createCollection(definition, { seedVersion: 1, dayOffset: 0 }).all()).toHaveLength(1)
  })

  it('returns copies so callers cannot change stored rows by accident', () => {
    const collection = createCollection(definition, { seedVersion: 1, dayOffset: 0 })
    const row = collection.findOrFail('LR-0001')
    row.label = 'changed'

    expect(collection.find('LR-0001')?.label).toBe('A')
  })

  it('throws a 404 for unknown records and supports insert and remove', () => {
    const collection = createCollection(definition, { seedVersion: 1, dayOffset: 0 })
    expect(() => collection.findOrFail('LR-9999')).toThrow(MockHttpError)

    collection.insert({ ...collection.findOrFail('LR-0001'), no: 'LR-0002' })
    collection.remove('LR-0001')
    expect(collection.all().map((row) => row.no)).toEqual(['LR-0002'])
    expect(() => collection.remove('LR-0001')).toThrow(MockHttpError)
  })
})

describe('nextNo', () => {
  it('continues the highest number of the series', () => {
    expect(nextNo(['LR-0002', 'LR-0010', 'XX-0099'], 'LR-', 4)).toBe('LR-0011')
    expect(nextNo([], 'UCT-', 3)).toBe('UCT-001')
  })
})
