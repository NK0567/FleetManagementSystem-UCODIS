import { describe, expect, it } from 'vitest'
import { mapHeaders, missingColumns, parseImportDateTime, parseImportNumber } from './csvImport'

describe('csv import', () => {
  it('maps French or English headers, with accents and spaces, and lists the missing ones', () => {
    const columns = { plate: ['immatriculation', 'plate'], doneOn: ['date'] } as const
    const mapping = mapHeaders(columns, ['Immatriculation', 'Autre'])
    expect([...mapping]).toEqual([['Immatriculation', 'plate']])
    expect(missingColumns(mapping, ['plate', 'doneOn'])).toEqual(['doneOn'])
  })

  it('turns French dates and decimal commas into what the server expects', () => {
    expect(parseImportDateTime('3/9/2026 7:05')).toBe('2026-09-03T07:05')
    expect(parseImportDateTime('2026-09-03 15:00')).toBe('2026-09-03T15:00')
    expect(parseImportDateTime('demain')).toBe('demain')
    expect(parseImportNumber('1 234,5')).toBe(1234.5)
    expect(parseImportNumber('')).toBeNull()
    expect(parseImportNumber('n/a')).toBe('n/a')
  })
})
