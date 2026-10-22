import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'
import { useMenuPermissionsStore } from '@/stores/menuPermissions'
import { getSearchableEntities, type SearchableEntity } from '@/core/search/searchRegistry'
import { SEARCH_DEBOUNCE_MS } from '@/core/app/searchTiming'

export interface PageResult {
  type: 'page'
  labelKey: string
  to: string
  parentLabelKey?: string
}

export interface EntityResult {
  type: 'entity'
  entityKey: string
  id: string
  title: string
  subtitle?: string
  route: string
}

export type PaletteResult = PageResult | EntityResult

const ENTITY_RESULT_LIMIT = 5

// Shared by every caller: the palette is a single overlay opened from the top bar or Ctrl+K.
const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(0)
const isSearching = ref(false)
const selectedEntityKey = ref<string | null>(null)
const entityResults = ref<EntityResult[]>([])

function open() {
  isOpen.value = true
  query.value = ''
  activeIndex.value = 0
  entityResults.value = []
  selectedEntityKey.value = null
  isSearching.value = false
}

function close() {
  isOpen.value = false
}

function toggle() {
  if (isOpen.value) close()
  else open()
}

function onGlobalKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    toggle()
  }
}

let isShortcutRegistered = false

export function useCommandPalette() {
  const router = useRouter()
  const { t } = useI18n()
  const menuPermissionsStore = useMenuPermissionsStore()

  onMounted(() => {
    if (isShortcutRegistered) return
    window.addEventListener('keydown', onGlobalKeydown)
    isShortcutRegistered = true
  })

  const allPages = computed<PageResult[]>(() =>
    menuPermissionsStore.navMenus.flatMap((menu): PageResult[] =>
      menu.to
        ? [{ type: 'page', labelKey: menu.labelKey, to: menu.to }]
        : menu.subItems.map((item) => ({
            type: 'page',
            labelKey: item.labelKey,
            to: item.to,
            parentLabelKey: menu.labelKey
          }))
    )
  )

  const filteredPages = computed<PageResult[]>(() => {
    const search = query.value.toLowerCase().trim()
    if (!search) return allPages.value
    return allPages.value.filter((page) =>
      [page.labelKey, page.parentLabelKey]
        .filter((key): key is string => !!key)
        .some((key) => t(key).toLowerCase().includes(search))
    )
  })

  const searchableEntities = computed(() => getSearchableEntities())

  const activeEntity = computed<SearchableEntity | undefined>(() =>
    searchableEntities.value.find((entity) => entity.key === selectedEntityKey.value)
  )

  const searchEntities = useDebounceFn(async (search: string) => {
    const entity = activeEntity.value
    if (!entity || !search.trim()) {
      entityResults.value = []
      isSearching.value = false
      return
    }
    isSearching.value = true
    try {
      const hits = await entity.search(search, ENTITY_RESULT_LIMIT)
      entityResults.value = hits.map((hit) => ({
        type: 'entity',
        entityKey: entity.key,
        ...hit,
        route: entity.route(hit.id)
      }))
    } catch {
      entityResults.value = []
    } finally {
      isSearching.value = false
    }
  }, SEARCH_DEBOUNCE_MS)

  const allResults = computed<PaletteResult[]>(() => [
    ...(selectedEntityKey.value ? [] : filteredPages.value),
    ...entityResults.value
  ])

  function selectResult(result: PaletteResult) {
    void router.push(result.type === 'page' ? result.to : result.route)
    close()
  }

  function selectEntityTab(key: string) {
    selectedEntityKey.value = selectedEntityKey.value === key ? null : key
    entityResults.value = []
    activeIndex.value = 0
    if (selectedEntityKey.value && query.value.trim()) void searchEntities(query.value)
  }

  watch(query, (search) => {
    activeIndex.value = 0
    if (selectedEntityKey.value) void searchEntities(search)
  })

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      activeIndex.value = Math.min(activeIndex.value + 1, allResults.value.length - 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      activeIndex.value = Math.max(activeIndex.value - 1, 0)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const result = allResults.value[activeIndex.value]
      if (result) selectResult(result)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  return {
    isOpen,
    query,
    activeIndex,
    isSearching,
    selectedEntityKey,
    filteredPages,
    entityResults,
    allResults,
    searchableEntities,
    open,
    close,
    toggle,
    selectResult,
    selectEntityTab,
    onKeydown
  }
}
