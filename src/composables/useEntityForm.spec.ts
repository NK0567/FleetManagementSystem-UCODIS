import { computed, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useEntityForm } from './useEntityForm'

function setup(initial: Record<string, unknown> = {}) {
  const initialData = ref<Record<string, unknown>>(initial)
  const form = useEntityForm({
    initialData,
    empty: () => ({ no: '', name: '', days: 0, tags: [] as string[] }),
    createOnly: ['no'],
    required: ['no', 'name'],
    labelOf: (field) => `label:${field}`,
    validate: (values) => (values.days > 60 ? [{ fieldKey: 'days', label: 'too many' }] : [])
  })
  return { initialData, ...form }
}

describe('useEntityForm', () => {
  it('fills the draft from the record and falls back on empty values', () => {
    const { draft } = setup({ no: 'CAT-A', name: 'Cadre' })
    expect({ ...draft }).toEqual({ no: 'CAT-A', name: 'Cadre', days: 0, tags: [] })
  })

  it('sends only the changed fields on edit, never the create-only ones', () => {
    const { draft, expose } = setup({ no: 'CAT-A', name: 'Cadre', days: 30, tags: ['a'] })
    draft.no = 'OTHER'
    draft.days = 28
    expect(expose.buildDiffPayload()).toEqual({ days: 28 })
    draft.tags.push('b')
    expect(expose.buildDiffPayload()).toEqual({ days: 28, tags: ['a', 'b'] })
  })

  it('keeps a dirty flag computed from the draft reactive', () => {
    const { draft, expose } = setup({ no: 'CAT-A', name: 'Cadre' })
    const dirty = computed(() => Object.keys(expose.buildDiffPayload()).length > 0)
    expect(dirty.value).toBe(false)
    draft.name = 'Cadre supérieur'
    expect(dirty.value).toBe(true)
  })

  it('reports missing required fields and business rules', () => {
    const { draft, expose } = setup()
    draft.days = 90
    const result = expose.validateForCreation()
    expect(result.valid).toBe(false)
    expect(result.errors.map((error) => error.fieldKey)).toEqual(['no', 'name', 'days'])
    expect(result.errors[0]?.label).toBe('label:no')
  })

  it('refills the draft when the record changes', async () => {
    const { initialData, draft } = setup({ no: 'CAT-A', name: 'Cadre' })
    draft.name = 'typed'
    initialData.value = { no: 'CAT-B', name: 'Maîtrise' }
    await nextTick()
    expect(draft.name).toBe('Maîtrise')
  })
})
