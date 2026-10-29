import type { ProviderTypeApi } from '@/modules/fleet/provider-types/types/providerType.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { ProviderTypeRow } from '../../fixtures/fleet/providerTypes'
import { registerCrudResource } from '../../http/crudResource'
import { conflict } from '../../http/errors'
import {
  readAll,
  readBoolean,
  readCode,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'
import type { LocalizedText } from '../../i18n'

type Fields = Omit<ProviderTypeRow, 'no' | 'systemRole' | keyof AuditFields>

export const PROVIDER_TYPE_MESSAGES = {
  inUse: {
    fr: 'Des prestataires sont de ce type : il ne peut pas être supprimé. Désactivez-le plutôt.',
    en: 'Providers use this type: it cannot be deleted. Deactivate it instead.'
  },
  hasRole: {
    fr: "L'application utilise ce type ({role}) : il ne peut pas être supprimé.",
    en: 'The application uses this type ({role}): it cannot be deleted.'
  },
  inactive: {
    fr: "Ce type de prestataire n'est plus actif.",
    en: 'This provider type is no longer active.'
  }
} satisfies Record<string, LocalizedText>

export function providerTypesApi(db: MockDatabase): ProviderTypeApi[] {
  const providers = db.providers.all()
  return db.providerTypes.all().map((row) => ({
    ...row,
    providerCount: providers.filter((provider) => provider.providerType === row.no).length
  }))
}

export function registerProviderTypesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/fleet/provider-types',
    feature: 'PROVIDERTYPE',
    collection: db.providerTypes,
    list: () => providerTypesApi(db),
    searchColumns: ['no', 'name'],
    optionFields: { systemRole: 'providerRole' },
    create: (input) => ({ no: readCode(input), systemRole: null, ...readAll(input, readers) }),
    update: (_existing, input) => readPatch(input, readers),
    remove: (existing) => {
      if (existing.systemRole) {
        throw conflict(PROVIDER_TYPE_MESSAGES.hasRole, { role: existing.systemRole })
      }
      if (db.providers.all().some((provider) => provider.providerType === existing.no)) {
        throw conflict(PROVIDER_TYPE_MESSAGES.inUse)
      }
    }
  })
}
