/**
 * A setting edited on a settings page: a number within bounds, an optional number, or a time.
 * `unit` is a translation key suffix, read under the page's own prefix.
 */
export type SettingField<Unit extends string = string> =
  | { key: string; kind: 'number'; unit: Unit; min: number; max: number }
  | { key: string; kind: 'optionalNumber'; unit: Unit; min: number; max: number }
  | { key: string; kind: 'time' }

export type SettingFieldIssue =
  | { field: string; code: 'required' }
  | { field: string; code: 'outOfRange'; min: number; max: number }
  | { field: string; code: 'invalidTime' }

/** Minutes since midnight, or null when the text is not a valid HH:MM time. */
export function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}

export function settingFieldIssue(field: SettingField, value: unknown): SettingFieldIssue | null {
  if (field.kind === 'time') {
    const text = typeof value === 'string' ? value : ''
    return text && timeToMinutes(text) === null ? { field: field.key, code: 'invalidTime' } : null
  }
  if (value == null || value === '') {
    return field.kind === 'number' ? { field: field.key, code: 'required' } : null
  }
  const number = Number(value)
  if (!Number.isFinite(number) || number < field.min || number > field.max) {
    return { field: field.key, code: 'outOfRange', min: field.min, max: field.max }
  }
  return null
}

export function settingFieldIssues(
  fields: readonly SettingField[],
  values: Record<string, unknown>
): SettingFieldIssue[] {
  return fields
    .map((field) => settingFieldIssue(field, values[field.key]))
    .filter((issue): issue is SettingFieldIssue => issue !== null)
}
