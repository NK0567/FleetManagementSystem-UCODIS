import { computed, type ComputedRef } from 'vue'
import type { CardOpenMode } from '@/composables/cardOpenMode'

export type UseListToolbarCardActionsOptions = {
  selectedItem: ComputedRef<unknown>
  getItemNo: (item: unknown) => string
  canRead: ComputedRef<boolean>
  canUpdate: ComputedRef<boolean>
  hasCardForm?: boolean
  /** Business rule (status...) deciding whether the selected record can be edited. */
  isDocumentEditable?: ComputedRef<boolean>
  isDocumentEditableByNo?: (no: string) => boolean
  openCard: (no: string, mode: CardOpenMode) => void
}

/** View and Edit toolbar actions; opening from the list edits when allowed, else views. */
export function useListToolbarCardActions(options: UseListToolbarCardActionsOptions) {
  const hasCardForm = options.hasCardForm ?? true

  const selectedNo = computed(() => {
    const item = options.selectedItem.value
    if (!item) return ''
    return String(options.getItemNo(item) ?? '').trim()
  })

  const hasSelection = computed(() => !!selectedNo.value)

  const documentEditable = computed(() => options.isDocumentEditable?.value ?? true)

  const canViewSelected = computed(() => hasCardForm && hasSelection.value && options.canRead.value)

  const canEditSelected = computed(
    () => hasCardForm && hasSelection.value && options.canUpdate.value && documentEditable.value
  )

  function resolveOpenMode(no: string): CardOpenMode {
    const trimmed = String(no ?? '').trim()
    if (!trimmed) return 'view'
    const docEditable = options.isDocumentEditableByNo?.(trimmed) ?? documentEditable.value
    return options.canUpdate.value && docEditable ? 'edit' : 'view'
  }

  function openSelectedView() {
    if (!canViewSelected.value) return
    options.openCard(selectedNo.value, 'view')
  }

  function openSelectedEdit() {
    if (!canEditSelected.value) return
    options.openCard(selectedNo.value, 'edit')
  }

  function openFromList(no: string) {
    const trimmed = String(no ?? '').trim()
    if (!trimmed) return
    options.openCard(trimmed, resolveOpenMode(trimmed))
  }

  return {
    showCardActions: hasCardForm,
    canViewSelected,
    canEditSelected,
    openSelectedView,
    openSelectedEdit,
    openFromList
  }
}
