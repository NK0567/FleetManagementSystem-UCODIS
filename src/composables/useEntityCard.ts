import { computed, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { applyCardInitialOpenMode, type CardOpenMode } from '@/composables/cardOpenMode'
import { signalCardBootstrapReady } from '@/composables/signalCardBootstrapReady'
import { useUnsavedChangesRouteGuard } from '@/composables/useUnsavedChangesRouteGuard'
import type { EntityFormExpose } from '@/composables/useEntityForm'

const SAVE_SUCCESS_MS = 3000

/** The part of a store built on useCrudState that a card relies on. */
export interface CardStore<T extends { no: string }> {
  readonly currentItem: T | null
  readonly currentItemLoading: boolean
  readonly currentItemError: string | null
  readonly items: T[]
  readonly pagination: { page: number; limit: number }
  getItemFromList: (no: string) => T | undefined
  setCurrentItem: (item: T | null) => void
  fetchItemById: (no: string, options?: { silent?: boolean }) => Promise<void>
  fetchItems: (page?: number, pageSize?: number) => Promise<void>
}

export interface UseEntityCardOptions<T extends { no: string }> {
  no: () => string
  store: CardStore<T>
  form: Ref<EntityFormExpose | null>
  update: (no: string, payload: Record<string, unknown>) => Promise<T>
  canUpdate: ComputedRef<boolean>
  /** Label of a record in the side list of the card. */
  label: (item: T) => string
  saveErrorFallback: string
  initialOpenMode?: () => CardOpenMode | undefined
  /** The record was just created: open it in edit mode with the success banner. */
  justCreated?: () => boolean
}

/**
 * State and actions of an entity card: loading from the list or the API, edit mode, saving only
 * the changed fields, previous and next record, and the unsaved changes guard.
 */
export function useEntityCard<T extends { no: string }>(options: UseEntityCardOptions<T>) {
  const { t } = useI18n()
  const { store, form } = options

  const item = computed(() => store.currentItem)
  const isLoading = computed(() => store.currentItemLoading)
  const errorMsg = computed(() => store.currentItemError)

  const isEditMode = ref(false)
  const isSaving = ref(false)
  const saveError = ref<string | null>(null)
  const saveSuccess = ref(false)
  const validationErrors = ref<string[]>([])

  const isFormDirty = computed(() => {
    if (!isEditMode.value || !form.value) return false
    return Object.keys(form.value.buildDiffPayload()).length > 0
  })
  useUnsavedChangesRouteGuard(isFormDirty)

  function flashSaveSuccess() {
    saveSuccess.value = true
    setTimeout(() => (saveSuccess.value = false), SAVE_SUCCESS_MS)
  }

  function clearFeedback() {
    saveError.value = null
    saveSuccess.value = false
    validationErrors.value = []
  }

  async function loadItem(no: string) {
    const fromList = store.getItemFromList(no)
    if (fromList) store.setCurrentItem(fromList)
    else await store.fetchItemById(no)
    signalCardBootstrapReady()
  }

  function enterEditMode() {
    if (!options.canUpdate.value) return
    clearFeedback()
    isEditMode.value = true
  }

  function cancelEdit() {
    form.value?.populateFromData(item.value ?? {})
    clearFeedback()
    isEditMode.value = false
  }

  async function saveItem() {
    if (!item.value || !form.value) return
    const validation = form.value.validateForEdit()
    if (!validation.valid) {
      validationErrors.value = validation.errors.map((error) => error.fieldKey)
      saveError.value = `${t('common.validationRequired')} : ${validation.errors
        .map((error) => error.label)
        .join(', ')}`
      return
    }
    validationErrors.value = []
    const payload = form.value.buildDiffPayload()
    if (Object.keys(payload).length === 0) return

    isSaving.value = true
    saveError.value = null
    try {
      const updated = await options.update(item.value.no, payload)
      store.setCurrentItem(updated)
      await store.fetchItems(store.pagination.page, store.pagination.limit)
      flashSaveSuccess()
    } catch (error) {
      saveError.value = apiErrorMessage(error, options.saveErrorFallback)
    } finally {
      isSaving.value = false
    }
  }

  const currentIndex = computed(() =>
    item.value ? store.items.findIndex((row) => row.no === item.value?.no) : -1
  )
  const hasPrev = computed(() => currentIndex.value > 0)
  const hasNext = computed(
    () => currentIndex.value >= 0 && currentIndex.value < store.items.length - 1
  )
  const sidebarItems = computed(() =>
    store.items.map((row) => ({ no: row.no, label: options.label(row) }))
  )

  /** Moving to another record keeps the mode but never drops unsaved changes silently. */
  async function goTo(no: string | undefined) {
    if (!no || no === item.value?.no) return
    if (isFormDirty.value && !window.confirm(t('common.unsavedChangesLeaveConfirm'))) return
    clearFeedback()
    await loadItem(no)
  }

  const goToPrev = () => goTo(store.items[currentIndex.value - 1]?.no)
  const goToNext = () => goTo(store.items[currentIndex.value + 1]?.no)

  onMounted(async () => {
    await loadItem(options.no())
    if (options.justCreated?.()) {
      isEditMode.value = options.canUpdate.value
      flashSaveSuccess()
      return
    }
    applyCardInitialOpenMode(options.initialOpenMode?.(), {
      isNew: false,
      isEditMode,
      enterEditMode,
      canEnterEdit: options.canUpdate.value
    })
  })

  return {
    item,
    isLoading,
    errorMsg,
    isEditMode,
    isSaving,
    saveError,
    saveSuccess,
    validationErrors,
    isFormDirty,
    hasPrev,
    hasNext,
    sidebarItems,
    enterEditMode,
    cancelEdit,
    saveItem,
    goTo,
    goToPrev,
    goToNext
  }
}
