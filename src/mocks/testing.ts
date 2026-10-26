import { vi } from 'vitest'
import { DEMO_REFERENCE_DATE } from './clock'
import { createMockServer, type MockServer } from './index'
import type { RawMockRequest } from './http/router'

/** Fresh in-memory backend for specs, pinned to the demo reference date. */
export function createTestServer(): MockServer {
  vi.setSystemTime(new Date(`${DEMO_REFERENCE_DATE}T10:00:00`))
  localStorage.clear()
  return createMockServer({ seedVersion: 1, dayOffset: 0 })
}

export interface CallOptions {
  as?: string
  body?: unknown
  query?: Record<string, unknown>
  language?: 'fr' | 'en'
}

export async function call(
  server: MockServer,
  method: RawMockRequest['method'],
  path: string,
  options: CallOptions = {}
) {
  const response = await server.router.handle({
    method,
    path,
    query: options.query ?? {},
    body: options.body ?? null,
    authorization: options.as ? `Bearer mock.${options.as}` : undefined,
    language: options.language ?? 'en'
  })
  return response as { status: number; data: { success: boolean; message: string; data: unknown } }
}
