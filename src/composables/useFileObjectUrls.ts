import { onBeforeUnmount, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { fileApi } from '@/core/api/fileApi'

/**
 * Object URLs of stored files, to show them in the page. Each URL holds the file in memory until
 * revoked: they are revoked when the list changes and when the component goes away.
 */
export function useFileObjectUrls(fileNos: MaybeRefOrGetter<readonly string[]>) {
  const urls = ref<Record<string, string>>({})

  function revokeAll() {
    for (const url of Object.values(urls.value)) URL.revokeObjectURL(url)
    urls.value = {}
  }

  watch(
    () => [...toValue(fileNos)],
    async (nos) => {
      revokeAll()
      const loaded: Record<string, string> = {}
      for (const no of nos) {
        try {
          loaded[no] = URL.createObjectURL((await fileApi.download(no)).data)
        } catch {
          // A missing file is shown without preview; the record still lists it.
        }
      }
      urls.value = loaded
    },
    { immediate: true }
  )

  onBeforeUnmount(revokeAll)
  return { urls }
}

/** Opens a stored file in a new tab; only PDF and images are ever stored, never HTML. */
export async function openStoredFile(no: string): Promise<void> {
  const url = URL.createObjectURL((await fileApi.download(no)).data)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
