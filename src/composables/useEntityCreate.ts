import { ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import type { EntityFormExpose } from '@/composables/useEntityForm'

/** Validation and submission of a create modal hosting an entity form. */
export function useEntityCreate<T>(options: {
  form: Ref<EntityFormExpose | null>
  create: (payload: Record<string, unknown>) => Promise<T>
  createErrorFallback: string
  onCreated: (created: T) => void
}) {
  const { t } = useI18n()
  const isSaving = ref(false)
  const saveError = ref<string | null>(null)
  const validationErrors = ref<string[]>([])

  async function createItem() {
    const form = options.form.value
    if (!form || isSaving.value) return
    const validation = form.validateForCreation()
    if (!validation.valid) {
      validationErrors.value = validation.errors.map((error) => error.fieldKey)
      saveError.value = `${t('common.validationRequired')} : ${validation.errors
        .map((error) => error.label)
        .join(', ')}`
      return
    }
    validationErrors.value = []
    isSaving.value = true
    saveError.value = null
    try {
      options.onCreated(await options.create(form.buildFullPayload()))
    } catch (error) {
      saveError.value = apiErrorMessage(error, options.createErrorFallback)
    } finally {
      isSaving.value = false
    }
  }

  return { isSaving, saveError, validationErrors, createItem }
}
