import type { PermissionAction } from '@/types/auth.types'
import { COMMON_MESSAGES, localize, toMockLanguage } from '../i18n'
import { MockHttpError, forbidden, unauthorized } from './errors'
import { errorResponse } from './responses'
import type {
  HttpMethod,
  MockHandler,
  MockRequest,
  MockResponse,
  MockSessionUser,
  RouteOptions
} from './types'

export interface RawMockRequest {
  method: HttpMethod
  path: string
  query: Record<string, unknown>
  body: unknown
  authorization?: string
  language?: string
}

export interface MockRouterDependencies {
  resolveUser: (authorization: string | undefined) => MockSessionUser | null
  can: (user: MockSessionUser, feature: string, action: PermissionAction) => boolean
}

interface Route {
  method: HttpMethod
  segments: string[]
  staticSegments: number
  options: RouteOptions
  handler: MockHandler
}

const DEFAULT_ACTION: Record<HttpMethod, PermissionAction> = {
  get: 'read',
  post: 'insert',
  put: 'update',
  patch: 'update',
  delete: 'delete'
}

function splitPath(path: string): string[] {
  return (path.split('?')[0] ?? '').split('/').filter(Boolean)
}

function matchRoute(route: Route, segments: string[]): Record<string, string> | null {
  if (route.segments.length !== segments.length) return null
  const params: Record<string, string> = {}
  for (const [index, pattern] of route.segments.entries()) {
    const actual = segments[index] ?? ''
    if (pattern.startsWith(':')) params[pattern.slice(1)] = decodeURIComponent(actual)
    else if (pattern !== actual) return null
  }
  return params
}

export function createMockRouter(dependencies: MockRouterDependencies) {
  const routes: Route[] = []

  function register(
    method: HttpMethod,
    pattern: string,
    options: RouteOptions,
    handler: MockHandler
  ): void {
    const segments = splitPath(pattern)
    routes.push({
      method,
      segments,
      staticSegments: segments.filter((segment) => !segment.startsWith(':')).length,
      options,
      handler
    })
  }

  /** Static segments win over parameters, so /summary is not read as /:no. */
  function findRoute(method: HttpMethod, segments: string[]) {
    let best: { route: Route; params: Record<string, string> } | null = null
    let pathExists = false
    for (const route of routes) {
      const params = matchRoute(route, segments)
      if (!params) continue
      pathExists = true
      if (route.method !== method) continue
      if (!best || route.staticSegments > best.route.staticSegments) best = { route, params }
    }
    return { best, pathExists }
  }

  async function handle(raw: RawMockRequest): Promise<MockResponse> {
    const language = toMockLanguage(raw.language)
    const path = `/${splitPath(raw.path).join('/')}`
    const { best, pathExists } = findRoute(raw.method, splitPath(raw.path))

    if (!best) {
      const status = pathExists ? 405 : 404
      const text = pathExists ? COMMON_MESSAGES.methodNotAllowed : COMMON_MESSAGES.routeNotFound
      return errorResponse(status, localize(language, text, { method: raw.method, path }), path)
    }

    try {
      const { route, params } = best
      const user = dependencies.resolveUser(raw.authorization)
      if (!route.options.public && !user) throw unauthorized()
      if (route.options.feature && user) {
        const action = route.options.action ?? DEFAULT_ACTION[route.method]
        if (!dependencies.can(user, route.options.feature, action)) throw forbidden()
      }
      const request: MockRequest = {
        method: raw.method,
        path,
        params,
        query: raw.query,
        body: raw.body,
        language,
        user
      }
      return await route.handler(request)
    } catch (error) {
      if (error instanceof MockHttpError) {
        return errorResponse(
          error.status,
          localize(language, error.text, error.params),
          path,
          error.extra
        )
      }
      console.error('[mock api]', raw.method.toUpperCase(), path, error)
      return errorResponse(500, localize(language, COMMON_MESSAGES.unexpected), path)
    }
  }

  return {
    get: (pattern: string, options: RouteOptions, handler: MockHandler) =>
      register('get', pattern, options, handler),
    post: (pattern: string, options: RouteOptions, handler: MockHandler) =>
      register('post', pattern, options, handler),
    put: (pattern: string, options: RouteOptions, handler: MockHandler) =>
      register('put', pattern, options, handler),
    patch: (pattern: string, options: RouteOptions, handler: MockHandler) =>
      register('patch', pattern, options, handler),
    delete: (pattern: string, options: RouteOptions, handler: MockHandler) =>
      register('delete', pattern, options, handler),
    handle
  }
}

export type MockRouter = ReturnType<typeof createMockRouter>
