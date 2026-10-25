import type { ImportReport, ImportResult } from '@/core/utils/csvImport'
import type { MockDatabase } from '../db/database'
import { COMMON_MESSAGES, localize } from '../i18n'
import { MockHttpError, unprocessable } from './errors'
import type { MockRequest } from './types'

const MAX_IMPORT_ROWS = 1000

const normalizePlate = (plate: string) => plate.replace(/\s+/g, '').toUpperCase()

/** Finds a vehicle by its plate as typed in a file, spaces and case aside. */
export function vehicleByPlate(db: MockDatabase): (plate: string) => string {
  const byPlate = new Map(
    db.vehicles.all().map((vehicle) => [normalizePlate(vehicle.plate), vehicle.no])
  )
  return (plate) => {
    const vehicleNo = byPlate.get(normalizePlate(plate))
    if (!vehicleNo) throw unprocessable(COMMON_MESSAGES.importUnknownPlate, { plate })
    return vehicleNo
  }
}

/**
 * Builds each line through the same rules as a manual entry; a refused line is reported with its reason
 * and does not stop the others.
 */
export function importRows(
  rows: unknown,
  request: MockRequest,
  build: (input: Record<string, unknown>) => string
): ImportReport {
  if (!Array.isArray(rows) || rows.length === 0) throw unprocessable(COMMON_MESSAGES.importEmpty)
  if (rows.length > MAX_IMPORT_ROWS) {
    throw unprocessable(COMMON_MESSAGES.importTooLarge, { max: MAX_IMPORT_ROWS })
  }
  const results: ImportResult[] = rows.map((row: unknown, index) => {
    const line = index + 1
    const input = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>
    try {
      return { line, no: build(input), error: null }
    } catch (error) {
      if (!(error instanceof MockHttpError)) throw error
      return { line, no: null, error: localize(request.language, error.text, error.params) }
    }
  })
  return {
    created: results.filter((result) => result.no).length,
    rejected: results.filter((result) => result.error).length,
    results
  }
}
