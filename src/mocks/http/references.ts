import type { Collection, MockRow } from '../db/collection'
import { COMMON_MESSAGES } from '../i18n'
import { badRequest } from './errors'
import { readString } from './input'

export function unknownReference(field: string) {
  return badRequest(
    COMMON_MESSAGES.unknownReference,
    { field },
    { errorCode: 'UNKNOWN_REFERENCE', errors: [field] }
  )
}

/** A required code that must point to an existing record. */
export function requireReference(
  collection: Collection<MockRow>,
  input: Record<string, unknown>,
  field: string
): string {
  const code = readString(input, field, { required: true })
  if (!collection.exists(code)) throw unknownReference(field)
  return code
}

export function optionalReference(
  collection: Collection<MockRow>,
  input: Record<string, unknown>,
  field: string
): string | null {
  const code = readString(input, field)
  if (!code) return null
  if (!collection.exists(code)) throw unknownReference(field)
  return code
}
