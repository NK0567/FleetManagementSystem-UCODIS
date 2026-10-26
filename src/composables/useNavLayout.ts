import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { NavMenuItem } from '@/core/navigation/moduleRegistry'
import { useMenuPermissionsStore } from '@/stores/menuPermissions'

export type NavLayoutMode = 'topbar' | 'sidebar'

const STORAGE_KEY = 'fms:nav-layout'

function storedMode(): NavLayoutMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'sidebar' ? 'sidebar' : 'topbar'
  } catch {
    return 'topbar'
  }
}

const mode = ref<NavLayoutMode>(storedMode())

function normalizePath(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

export function useNavLayout() {
  const route = useRoute()
  const router = useRouter()
  const menuPermissionsStore = useMenuPermissionsStore()

  const menus = computed<NavMenuItem[]>(() => menuPermissionsStore.navMenus)

  function isRouteMatch(to?: string): boolean {
    if (!to) return false
    const current = normalizePath(route.path)
    const target = normalizePath(to)
    return current === target || current.startsWith(`${target}/`)
  }

  function isMenuActive(menu: NavMenuItem): boolean {
    if (menu.to && isRouteMatch(menu.to)) return true
    return menu.subItems.some((item) => isRouteMatch(item.to))
  }

  const currentMenu = computed<NavMenuItem | null>(
    () => menus.value.find(isMenuActive) ?? menus.value[0] ?? null
  )

  /** Among sibling entries, only the closest match is active (`/a/b` wins over `/a`). */
  function isSubItemActive(to: string): boolean {
    if (!isRouteMatch(to)) return false
    return !currentMenu.value?.subItems.some(
      (item) => item.to.length > to.length && isRouteMatch(item.to)
    )
  }

  function pickMenu(menu: NavMenuItem) {
    const target = menu.to ?? menu.subItems[0]?.to
    if (target) void router.push(target)
  }

  function toggleMode() {
    mode.value = mode.value === 'topbar' ? 'sidebar' : 'topbar'
    try {
      localStorage.setItem(STORAGE_KEY, mode.value)
    } catch {
      // The choice simply won't survive a reload.
    }
  }

  return {
    mode,
    menus,
    currentMenu,
    isMenuActive,
    isRouteMatch,
    isSubItemActive,
    pickMenu,
    toggleMode
  }
}
