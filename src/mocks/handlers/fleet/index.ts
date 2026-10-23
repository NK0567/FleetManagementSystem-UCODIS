import type { MockDatabase } from '../../db/database'
import type { MockRouter } from '../../http/router'
import { registerFleetSettingsHandlers } from './settings'

export function registerFleetHandlers(router: MockRouter, db: MockDatabase): void {
  registerFleetSettingsHandlers(router, db)
}
