import { reactive, toValue, watch, type MaybeRefOrGetter, type UnwrapRef } from 'vue'

export interface FormValidationError {
  fieldKey: string
  label: string
}

export interface FormValidationResult {
  valid: boolean
  errors: FormValidationError[]
}

/** What a card or a create modal expects from the form component it hosts. */
export interface EntityFormExpose {
  buildFullPayload: () => Record<string, unknown>
  buildDiffPayload: () => Record<string, unknown>
  populateFromData: (data: object) => void
  validateForCreation: () => FormValidationResult
  validateForEdit: () => FormValidationResult
}

type FieldKey<Draft> = keyof Draft & string

export interface UseEntityFormOptions<Draft extends Record<string, unknown>> {
  initialData: MaybeRefOrGetter<object>
  /** Values of an empty form; also lists every editable field. */
  empty: () => Draft
  /** Fields sent on creation only, such as the code. */
  createOnly?: readonly FieldKey<Draft>[]
  required: MaybeRefOrGetter<readonly FieldKey<Draft>[]>
  labelOf: (field: FieldKey<Draft>) => string
  /** Business rules beyond required fields, shared by creation and edit. */
  validate?: (draft: Draft) => FormValidationError[]
}

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a) === JSON.stringify(b)
  return (a ?? '') === (b ?? '')
}

/**
 * Draft of an entity form: filled from the record, compared with it to send only what changed,
 * and checked before saving. The form component exposes the returned API with defineExpose.
 */
export function useEntityForm<Draft extends Record<string, unknown>>(
  options: UseEntityFormOptions<Draft>
) {
  const draft = reactive(options.empty()) as UnwrapRef<Draft> & Draft
  const fields = Object.keys(options.empty()) as FieldKey<Draft>[]
  const createOnly = new Set<string>(options.createOnly ?? [])

  function populateFromData(data: object) {
    const source = data as Record<string, unknown>
    const empty = options.empty()
    for (const field of fields) {
      const value = source[field] ?? empty[field]
      ;(draft as Record<string, unknown>)[field] = Array.isArray(value) ? [...value] : value
    }
  }

  /** Reads through the proxy so that computed values depending on the draft stay reactive. */
  function snapshot(): Draft {
    const values: Record<string, unknown> = {}
    for (const field of fields) {
      const value: unknown = draft[field]
      values[field] = Array.isArray(value) ? [...(value as unknown[])] : value
    }
    return values as Draft
  }

  function buildFullPayload(): Record<string, unknown> {
    return snapshot()
  }

  /** Compared as the draft was filled, so a field missing from the record is not a change. */
  function buildDiffPayload(): Record<string, unknown> {
    const original = toValue(options.initialData) as Record<string, unknown>
    const empty = options.empty()
    const current = snapshot()
    const diff: Record<string, unknown> = {}
    for (const field of fields) {
      if (createOnly.has(field)) continue
      if (!sameValue(current[field], original[field] ?? empty[field])) {
        diff[field] = current[field]
      }
    }
    return diff
  }

  function validate(): FormValidationResult {
    const current = snapshot()
    const errors: FormValidationError[] = toValue(options.required)
      .filter((field) => isEmptyValue(current[field]))
      .map((field) => ({ fieldKey: field, label: options.labelOf(field) }))
    errors.push(...(options.validate?.(current) ?? []))
    return { valid: errors.length === 0, errors }
  }

  function isRequired(field: FieldKey<Draft>): boolean {
    return toValue(options.required).includes(field)
  }

  watch(() => toValue(options.initialData), populateFromData, { immediate: true, deep: true })

  const expose: EntityFormExpose = {
    buildFullPayload,
    buildDiffPayload,
    populateFromData,
    validateForCreation: validate,
    validateForEdit: validate
  }

  return { draft, isRequired, expose }
}
