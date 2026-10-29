import { ref, watch, type Ref } from 'vue'
import type { ImportKind, ImportMapping } from '../domain/importMappings'
import { fleetSettingsService } from '../services/fleetSettingsService'

/**
 * The headings the administrator set for an import, read each time the import dialog opens; the
 * default column names apply when none could be read.
 */
export function useImportMapping(kind: ImportKind, open: () => boolean): Ref<ImportMapping | null> {
  const mapping = ref<ImportMapping | null>(null)
  watch(
    open,
    async (isOpen) => {
      if (!isOpen) return
      mapping.value = await fleetSettingsService.importMapping(kind).catch(() => null)
    },
    { immediate: true }
  )
  return mapping
}
