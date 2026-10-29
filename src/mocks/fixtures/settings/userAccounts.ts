import type { CollectionDefinition, MockRow } from '../../db/collection'
import { MOCK_ACCOUNTS, type MockAccount } from '../auth/users'
import { seedAudit } from '../seedAudit'

/** A sign-in account: who may open the application, with which role. */
export type UserAccountRow = Omit<MockAccount, 'code'> &
  MockRow & {
    /** When the account was last switched off or back on, and by whom. */
    statusChangedAt: string | null
    statusChangedBy: string | null
  }

export const userAccountsCollection: CollectionDefinition<UserAccountRow> = {
  name: 'user-accounts',
  dateFields: ['statusChangedAt'],
  seed: () =>
    MOCK_ACCOUNTS.map(({ code, ...account }) => ({
      ...account,
      no: code,
      statusChangedAt: account.active ? null : '2026-08-28T09:15:00',
      statusChangedBy: account.active ? null : 'ADM001',
      ...seedAudit
    }))
}
