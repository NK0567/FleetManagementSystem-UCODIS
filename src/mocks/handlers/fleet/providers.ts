import { contractIssues, isContractActive } from '@/modules/fleet/providers/domain/provider'
import {
  PROVIDER_TYPES,
  type ProviderApi,
  type ProviderContract
} from '@/modules/fleet/providers/types/provider.types'
import { isValidCalendarDateYmd } from '@/utils/calendarDate'
import { todayIso } from '@/utils/date'
import { isValidEmail } from '@/utils/email'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { ProviderRow } from '../../fixtures/fleet/providers'
import { registerCrudResource } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  invalidField,
  readAll,
  readBoolean,
  readEnum,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'

type Fields = Omit<ProviderRow, 'no' | keyof AuditFields>

export function providersApi(db: MockDatabase): ProviderApi[] {
  const today = todayIso()
  return db.providers.all().map((provider) => ({
    ...provider,
    activeContractCount: provider.contracts.filter((contract) => isContractActive(contract, today))
      .length
  }))
}

/** Contract references are unique across providers; new contracts get the next one. */
function readContracts(db: MockDatabase, input: Record<string, unknown>): ProviderContract[] {
  const raw = input.contracts
  if (raw == null) return []
  if (!Array.isArray(raw)) throw invalidField('contracts')
  const taken = db.providers.all().flatMap((provider) => provider.contracts.map((c) => c.reference))
  return raw.map((item: unknown, index) => {
    if (!item || typeof item !== 'object') throw invalidField('contracts')
    const line = item as Record<string, unknown>
    const amount = line.amount == null || line.amount === '' ? null : Number(line.amount)
    const contract = {
      subject: typeof line.subject === 'string' ? line.subject.trim() : '',
      startDate: typeof line.startDate === 'string' ? line.startDate : '',
      endDate: typeof line.endDate === 'string' && line.endDate ? line.endDate : null,
      amount: amount !== null && Number.isFinite(amount) ? amount : null
    }
    const datesValid =
      isValidCalendarDateYmd(contract.startDate) &&
      (contract.endDate === null || isValidCalendarDateYmd(contract.endDate))
    if (!datesValid || contractIssues(contract).length > 0) {
      throw unprocessable(FLEET_MESSAGES.invalidContract, { line: index + 1 })
    }
    let reference = typeof line.reference === 'string' ? line.reference : ''
    if (!reference) {
      reference = nextNo(taken, 'CTR-', 3)
      taken.push(reference)
    }
    return { reference, ...contract }
  })
}

export function registerProvidersHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    providerType: (input) =>
      readEnum(input, 'providerType', PROVIDER_TYPES, { required: true }) ?? 'garage',
    contactName: (input) => readString(input, 'contactName'),
    phone: (input) => readString(input, 'phone'),
    email: (input) => {
      const email = readString(input, 'email')
      if (email && !isValidEmail(email)) throw invalidField('email')
      return email
    },
    address: (input) => readString(input, 'address'),
    authorized: (input) => readBoolean(input, 'authorized', true),
    notAuthorizedReason: (input) => readString(input, 'notAuthorizedReason'),
    contracts: (input) => readContracts(db, input)
  }

  function assertValid(provider: Fields, no?: string): void {
    if (!provider.authorized && !provider.notAuthorizedReason) {
      throw unprocessable(FLEET_MESSAGES.notAuthorizedReasonRequired)
    }
    const twin = db.providers
      .all()
      .find(
        (other) =>
          other.no !== no &&
          other.providerType === provider.providerType &&
          other.name.toLowerCase() === provider.name.toLowerCase()
      )
    if (twin) throw conflict(FLEET_MESSAGES.duplicateProvider, { no: twin.no })
  }

  registerCrudResource(router, {
    basePath: '/fleet/providers',
    feature: 'PROVIDER',
    collection: db.providers,
    list: () => providersApi(db),
    searchColumns: ['no', 'name', 'contactName'],
    optionFields: { providerType: 'providerType' },
    create: (input) => {
      const fields = readAll(input, readers)
      assertValid(fields)
      return {
        no: nextNo(
          db.providers.all().map((row) => row.no),
          'PRS-',
          3
        ),
        ...fields
      }
    },
    update: (existing, input) => {
      const patch = readPatch(input, readers)
      const merged = { ...existing, ...patch }
      assertValid(merged, existing.no)
      // An authorized provider keeps no withdrawal reason.
      return merged.authorized ? { ...patch, notAuthorizedReason: '' } : patch
    },
    remove: () => undefined
  })
}
