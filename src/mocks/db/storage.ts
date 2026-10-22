import { COMMON_MESSAGES } from '../i18n'
import { MockHttpError } from '../http/errors'

export const MOCK_STORAGE_PREFIX = 'fms-mock:v1:'

export interface StoredCollection<T> {
  seedVersion: number
  dayOffset: number
  rows: T[]
}

function isStoredCollection(value: unknown): value is StoredCollection<unknown> {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.seedVersion === 'number' &&
    typeof candidate.dayOffset === 'number' &&
    Array.isArray(candidate.rows)
  )
}

export function readStoredCollection<T>(name: string): StoredCollection<T> | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(MOCK_STORAGE_PREFIX + name) ?? 'null')
    return isStoredCollection(parsed) ? (parsed as StoredCollection<T>) : null
  } catch {
    return null
  }
}

/** A failed write is reported to the caller: silently losing a change is worse than an error. */
export function writeStoredCollection<T>(name: string, value: StoredCollection<T>): void {
  try {
    localStorage.setItem(MOCK_STORAGE_PREFIX + name, JSON.stringify(value))
  } catch {
    throw new MockHttpError(507, COMMON_MESSAGES.storageFull)
  }
}

export function clearStoredCollections(): void {
  const keys: string[] = []
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (key?.startsWith(MOCK_STORAGE_PREFIX)) keys.push(key)
  }
  for (const key of keys) localStorage.removeItem(key)
}
