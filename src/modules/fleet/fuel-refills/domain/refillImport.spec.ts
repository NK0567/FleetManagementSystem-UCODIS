import { describe, expect, it } from 'vitest'
import {
  mapHeaders,
  missingColumns,
  parseImportDateTime,
  parseImportNumber,
  toImportRow
} from './refillImport'

describe('mapHeaders', () => {
  it('reads French or English headers, with accents and spaces', () => {
    const mapping = mapHeaders([
      'Immatriculation',
      'Date',
      'Litres',
      'Prix litre',
      'Kilométrage',
      'Note'
    ])
    expect([...mapping.values()]).toEqual([
      'plate',
      'refueledAt',
      'liters',
      'unitPrice',
      'odometerKm'
    ])
    expect(missingColumns(mapping)).toEqual([])
    expect(missingColumns(mapHeaders(['plate', 'date']))).toEqual([
      'liters',
      'unitPrice',
      'odometerKm'
    ])
  })
})

describe('parsing', () => {
  it('turns French dates and decimal commas into what the server expects', () => {
    expect(parseImportDateTime('3/9/2026 7:05')).toBe('2026-09-03T07:05')
    expect(parseImportDateTime('2026-09-03 15:00')).toBe('2026-09-03T15:00')
    expect(parseImportDateTime('demain')).toBe('demain')
    expect(parseImportNumber('1 234,5')).toBe(1234.5)
    expect(parseImportNumber('')).toBeNull()
    expect(parseImportNumber('n/a')).toBe('n/a')
  })

  it('builds a row from a line of the file', () => {
    const mapping = mapHeaders([
      'plaque',
      'date',
      'litres',
      'prix_litre',
      'compteur',
      'plein_complet'
    ])
    expect(
      toImportRow(
        {
          plaque: ' 4023 TBA ',
          date: '03/09/2026 15:00',
          litres: '300',
          prix_litre: '5 500',
          compteur: '201000',
          plein_complet: 'non'
        },
        mapping
      )
    ).toEqual({
      plate: '4023 TBA',
      refueledAt: '2026-09-03T15:00',
      liters: 300,
      unitPrice: 5500,
      odometerKm: 201000,
      fullTank: false
    })
  })
})
