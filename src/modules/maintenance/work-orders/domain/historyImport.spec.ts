import { describe, expect, it } from 'vitest'
import { mapHeaders, missingColumns } from '@/core/utils/csvImport'
import { HISTORY_IMPORT_COLUMNS, HISTORY_REQUIRED, toHistoryRow } from './historyImport'

describe('history import', () => {
  it('reads a line written in French', () => {
    const mapping = mapHeaders(HISTORY_IMPORT_COLUMNS, [
      'Immatriculation',
      'Date',
      'Type',
      'Travaux réalisés',
      'Kilométrage',
      'Coût'
    ])
    expect(missingColumns(mapping, HISTORY_REQUIRED)).toEqual([])
    expect(
      toHistoryRow(
        {
          Immatriculation: '4021 TBA',
          Date: '12/03/2025',
          Type: 'Préventif',
          'Travaux réalisés': 'Vidange et filtres',
          Kilométrage: '120 500',
          Coût: '450 000'
        },
        mapping
      )
    ).toEqual({
      plate: '4021 TBA',
      doneOn: '2025-03-12',
      maintenanceType: 'preventive',
      workDone: 'Vidange et filtres',
      odometerKm: 120_500,
      cost: 450_000
    })
  })
})
