import { isValidCalendarDateYmd } from '@/utils/calendarDate'
import { isValidCode } from '@/utils/code'
import { badRequest, requiredField } from './errors'

type Input = Record<string, unknown>

const INVALID_FIELD = {
  fr: 'La valeur du champ « {field} » est invalide.',
  en: 'The value of the "{field}" field is invalid.'
}

export function invalidField(field: string) {
  return badRequest(INVALID_FIELD, { field }, { errorCode: 'INVALID', errors: [field] })
}

export function has(input: Input, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(input, field)
}

export function readString(input: Input, field: string, options: { required?: boolean } = {}) {
  const raw = input[field]
  if (raw != null && typeof raw !== 'string') throw invalidField(field)
  const value = (raw ?? '').trim()
  if (options.required && !value) throw requiredField(field)
  return value
}

export function readNullableString(input: Input, field: string): string | null {
  return readString(input, field) || null
}

export function readNumber(
  input: Input,
  field: string,
  options: { required?: boolean; min?: number; max?: number } = {}
): number | null {
  const raw = input[field]
  if (raw == null || raw === '') {
    if (options.required) throw requiredField(field)
    return null
  }
  const value = Number(raw)
  if (
    !Number.isFinite(value) ||
    (options.min !== undefined && value < options.min) ||
    (options.max !== undefined && value > options.max)
  ) {
    throw invalidField(field)
  }
  return value
}

export function readBoolean(input: Input, field: string, fallback = false): boolean {
  const raw = input[field]
  if (raw == null) return fallback
  if (typeof raw !== 'boolean') throw invalidField(field)
  return raw
}

export function readEnum<T extends string>(
  input: Input,
  field: string,
  values: readonly T[],
  options: { required?: boolean } = {}
): T | null {
  const raw = input[field]
  if (raw == null || raw === '') {
    if (options.required) throw requiredField(field)
    return null
  }
  const match = values.find((value) => value === raw)
  if (!match) throw invalidField(field)
  return match
}

export function readDate(input: Input, field: string, options: { required?: boolean } = {}) {
  const value = readString(input, field, options)
  if (!value) return null
  if (!isValidCalendarDateYmd(value)) throw invalidField(field)
  return value
}

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/

/** A local date and time, "YYYY-MM-DDTHH:mm" or with seconds; returned with seconds. */
export function readDateTime(input: Input, field: string, options: { required?: boolean } = {}) {
  const value = readString(input, field, options)
  if (!value) return null
  if (!DATE_TIME.test(value) || !isValidCalendarDateYmd(value.slice(0, 10))) {
    throw invalidField(field)
  }
  return value.length === 16 ? `${value}:00` : value
}

/** Business codes are typed by users: upper case letters, digits and dashes only. */
export function readCode(input: Input, field = 'no'): string {
  const value = readString(input, field, { required: true })
  if (!isValidCode(value)) throw invalidField(field)
  return value.toUpperCase()
}

export type FieldReaders<T> = { [K in keyof T]: (input: Input) => T[K] }

/** Reads every field: used on creation, where missing required fields are errors. */
export function readAll<T>(input: Input, readers: FieldReaders<T>): T {
  const result = {} as T
  for (const field of Object.keys(readers) as (keyof T & string)[]) {
    result[field] = readers[field](input)
  }
  return result
}

/** Reads only the fields sent: used on update, where absent fields stay unchanged. */
export function readPatch<T>(input: Input, readers: FieldReaders<T>): Partial<T> {
  const patch: Partial<T> = {}
  for (const field of Object.keys(readers) as (keyof T & string)[]) {
    if (has(input, field)) patch[field] = readers[field](input)
  }
  return patch
}

export function readStringList(input: Input, field: string): string[] {
  const raw = input[field]
  if (raw == null) return []
  if (!Array.isArray(raw) || raw.some((item) => typeof item !== 'string')) {
    throw invalidField(field)
  }
  return raw.map((item: string) => item.trim()).filter(Boolean)
}
