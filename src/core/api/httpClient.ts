import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { currentLocale } from '@/core/i18n'

export const AUTH_TOKEN_STORAGE_KEY = 'auth_token'

const httpClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
})

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['x-lang'] = currentLocale()
  return config
})

// A 401 on these endpoints means "wrong credentials", not "session expired": the caller shows it.
const CREDENTIAL_CHECK_ENDPOINTS = ['/auth/login']

function isCredentialCheck(url: string | undefined): boolean {
  return !!url && CREDENTIAL_CHECK_ENDPOINTS.some((endpoint) => url.includes(endpoint))
}

// The router is imported lazily: it depends on stores that depend on this client.
async function redirectToLogin(): Promise<void> {
  const { default: router } = await import('@/router')
  if (router.currentRoute.value.path === '/login') return
  await router.push('/login')
}

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      if (!isCredentialCheck(error.config?.url)) {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
        void redirectToLogin()
      }
    }
    return Promise.reject(error)
  }
)

export default httpClient
