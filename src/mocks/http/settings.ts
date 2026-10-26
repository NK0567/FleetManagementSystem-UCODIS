import type { SettingField, SettingFieldIssue } from '@/core/utils/settingFields'
import { COMMON_MESSAGES } from '../i18n'
import { unprocessable, type MockHttpError } from './errors'
import { invalidField } from './input'

/** A setting value from a request body; malformed values are refused, empty numbers become null. */
export function readSettingField(
  input: Record<string, unknown>,
  field: SettingField
): string | number | boolean | null {
  const raw = input[field.key]
  switch (field.kind) {
    case 'time':
    case 'text':
    case 'choice':
      if (raw != null && typeof raw !== 'string') throw invalidField(field.key)
      return (raw ?? '').trim()
    case 'boolean':
      if (typeof raw !== 'boolean') throw invalidField(field.key)
      return raw
  }
  if (raw == null || raw === '') return null
  const value = Number(raw)
  if (!Number.isFinite(value)) throw invalidField(field.key)
  return value
}

export function settingFieldError(issue: SettingFieldIssue): MockHttpError {
  switch (issue.code) {
    case 'required':
      return unprocessable(COMMON_MESSAGES.settingRequired, { field: issue.field })
    case 'outOfRange':
      return unprocessable(COMMON_MESSAGES.settingOutOfRange, {
        field: issue.field,
        min: issue.min,
        max: issue.max
      })
    case 'invalidTime':
      return unprocessable(COMMON_MESSAGES.settingInvalidTime, { field: issue.field })
    case 'tooLong':
      return unprocessable(COMMON_MESSAGES.settingTooLong, { field: issue.field, max: issue.max })
    case 'invalidChoice':
      return unprocessable(COMMON_MESSAGES.settingInvalidChoice, { field: issue.field })
  }
}
