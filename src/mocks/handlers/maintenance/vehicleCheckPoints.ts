import type { VehicleCheckPointApi } from '@/modules/maintenance/vehicle-check-points/types/vehicleCheckPoint.types'
import { VEHICLE_CHECK_MOMENTS } from '@/modules/maintenance/vehicle-checks/domain/vehicleCheck'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { VehicleCheckPointRow } from '../../fixtures/maintenance/vehicleCheckPoints'
import { registerCrudResource } from '../../http/crudResource'
import {
  readAll,
  readBoolean,
  readCode,
  readEnum,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'

type Fields = Omit<VehicleCheckPointRow, 'no' | keyof AuditFields>

export function vehicleCheckPointsApi(db: MockDatabase): VehicleCheckPointApi[] {
  return db.vehicleCheckPoints.all()
}

export function registerVehicleCheckPointsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    moment: (input) =>
      readEnum(input, 'moment', VEHICLE_CHECK_MOMENTS, { required: true }) ?? 'before_loading',
    label: (input) => readString(input, 'label', { required: true }),
    blocking: (input) => readBoolean(input, 'blocking'),
    sortOrder: (input) => readNumber(input, 'sortOrder', { required: true }) ?? 0,
    active: (input) => readBoolean(input, 'active', true)
  }

  registerCrudResource(router, {
    basePath: '/maintenance/vehicle-check-points',
    feature: 'VEHICLECHECKPOINT',
    collection: db.vehicleCheckPoints,
    list: () => vehicleCheckPointsApi(db),
    searchColumns: ['no', 'label'],
    optionFields: { moment: 'vehicleCheckMoment' },
    create: (input) => ({
      no: readCode(input),
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers),
    remove: () => undefined
  })
}
