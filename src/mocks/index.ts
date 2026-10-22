import type { AxiosInstance } from 'axios'
import { disabledFeatures, hasPermission, permissionsFor } from './auth/permissions'
import { registerAuthHandlers } from './auth/handlers'
import { resolveToken } from './auth/session'
import { createDatabase } from './db/database'
import type { CollectionContext } from './db/collection'
import { registerSharedHandlers } from './handlers/shared'
import { createMockAdapter } from './http/adapter'
import { createMockRouter } from './http/router'

export function createMockServer(context?: CollectionContext) {
  const db = createDatabase(context)
  const router = createMockRouter({
    resolveUser: resolveToken,
    can: (user, feature, action) =>
      hasPermission(
        permissionsFor(user.profile, disabledFeatures(db.moduleToggles.all())),
        feature,
        action
      )
  })

  registerAuthHandlers(router, db)
  registerSharedHandlers(router, db)

  return { db, router }
}

export type MockServer = ReturnType<typeof createMockServer>

/** Serves every request of the client from the in-browser backend. */
export function installMockApi(client: AxiosInstance): MockServer {
  const server = createMockServer()
  const latencyMs = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 0)
  client.defaults.adapter = createMockAdapter(server.router, {
    latencyMs: Number.isFinite(latencyMs) ? latencyMs : 0
  })
  return server
}
