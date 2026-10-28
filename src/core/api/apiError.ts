import axios from 'axios'
import type { ApiErrorResponse } from '@/types/api-response.types'

export function apiErrorBody(error: unknown): Partial<ApiErrorResponse> | undefined {
  if (!axios.isAxiosError(error)) return undefined
  const body = error.response?.data as Partial<ApiErrorResponse> | undefined
  return body && typeof body === 'object' ? body : undefined
}

export function apiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

/** Message sent by the API (already translated through x-lang), or the given fallback. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const message = apiErrorBody(error)?.message
  return typeof message === 'string' && message.trim() ? message : fallback
}
