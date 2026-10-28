import { saveLocale, type SupportedLocale } from '@/core/i18n'
import {
  getBootstrapMessage,
  markLocaleReloadPending,
  showBootstrapOverlay
} from '@/core/bootstrap/appBootstrap'

/**
 * Lists, options and API messages are all loaded in the current language, so a language switch
 * reloads the application behind an overlay instead of showing a half-translated screen.
 */
export function reloadApplicationForLocale(locale: SupportedLocale): void {
  markLocaleReloadPending()
  saveLocale(locale)
  showBootstrapOverlay(getBootstrapMessage(locale))
  window.location.reload()
}
