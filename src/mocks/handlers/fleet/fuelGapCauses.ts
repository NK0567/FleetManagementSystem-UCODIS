import type { FuelGapCauseApi } from '@/modules/fleet/fuel-gap-causes/types/fuelGapCause.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { FuelGapCauseRow } from '../../fixtures/fleet/fuelGapCauses'
import { registerCrudResource } from '../../http/crudResource'
import {
  readAll,
  readBoolean,
  readCode,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'

type Fields = Omit<FuelGapCauseRow, 'no' | keyof AuditFields>

export function fuelGapCausesApi(db: MockDatabase): FuelGapCauseApi[] {
  return db.fuelGapCauses.all()
}

export function registerFuelGapCausesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    chargeable: (input) => readBoolean(input, 'chargeable'),
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/fleet/fuel-gap-causes',
    feature: 'FUELGAPCAUSE',
    collection: db.fuelGapCauses,
    list: () => fuelGapCausesApi(db),
    searchColumns: ['no', 'name'],
    create: (input) => ({
      no: readCode(input),
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers),
    remove: () => undefined
  })
}
