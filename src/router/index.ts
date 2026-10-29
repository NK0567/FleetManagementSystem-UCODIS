import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { AUTH_TOKEN_STORAGE_KEY } from '@/core/api/httpClient'
import { findFeatureForPath } from '@/core/navigation/featureRoutes'
import { HOME_PATH, resolveLandingPath } from '@/core/navigation/landing'
import { getNavMenus } from '@/core/navigation/moduleRegistry'
import { useMenuPermissionsStore } from '@/stores/menuPermissions'
import { useUserStore } from '@/stores/user'

export const LOGIN_PATH = '/login'
/** The recipient's tracking page opens from a link, without an account. */
export const TRACKING_PREFIX = '/suivi/'
const NOT_FOUND_ROUTE = '/[...path]'

// Hash history: the app is served from an IIS virtual directory without URL rewriting.
const router = createRouter({
  history: createWebHashHistory(),
  routes
})

/** A path can be opened when a page exists for it and its feature is readable. */
function canOpen(path: string): boolean {
  if (router.resolve(path).name === NOT_FOUND_ROUTE) return false
  const feature = findFeatureForPath(path)
  return !feature || useMenuPermissionsStore().can(feature)
}

export function landingPath(): string {
  return resolveLandingPath({
    preferred: useUserStore().user?.landingRoute,
    menus: getNavMenus(),
    canOpen
  })
}

router.beforeEach(async (to) => {
  if (to.path.startsWith(TRACKING_PREFIX)) return true
  if (!localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) {
    return to.path === LOGIN_PATH ? true : LOGIN_PATH
  }

  await useMenuPermissionsStore().ensureLoaded()

  if (to.path === LOGIN_PATH || to.path === HOME_PATH) {
    const landing = landingPath()
    return landing === to.path ? true : landing
  }
  if (!canOpen(to.path)) return HOME_PATH

  useUserStore().refreshProfile()
  return true
})

export default router
