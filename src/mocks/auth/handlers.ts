import type { DemoAccount, LoginResponseData, User } from '@/types/auth.types'
import type { MockDatabase } from '../db/database'
import { badRequest, MockHttpError } from '../http/errors'
import { ok } from '../http/responses'
import type { MockRouter } from '../http/router'
import { sessionUser } from '../http/types'
import { findAccount, MOCK_ACCOUNTS, type MockAccount } from '../fixtures/auth/users'
import { disabledFeatures, permissionsFor } from './permissions'
import { issueToken } from './session'

const MESSAGES = {
  invalidCredentials: {
    fr: 'Code utilisateur ou mot de passe incorrect.',
    en: 'Incorrect user code or password.'
  },
  inactiveAccount: {
    fr: 'Ce compte est suspendu. Contactez votre administrateur.',
    en: 'This account is suspended. Contact your administrator.'
  },
  missingCredentials: {
    fr: 'Saisissez votre code utilisateur et votre mot de passe.',
    en: 'Enter your user code and password.'
  }
}

function toUser(account: MockAccount): User {
  return {
    code: account.code,
    name: account.name,
    email: account.email,
    profile: account.profile,
    employeeNo: account.employeeNo,
    orgUnitNo: account.orgUnitNo,
    language: account.language,
    landingRoute: account.landingRoute,
    ordererNo: account.ordererNo
  }
}

export function registerAuthHandlers(router: MockRouter, db: MockDatabase) {
  router.post('/auth/login', { public: true }, (request) => {
    const body = (request.body ?? {}) as Record<string, unknown>
    const userCode = typeof body.userCode === 'string' ? body.userCode : ''
    const password = typeof body.userPassword === 'string' ? body.userPassword : ''
    if (!userCode.trim() || !password) throw badRequest(MESSAGES.missingCredentials)

    const account = findAccount(userCode)
    if (!account || account.password !== password) {
      throw new MockHttpError(401, MESSAGES.invalidCredentials)
    }
    if (!account.active) throw new MockHttpError(403, MESSAGES.inactiveAccount)

    const data: LoginResponseData = { accessToken: issueToken(account), user: toUser(account) }
    return ok(data)
  })

  router.get('/auth/profile', {}, (request) => {
    const account = findAccount(sessionUser(request).code)
    if (!account) throw new MockHttpError(401, MESSAGES.invalidCredentials)
    return ok(toUser(account))
  })

  router.get('/auth/permissions', {}, (request) =>
    ok(permissionsFor(sessionUser(request).profile, disabledFeatures(db.moduleToggles.all())))
  )

  router.get('/auth/demo-accounts', { public: true }, () => {
    const accounts: DemoAccount[] = MOCK_ACCOUNTS.filter((account) => account.active).map(
      ({ code, name, profile, password }) => ({ code, name, profile, password })
    )
    return ok(accounts)
  })
}
