import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/core/api/authApi'
import { apiErrorMessage, apiErrorStatus } from '@/core/api/apiError'
import { AUTH_TOKEN_STORAGE_KEY } from '@/core/api/httpClient'
import i18n, { currentLocale, hasSavedLocale, setLocale, toSupportedLocale } from '@/core/i18n'
import { useUserStore } from '@/stores/user'
import { useMenuPermissionsStore } from '@/stores/menuPermissions'
import { useOptionsStore } from '@/stores/optionsStore'
import { useReferenceStore } from '@/stores/referenceStore'

interface AuthResult {
  success: boolean
  error?: string
}

/** The account language applies at login; on a restored session a manual choice wins. */
function applyUserLanguage(language: string | undefined, force: boolean): void {
  const target = toSupportedLocale(language)
  if (!target || (!force && hasSavedLocale()) || target === currentLocale()) return
  setLocale(target)
}

export function useAuth() {
  const userStore = useUserStore()
  const permissionsStore = useMenuPermissionsStore()
  const router = useRouter()
  const { t } = i18n.global

  const isAuthenticated = computed(() => userStore.isAuthenticated)
  const user = computed(() => userStore.user)

  async function login(userCode: string, userPassword: string): Promise<AuthResult> {
    try {
      const response = await authApi.login({ userCode, userPassword })
      const { accessToken, user: account } = response.data.data
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken)
      userStore.setUser(account)
      applyUserLanguage(account.language, true)
      await permissionsStore.fetchPermissions()
      return { success: true }
    } catch (error) {
      if (apiErrorStatus(error) === undefined) {
        return { success: false, error: t('auth.error.network') }
      }
      return { success: false, error: apiErrorMessage(error, t('auth.error.invalidCredentials')) }
    }
  }

  function logout() {
    permissionsStore.clear()
    useOptionsStore().reset()
    useReferenceStore().reset()
    userStore.logout()
    void router.push('/login')
  }

  async function initAuth() {
    if (!localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) return
    applyUserLanguage(userStore.user?.language, false)
    const profile = await userStore.loadProfile()
    if (profile) {
      userStore.setUser(profile)
      applyUserLanguage(profile.language, false)
    }
    await permissionsStore.ensureLoaded()
  }

  return { isAuthenticated, user, login, logout, initAuth }
}
