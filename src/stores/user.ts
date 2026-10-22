import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from '@/core/api/authApi'
import { AUTH_TOKEN_STORAGE_KEY } from '@/core/api/httpClient'
import { dedupeInFlight } from '@/core/utils/inFlightRequests'
import { clearAllPersistedListStates } from '@/core/utils/listStateStorage'
import type { User } from '@/types/auth.types'

const USER_STORAGE_KEY = 'user_data'

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.code === 'string' && typeof candidate.profile === 'string'
}

function restoreUser(): User | null {
  if (!localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) return null
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) ?? 'null')
    return isUser(saved) ? saved : null
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(restoreUser())
  const isAuthenticated = ref(user.value !== null)

  watch(
    user,
    (value) => {
      if (value) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(value))
      else localStorage.removeItem(USER_STORAGE_KEY)
    },
    { deep: true }
  )

  function setUser(value: User) {
    user.value = value
    isAuthenticated.value = true
  }

  function logout() {
    user.value = null
    isAuthenticated.value = false
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    clearAllPersistedListStates()
  }

  /** Single entry point for GET /auth/profile: concurrent callers share one request. */
  async function loadProfile(): Promise<User | null> {
    if (!localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) return null
    return dedupeInFlight('auth:profile', async () => {
      try {
        const response = await authApi.getProfile()
        return response.data.success ? response.data.data : null
      } catch {
        return null
      }
    })
  }

  function refreshProfile() {
    void loadProfile().then((profile) => {
      if (profile) setUser(profile)
    })
  }

  return { user, isAuthenticated, setUser, logout, loadProfile, refreshProfile }
})
