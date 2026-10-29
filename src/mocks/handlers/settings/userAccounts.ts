import { USER_PROFILES, type UserProfileCode } from '@/types/auth.types'
import type { UserAccountApi } from '@/modules/settings/user-accounts/types/userAccount.types'
import { isValidEmail } from '@/utils/email'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { DEMO_PASSWORD, MOCK_ACCOUNTS } from '../../fixtures/auth/users'
import type { UserAccountRow } from '../../fixtures/settings/userAccounts'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { has, invalidField, readCode, readEnum, readString } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { recordActivity } from './activityLog'

const MESSAGES = {
  ownAccount: {
    fr: 'Vous ne pouvez pas désactiver votre propre compte.',
    en: 'You cannot disable your own account.'
  },
  lastAdmin: {
    fr: 'Ce compte est le dernier administrateur actif : il ne peut pas perdre ce rôle ni être désactivé.',
    en: 'This is the last active administrator: it cannot lose this role or be disabled.'
  },
  alreadyDisabled: { fr: 'Ce compte est déjà désactivé.', en: 'This account is already disabled.' },
  alreadyEnabled: { fr: 'Ce compte est déjà actif.', en: 'This account is already active.' },
  employeeHasAccount: {
    fr: 'La personne {employee} a déjà le compte {code}.',
    en: 'Person {employee} already has the account {code}.'
  },
  reasonRequired: {
    fr: 'Indiquez pourquoi le compte est désactivé.',
    en: 'Say why the account is disabled.'
  }
}

/** Where each role lands after signing in, as in the demo accounts. */
const LANDING: Partial<Record<UserProfileCode, string>> = Object.fromEntries(
  MOCK_ACCOUNTS.map((account) => [account.profile, account.landingRoute])
)

export function userAccountsApi(db: MockDatabase): UserAccountApi[] {
  const employees = new Map(db.employees.all().map((employee) => [employee.no, employee]))
  const units = new Map(db.orgUnits.all().map((unit) => [unit.no, unit.name]))
  const lastLogin = new Map<string, string>()
  for (const entry of db.activityLog.all()) {
    if (entry.action !== 'login') continue
    if ((lastLogin.get(entry.by) ?? '') < entry.at) lastLogin.set(entry.by, entry.at)
  }
  return db.userAccounts.all().map((row) => {
    const employee = row.employeeNo ? employees.get(row.employeeNo) : undefined
    const orgUnitNo = row.orgUnitNo ?? employee?.orgUnitNo ?? ''
    return {
      no: row.no,
      name: row.name,
      email: row.email ?? '',
      profile: row.profile,
      employeeNo: row.employeeNo ?? null,
      orgUnitNo: orgUnitNo || null,
      orgUnitName: orgUnitNo ? (units.get(orgUnitNo) ?? orgUnitNo) : '',
      language: row.language,
      active: row.active,
      lastLoginAt: lastLogin.get(row.no) ?? null,
      statusChangedAt: row.statusChangedAt,
      statusChangedBy: row.statusChangedBy,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      modifiedAt: row.modifiedAt,
      modifiedBy: row.modifiedBy
    }
  })
}

function activeAdmins(db: MockDatabase, exceptNo: string): number {
  return db.userAccounts
    .all()
    .filter((row) => row.no !== exceptNo && row.active && row.profile === 'ADMIN').length
}

