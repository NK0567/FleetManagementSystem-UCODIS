import { shiftIsoDate } from '@/utils/date'
import { notFound } from '../http/errors'
import { readStoredCollection, writeStoredCollection } from './storage'

export interface AuditFields {
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type MockRow = { no: string } & AuditFields

export interface CollectionDefinition<T extends MockRow> {
  name: string
  /** Rows written around the demo reference date. */
  seed: () => T[]
  /** Fields moved along with the calendar so the demo story stays current. */
  dateFields?: readonly (keyof T & string)[]
}

export interface CollectionContext {
  seedVersion: number
  /** Days between the demo reference date and today. */
  dayOffset: number
}

export interface Collection<T extends MockRow> {
  readonly name: string
  all(): T[]
  find(no: string): T | undefined
  findOrFail(no: string): T
  exists(no: string): boolean
  insert(row: T): T
  update(no: string, patch: Partial<T>): T
  remove(no: string): void
  reset(): void
}

function shiftDates<T extends MockRow>(rows: T[], fields: readonly string[], days: number): T[] {
  if (!days || fields.length === 0) return rows
  return rows.map((row) => {
    const shifted = { ...row } as Record<string, unknown>
    for (const field of fields) {
      const value = shifted[field]
      if (typeof value === 'string') shifted[field] = shiftIsoDate(value, days)
    }
    return shifted as T
  })
}

/**
 * In-memory table persisted to localStorage. A seed version change reseeds it; a new day moves
 * its declared date fields by the elapsed days, keeping the changes made by the user.
 */
export function createCollection<T extends MockRow>(
  definition: CollectionDefinition<T>,
  context: CollectionContext
): Collection<T> {
  const dateFields = definition.dateFields ?? []
  let rows: T[] = []

  function persist(): void {
    writeStoredCollection(definition.name, {
      seedVersion: context.seedVersion,
      dayOffset: context.dayOffset,
      rows
    })
  }

  function seed(): void {
    rows = shiftDates(definition.seed(), dateFields, context.dayOffset)
    persist()
  }

  const stored = readStoredCollection<T>(definition.name)
  if (!stored || stored.seedVersion !== context.seedVersion) {
    seed()
  } else {
    rows = stored.rows
    if (stored.dayOffset !== context.dayOffset) {
      rows = shiftDates(rows, dateFields, context.dayOffset - stored.dayOffset)
      persist()
    }
  }

  const copy = (row: T): T => structuredClone(row)

  return {
    name: definition.name,
    all: () => rows.map(copy),
    find(no) {
      const row = rows.find((candidate) => candidate.no === no)
      return row ? copy(row) : undefined
    },
    findOrFail(no) {
      const row = rows.find((candidate) => candidate.no === no)
      if (!row) throw notFound()
      return copy(row)
    },
    exists: (no) => rows.some((row) => row.no === no),
    insert(row) {
      rows = [...rows, copy(row)]
      persist()
      return copy(row)
    },
    update(no, patch) {
      const index = rows.findIndex((row) => row.no === no)
      const current = rows[index]
      if (!current) throw notFound()
      const next = { ...current, ...patch, no: current.no }
      rows = rows.map((row, position) => (position === index ? next : row))
      persist()
      return copy(next)
    },
    remove(no) {
      if (!rows.some((row) => row.no === no)) throw notFound()
      rows = rows.filter((row) => row.no !== no)
      persist()
    },
    reset: seed
  }
}
