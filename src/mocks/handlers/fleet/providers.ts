import { contractIssues, isContractActive } from '@/modules/fleet/providers/domain/provider'
import {
  type CarrierVehicle,
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
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'
import { PROVIDER_TYPE_MESSAGES } from './providerTypes'
import { requireReference } from '../../http/references'

type Fields = Omit<ProviderRow, 'no' | keyof AuditFields>

export function providersApi(db: MockDatabase): ProviderApi[] {
  const today = todayIso()
  const types = new Map(db.providerTypes.all().map((type) => [type.no, type.name]))
  return db.providers.all().map((provider) => ({
    ...provider,
    providerTypeName: types.get(provider.providerType) ?? provider.providerType,
    source: provider.source ?? 'fms',
    externalId: provider.externalId ?? null,
    carrierVehicles: provider.carrierVehicles ?? [],
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

/** The vehicles of a carrier: a plate each, kept only for a carrier. */
function readCarrierVehicles(input: Record<string, unknown>): CarrierVehicle[] {
  const raw = input.carrierVehicles
  if (raw == null) return []
  if (!Array.isArray(raw)) throw invalidField('carrierVehicles')
  const seen = new Set<string>()
  return raw.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') throw invalidField('carrierVehicles')
    const line = item as Record<string, unknown>
    const plate = typeof line.plate === 'string' ? line.plate.trim().toUpperCase() : ''
    if (!plate) return []
    if (seen.has(plate) || plate.length > 20) throw invalidField('carrierVehicles')
    seen.add(plate)
    const description = typeof line.description === 'string' ? line.description.trim() : ''
    return [{ plate, description: description.slice(0, 80) }]
  })
}

export function registerProvidersHandlers(router: MockRouter, db: MockDatabase): void {
  /** A provider keeps a type deactivated since; none may newly take it. */
  function assertTypeActive(code: string): void {
    if (!db.providerTypes.findOrFail(code).active) {
      throw unprocessable(PROVIDER_TYPE_MESSAGES.inactive)
    }
  }
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    providerType: (input) => requireReference(db.providerTypes, input, 'providerType'),
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
    contracts: (input) => readContracts(db, input),
    carrierVehicles: (input) =>
      input.providerType === 'carrier' || input.providerType === undefined
        ? readCarrierVehicles(input)
        : []
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
      assertTypeActive(fields.providerType)
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
      if (patch.providerType && patch.providerType !== existing.providerType) {
        assertTypeActive(patch.providerType)
      }
      const merged = { ...existing, ...patch }
      assertValid(merged, existing.no)
      // An authorized provider keeps no withdrawal reason.
      return merged.authorized ? { ...patch, notAuthorizedReason: '' } : patch
    },
    remove: () => undefined
  })
}