export function registerUserAccountHandlers(router: MockRouter, db: MockDatabase): void {
  function readEmployee(input: Record<string, unknown>, accountNo: string): string | undefined {
    const employeeNo = readString(input, 'employeeNo')
    if (!employeeNo) return undefined
    if (!db.employees.find(employeeNo)) throw invalidField('employeeNo')
    const holder = db.userAccounts
      .all()
      .find((row) => row.employeeNo === employeeNo && row.no !== accountNo)
    if (holder) {
      throw conflict(MESSAGES.employeeHasAccount, { employee: employeeNo, code: holder.no })
    }
    return employeeNo
  }

  function readEmail(input: Record<string, unknown>): string | undefined {
    const email = readString(input, 'email')
    if (email && !isValidEmail(email)) throw invalidField('email')
    return email || undefined
  }

  const readProfile = (input: Record<string, unknown>) =>
    readEnum(input, 'profile', USER_PROFILES, { required: true }) ?? 'DRIVER'

  const one = (no: string) => userAccountsApi(db).find((row) => row.no === no)

  registerCrudResource(router, {
    basePath: '/settings/user-accounts',
    feature: 'USERACCOUNT',
    collection: db.userAccounts,
    list: () => userAccountsApi(db),
    searchColumns: ['no', 'name', 'email'],
    optionFields: { profile: 'userProfile' },
    create: (input, request) => {
      const no = readCode(input).toUpperCase()
      const profile = readProfile(input)
      const employeeNo = readEmployee(input, no)
      const row: Omit<UserAccountRow, 'createdAt' | 'createdBy' | 'modifiedAt' | 'modifiedBy'> = {
        no,
        password: DEMO_PASSWORD,
        name: readString(input, 'name', { required: true }),
        email: readEmail(input),
        profile,
        employeeNo,
        orgUnitNo: employeeNo ? db.employees.find(employeeNo)?.orgUnitNo : undefined,
        language: readEnum(input, 'language', ['fr', 'en'] as const) ?? 'fr',
        landingRoute: LANDING[profile] ?? '/',
        active: true,
        statusChangedAt: null,
        statusChangedBy: null
      }
      if (!db.userAccounts.exists(no)) {
        recordActivity(db, {
          by: sessionUser(request).code,
          action: 'account_created',
          entity: 'user-accounts',
          recordNo: no
        })
      }
      return row
    },
    update: (existing, input, request) => {
      const patch: Partial<UserAccountRow> = {}
      if (has(input, 'name')) patch.name = readString(input, 'name', { required: true })
      if (has(input, 'email')) patch.email = readEmail(input)
      if (has(input, 'language')) {
        patch.language = readEnum(input, 'language', ['fr', 'en'] as const) ?? existing.language
      }
      if (has(input, 'employeeNo')) {
        patch.employeeNo = readEmployee(input, existing.no)
        patch.orgUnitNo = patch.employeeNo
          ? db.employees.find(patch.employeeNo)?.orgUnitNo
          : undefined
      }
      if (has(input, 'profile')) {
        const profile = readProfile(input)
        if (
          existing.profile === 'ADMIN' &&
          profile !== 'ADMIN' &&
          existing.active &&
          activeAdmins(db, existing.no) === 0
        ) {
          throw unprocessable(MESSAGES.lastAdmin)
        }
        if (profile !== existing.profile) {
          patch.profile = profile
          patch.landingRoute = LANDING[profile] ?? existing.landingRoute
        }
      }
      recordActivity(db, {
        by: sessionUser(request).code,
        action: 'account_updated',
        entity: 'user-accounts',
        recordNo: existing.no,
        detail: patch.profile ? patch.profile : ''
      })
      return patch
    }
  })

  function setActive(request: MockRequest, active: boolean) {
    const account = db.userAccounts.findOrFail(routeParam(request, 'no'))
    const user = sessionUser(request)
    const reason = active ? '' : readString(readBody(request), 'reason')
    if (account.active === active) {
      throw conflict(active ? MESSAGES.alreadyEnabled : MESSAGES.alreadyDisabled)
    }
    if (!active) {
      if (account.no === user.code) throw unprocessable(MESSAGES.ownAccount)
      if (account.profile === 'ADMIN' && activeAdmins(db, account.no) === 0) {
        throw unprocessable(MESSAGES.lastAdmin)
      }
      if (!reason) throw unprocessable(MESSAGES.reasonRequired)
    }
    db.userAccounts.update(account.no, {
      active,
      statusChangedAt: nowIsoDateTime(),
      statusChangedBy: user.code,
      ...stampModified(request)
    })
    recordActivity(db, {
      by: user.code,
      action: active ? 'account_enabled' : 'account_disabled',
      entity: 'user-accounts',
      recordNo: account.no,
      detail: reason
    })
    return ok(one(account.no))
  }

  router.post(
    '/settings/user-accounts/:no/disable',
    { feature: 'USERACCOUNT', action: 'execute' },
    (request) => setActive(request, false)
  )
  router.post(
    '/settings/user-accounts/:no/enable',
    { feature: 'USERACCOUNT', action: 'execute' },
    (request) => setActive(request, true)
  )
}
