import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  consumeLocaleReloadPending,
  hideBootstrapOverlay,
  readUrlDocumentNo,
  shouldBootstrapOnColdStart
} from '@/core/bootstrap/appBootstrap'

/** Keeps the start-up overlay until the list (and the deep-linked card, if any) is ready. */
export const useAppBootstrapStore = defineStore('appBootstrap', () => {
  const isColdStart = ref(shouldBootstrapOnColdStart())
  const active = ref(isColdStart.value)
  const hideList = ref(isColdStart.value && !!readUrlDocumentNo())
  const waitingForCard = ref(hideList.value)

  function armCardBootstrap(): void {
    if (!isColdStart.value) return
    hideList.value = true
    waitingForCard.value = true
    active.value = true
  }

  function cardReady(): void {
    if (!waitingForCard.value) return
    waitingForCard.value = false
    finishAppReady()
  }

  function finishAppReady(): void {
    if (waitingForCard.value) return
    active.value = false
    hideList.value = false
    isColdStart.value = false
    consumeLocaleReloadPending()
    hideBootstrapOverlay()
  }

  return {
    active,
    hideList,
    isColdStart,
    waitingForCard,
    armCardBootstrap,
    cardReady,
    finishAppReady
  }
})
