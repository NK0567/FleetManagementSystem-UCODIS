import { getSavedLocale, type SupportedLocale } from '@/core/i18n'
import { BRAND_PRIMARY } from '@/core/theme/brandColors'

export const BOOTSTRAP_OVERLAY_ID = 'app-bootstrap-overlay'
const PENDING_LOCALE_RELOAD_KEY = 'app_pending_locale_reload'
const SPIN_STYLE_ID = 'app-bootstrap-spin-style'

// Shown before i18n exists, hence not in the locale files.
const BOOTSTRAP_MESSAGES: Record<SupportedLocale, string> = {
  fr: 'Préparation en cours…',
  en: 'Getting ready…'
}

export function getBootstrapMessage(locale: SupportedLocale = getSavedLocale()): string {
  return BOOTSTRAP_MESSAGES[locale]
}

/** Record number requested by a deep link; with hash history the query lives after the "#". */
export function readUrlDocumentNo(): string {
  const hash = window.location.hash
  const queryStart = hash.indexOf('?')
  const search = queryStart >= 0 ? hash.slice(queryStart) : window.location.search
  return String(new URLSearchParams(search).get('no') ?? '').trim()
}

export function markLocaleReloadPending(): void {
  sessionStorage.setItem(PENDING_LOCALE_RELOAD_KEY, '1')
}

export function consumeLocaleReloadPending(): boolean {
  const pending = sessionStorage.getItem(PENDING_LOCALE_RELOAD_KEY) === '1'
  if (pending) sessionStorage.removeItem(PENDING_LOCALE_RELOAD_KEY)
  return pending
}

/** True on the first paint after a language switch or when a deep link opens a card directly. */
export function shouldBootstrapOnColdStart(): boolean {
  return sessionStorage.getItem(PENDING_LOCALE_RELOAD_KEY) === '1' || !!readUrlDocumentNo()
}

export function showBootstrapOverlay(message = getBootstrapMessage()): void {
  if (document.getElementById(BOOTSTRAP_OVERLAY_ID)) return

  if (!document.getElementById(SPIN_STYLE_ID)) {
    const style = document.createElement('style')
    style.id = SPIN_STYLE_ID
    style.textContent = [
      `#${BOOTSTRAP_OVERLAY_ID}{position:fixed;inset:0;z-index:99999;background:#fff;display:flex;`,
      'flex-direction:column;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif}',
      `#${BOOTSTRAP_OVERLAY_ID} .spinner{width:32px;height:32px;margin-bottom:16px;border-radius:9999px;`,
      `border:2px solid color-mix(in srgb,${BRAND_PRIMARY} 25%,transparent);border-top-color:${BRAND_PRIMARY};`,
      'animation:app-bootstrap-spin .8s linear infinite}',
      `#${BOOTSTRAP_OVERLAY_ID} p{margin:0;font-size:14px;color:${BRAND_PRIMARY}}`,
      '@keyframes app-bootstrap-spin{to{transform:rotate(360deg)}}'
    ].join('')
    document.head.appendChild(style)
  }

  const root = document.createElement('div')
  root.id = BOOTSTRAP_OVERLAY_ID
  const spinner = document.createElement('div')
  spinner.className = 'spinner'
  const text = document.createElement('p')
  text.textContent = message
  root.append(spinner, text)
  document.body.appendChild(root)
}

export function hideBootstrapOverlay(): void {
  document.getElementById(BOOTSTRAP_OVERLAY_ID)?.remove()
}
