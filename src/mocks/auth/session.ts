import type { MockSessionUser } from '../http/types'
import { findAccount, type MockAccount } from '../fixtures/auth/users'

const TOKEN_PREFIX = 'mock.'

/** Demo tokens only carry the user code: there is nothing to protect in an in-browser backend. */
export function issueToken(account: MockAccount): string {
  return `${TOKEN_PREFIX}${account.code}`
}

export function resolveToken(authorization: string | undefined): MockSessionUser | null {
  const token = authorization?.replace(/^Bearer\s+/i, '') ?? ''
  if (!token.startsWith(TOKEN_PREFIX)) return null
  const account = findAccount(token.slice(TOKEN_PREFIX.length))
  if (!account?.active) return null
  return {
    code: account.code,
    name: account.name,
    profile: account.profile,
    employeeNo: account.employeeNo,
    orgUnitNo: account.orgUnitNo
  }
}
