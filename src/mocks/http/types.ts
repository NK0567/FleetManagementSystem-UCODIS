import type { PermissionAction, UserProfileCode } from '@/types/auth.types'
import type { MockLanguage } from '../i18n'

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

export interface MockSessionUser {
  code: string
  name: string
  profile: UserProfileCode
  employeeNo?: string
  orgUnitNo?: string
}

export interface MockRequest {
  method: HttpMethod
  path: string
  params: Record<string, string>
  query: Record<string, unknown>
  body: unknown
  language: MockLanguage
  user: MockSessionUser | null
}

export interface MockResponse {
  status: number
  data: unknown
  headers?: Record<string, string>
}

export type MockHandler = (request: MockRequest) => MockResponse | Promise<MockResponse>

export interface RouteOptions {
  /** Reachable without a session (login, demo accounts). */
  public?: boolean
  /** Feature checked against the user's permissions. */
  feature?: string
  /** Defaults to the action implied by the HTTP method. */
  action?: PermissionAction
}

/** The authenticated user, for handlers registered without `public`. */
export function sessionUser(request: MockRequest): MockSessionUser {
  if (!request.user) throw new Error('sessionUser() called on a public route')
  return request.user
}
