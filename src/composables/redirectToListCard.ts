import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

/** Record URLs (/<entities>/<no>) open the list with the card on top, as everywhere else. */
export function redirectToListCard(
  route: RouteLocationNormalizedLoaded,
  router: Router,
  listPath: string
): void {
  const params = route.params as Record<string, string | string[] | undefined>
  const raw = params.id
  const no = String(Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '')).trim()
  void router.replace({ path: listPath, query: no ? { no } : undefined })
}
