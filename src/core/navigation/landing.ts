import type { NavMenuItem } from '@/core/navigation/moduleRegistry'

export const HOME_PATH = '/'

/**
 * Page to open after login or on "/": the user's preferred page when it can be opened, otherwise
 * the first page of the navigation, otherwise the home placeholder.
 */
export function resolveLandingPath(options: {
  preferred?: string
  menus: readonly NavMenuItem[]
  canOpen: (path: string) => boolean
}): string {
  const { preferred, menus, canOpen } = options
  if (preferred && preferred !== HOME_PATH && canOpen(preferred)) return preferred

  for (const menu of menus) {
    const candidates = menu.to ? [menu.to] : menu.subItems.map((item) => item.to)
    const first = candidates.find(canOpen)
    if (first) return first
  }
  return HOME_PATH
}
