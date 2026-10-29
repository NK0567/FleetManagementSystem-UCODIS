import { describe, expect, it } from 'vitest'
import { mapHeaders, missingColumns } from '@/core/utils/csvImport'
import {
  normalizeCardNumber,
  toTransactionRow,
  TRANSACTION_IMPORT_COLUMNS,
  TRANSACTION_REQUIRED
} from './transactionImport'

describe('transaction import', () => {
  it('reads a statement line written in French', () => {
    const mapping = mapHeaders(TRANSACTION_IMPORT_COLUMNS, [
      'Numéro carte',
      'Date',
      'Station',
      'Ville',
      'Litres',
      'Montant'
    ])
    expect(missingColumns(mapping, TRANSACTION_REQUIRED)).toEqual([])
    expect(
      toTransactionRow(
        {
          'Numéro carte': '7001 0001',
          Date: '03/09/2026 15:00',
          Station: 'Jovena',
          Ville: 'Antsirabe',
          Litres: '300',
          Montant: '1 650 000'
        },
        mapping
      )
    ).toMatchObject({ cardNumber: '7001 0001', liters: 300, amount: 1_650_000, city: 'Antsirabe' })
  })

  it('compares card numbers without their spaces', () => {
    expect(normalizeCardNumber('7001 0001 ab')).toBe('70010001AB')
  })
})
