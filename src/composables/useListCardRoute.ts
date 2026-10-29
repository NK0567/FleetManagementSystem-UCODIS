import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CARD_MODE_QUERY_KEY,
  parseCardOpenMode,
  type CardOpenMode
} from '@/composables/cardOpenMode'

export type { CardOpenMode }

export type UseListCardRouteOptions = {
  queryKey?: string
  modeQueryKey?: string
  onClose?: () => void
}

/** Keeps the card opened from a list in sync with ?no= and ?cardMode= in the route query. */
export function useListCardRoute(options: UseListCardRouteOptions = {}) {
  const route = useRoute()
  const router = useRouter()
  const queryKey = options.queryKey ?? 'no'
  const modeQueryKey = options.modeQueryKey ?? CARD_MODE_QUERY_KEY

  const cardNo = ref('')
  const showCard = ref(false)
  const cardOpenMode = ref<CardOpenMode>('view')

  function getQueryDocumentNo(): string {
    const value = route.query[queryKey]
    const raw = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
    return raw.trim()
  }

  function getQueryOpenMode(): CardOpenMode | undefined {
    return parseCardOpenMode(route.query[modeQueryKey])
  }

  function buildQuery(patch: Record<string, string | undefined>) {
    return { ...route.query, ...patch }
  }

  function openCard(documentNo: string, mode: CardOpenMode = 'view') {
    const trimmed = String(documentNo ?? '').trim()
    if (!trimmed) return
    cardNo.value = trimmed
    cardOpenMode.value = mode
    showCard.value = true
    void router.push({
      query: buildQuery({ [queryKey]: trimmed, [modeQueryKey]: mode })
    })
  }

  function openCreateCard() {
    cardNo.value = ''
    cardOpenMode.value = 'edit'
    showCard.value = true
    void router.replace({
      query: buildQuery({ [queryKey]: undefined, [modeQueryKey]: undefined })
    })
  }

  function closeCard() {
    const hadQueryDocument = !!getQueryDocumentNo()
    showCard.value = false
    cardNo.value = ''
    cardOpenMode.value = 'view'
    if (hadQueryDocument) {
      void router.push({
        query: buildQuery({ [queryKey]: undefined, [modeQueryKey]: undefined })
      })
    }
    options.onClose?.()
  }

  function syncFromRoute() {
    const queryNo = getQueryDocumentNo()
    const queryMode = getQueryOpenMode()
    if (queryNo) {
      cardNo.value = queryNo
      if (queryMode) cardOpenMode.value = queryMode
      showCard.value = true
      return
    }
    if (cardNo.value) {
      showCard.value = false
      cardNo.value = ''
      cardOpenMode.value = 'view'
    }
  }

  watch(() => route.query[queryKey], syncFromRoute)
  watch(() => route.query[modeQueryKey], syncFromRoute)

  return {
    cardNo,
    showCard,
    cardOpenMode,
    getQueryDocumentNo,
    getQueryOpenMode,
    openCard,
    openCreateCard,
    closeCard
  }
}
