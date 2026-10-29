import type { MockDatabase } from '../db/database'
import type { MockAccount } from '../fixtures/auth/users'
import type { UserAccountRow } from '../fixtures/settings/userAccounts'

export function toAccount(row: UserAccountRow): MockAccount {
  return {
    code: row.no,
    password: row.password,
    name: row.name,
    email: row.email,
    profile: row.profile,
    employeeNo: row.employeeNo,
    orgUnitNo: row.orgUnitNo,
    language: row.language,
    landingRoute: row.landingRoute,
    active: row.active,
    ordererNo: row.ordererNo
  }
}

/** The sign-in account of a user code, as the administrator keeps it. */
export function accountOf(db: MockDatabase, code: string): MockAccount | undefined {
  const row = db.userAccounts.find(code.trim().toUpperCase())
  return row ? toAccount(row) : undefined
}
