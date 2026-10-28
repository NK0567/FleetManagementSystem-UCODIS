import { computed, nextTick } from 'vue'
import { useAppBootstrapStore } from '@/stores/appBootstrapStore'

/** Keeps a deep-linked list hidden behind the start-up overlay until its card is ready. */
export function useListPageBootstrap(getQueryNo: () => string) {
  const bootstrap = useAppBootstrapStore()
  const hideListContent = computed(() => bootstrap.hideList)

  function initCardBootstrapFromQuery(): string {
    const no = getQueryNo()
    if (no) bootstrap.armCardBootstrap()
    return no
  }

  async function finishListBootstrap(): Promise<void> {
    await nextTick()
    bootstrap.finishAppReady()
  }

  return {
    hideListContent,
    initCardBootstrapFromQuery,
    finishListBootstrap
  }
}
