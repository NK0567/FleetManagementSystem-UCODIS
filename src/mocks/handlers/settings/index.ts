import type { MockDatabase } from '../../db/database'
import type { MockRouter } from '../../http/router'
import { registerActivityLogHandlers } from './activityLog'
import { registerCompanySettingsHandlers } from './company'
import { registerUserAccountHandlers } from './userAccounts'

/** Administration: the company, the sign-in accounts and the activity log. */
export function registerSettingsHandlers(router: MockRouter, db: MockDatabase): void {
  registerCompanySettingsHandlers(router, db)
  registerUserAccountHandlers(router, db)
  registerActivityLogHandlers(router, db)
}
