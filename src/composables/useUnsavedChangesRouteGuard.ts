import { onMounted, onUnmounted, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave } from 'vue-router'

/**
 * Blocks SPA navigation and warns before closing or reloading the browser
 * when the form has unsaved changes.
 */
export function useUnsavedChangesRouteGuard(hasUnsaved: MaybeRefOrGetter<boolean>) {
  const { t } = useI18n()

  onBeforeRouteLeave(() => {
    if (!toValue(hasUnsaved)) return true
    return window.confirm(t('common.unsavedChangesLeaveConfirm'))
  })

  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (toValue(hasUnsaved)) {
      e.preventDefault()
    }
  }

  onMounted(() => {
    window.addEventListener('beforeunload', onBeforeUnload)
  })
  onUnmounted(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
  })
}
