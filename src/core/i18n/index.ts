import { createI18n } from 'vue-i18n'
import fr from '@/locales/fr'
import en from '@/locales/en'

export type SupportedLocale = 'fr' | 'en'

export const SUPPORTED_LOCALES: { code: SupportedLocale; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' }
]

export const DEFAULT_LOCALE: SupportedLocale = 'fr'

const LOCALE_STORAGE_KEY = 'app_locale'

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return SUPPORTED_LOCALES.some((locale) => locale.code === value)
}

export function toSupportedLocale(raw: string | null | undefined): SupportedLocale | null {
  const prefix = String(raw ?? '')
    .trim()
    .slice(0, 2)
    .toLowerCase()
  return isSupportedLocale(prefix) ? prefix : null
}

export function getSavedLocale(): SupportedLocale {
  const saved = toSupportedLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
  if (saved) return saved
  const browser = typeof navigator !== 'undefined' ? navigator.language : ''
  return toSupportedLocale(browser) ?? DEFAULT_LOCALE
}

export function hasSavedLocale(): boolean {
  return toSupportedLocale(localStorage.getItem(LOCALE_STORAGE_KEY)) !== null
}

export function saveLocale(locale: SupportedLocale): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}

const i18n = createI18n({
  legacy: false,
  locale: getSavedLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: { fr, en },
  missingWarn: false,
  fallbackWarn: false
})

export function currentLocale(): SupportedLocale {
  return toSupportedLocale(i18n.global.locale.value) ?? DEFAULT_LOCALE
}

export function setLocale(locale: SupportedLocale): void {
  i18n.global.locale.value = locale
  saveLocale(locale)
}

export default i18n
