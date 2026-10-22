import { computed, nextTick, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

export type FormFieldSectionMap = Record<string, string>

export function useFormValidationUi(options: {
  validationErrors: MaybeRefOrGetter<string[] | undefined>
  expandedSections: Ref<Record<string, boolean>>
  fieldSections: FormFieldSectionMap
  fieldValues?: MaybeRefOrGetter<Record<string, unknown>>
}) {
  const dismissedErrors = ref(new Set<string>())

  const activeErrorKeys = computed(() => {
    const keys = toValue(options.validationErrors) ?? []
    return keys.filter((k) => !dismissedErrors.value.has(k))
  })

  function hasValidationError(fieldKey: string): boolean {
    return activeErrorKeys.value.includes(fieldKey)
  }

  function dismissFieldError(fieldKey: string) {
    if (
      !dismissedErrors.value.has(fieldKey) &&
      (toValue(options.validationErrors) ?? []).includes(fieldKey)
    ) {
      const next = new Set(dismissedErrors.value)
      next.add(fieldKey)
      dismissedErrors.value = next
    }
  }

  function openSectionsForErrors(keys: string[]) {
    const sectionsWithErrors = new Set<string>()
    for (const key of keys) {
      const section = options.fieldSections[key]
      if (section) sectionsWithErrors.add(section)
    }
    if (sectionsWithErrors.size === 0) return

    const next: Record<string, boolean> = { ...options.expandedSections.value }
    let changed = false
    for (const section of Object.keys(next)) {
      const shouldOpen = sectionsWithErrors.has(section)
      if (next[section] !== shouldOpen) {
        next[section] = shouldOpen
        changed = true
      }
    }
    for (const section of sectionsWithErrors) {
      if (!(section in next)) {
        next[section] = true
        changed = true
      }
    }
    if (changed) options.expandedSections.value = next
  }

  function scrollToFirstError(fieldKey: string | undefined) {
    if (typeof document === 'undefined') return
    const byField =
      fieldKey != null ? document.querySelector(`[data-field="${CSS.escape(fieldKey)}"]`) : null
    const el =
      (byField instanceof HTMLElement ? byField : null) ??
      (document.querySelector('.border-destructive') as HTMLElement | null)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  watch(
    () => [...(toValue(options.validationErrors) ?? [])],
    (keys) => {
      dismissedErrors.value = new Set()
      if (keys.length === 0) return
      openSectionsForErrors(keys)
      void nextTick(async () => {
        await nextTick()
        requestAnimationFrame(() => scrollToFirstError(keys[0]))
      })
    },
    { flush: 'post' }
  )

  if (options.fieldValues) {
    watch(
      () => toValue(options.fieldValues!),
      (curr, prev) => {
        if (!prev || activeErrorKeys.value.length === 0) return
        for (const key of activeErrorKeys.value) {
          if (!Object.prototype.hasOwnProperty.call(curr, key)) continue
          if (curr[key] !== prev[key]) dismissFieldError(key)
        }
      },
      { deep: false }
    )
  }

  return {
    hasValidationError,
    dismissFieldError,
    activeErrorKeys
  }
}
