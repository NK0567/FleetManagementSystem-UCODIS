import type { Ref } from 'vue'

export type CardOpenMode = 'view' | 'edit'

export const CARD_MODE_QUERY_KEY = 'cardMode'

export function parseCardOpenMode(value: unknown): CardOpenMode | undefined {
  const raw = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
  if (raw === 'view' || raw === 'edit') return raw
  return undefined
}

export function applyCardInitialOpenMode(
  mode: CardOpenMode | undefined,
  ctx: {
    isNew: boolean
    isEditMode: Ref<boolean>
    enterEditMode: () => void
    canEnterEdit?: boolean
  }
): void {
  if (ctx.isNew || !mode) return
  if (mode === 'edit' && ctx.canEnterEdit !== false) {
    ctx.enterEditMode()
    return
  }
  if (mode === 'view') {
    ctx.isEditMode.value = false
  }
}
