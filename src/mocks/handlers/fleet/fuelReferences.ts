import type { FuelReferenceApi } from '@/modules/fleet/fuel-references/types/fuelReference.types'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { FuelReferenceRow } from '../../fixtures/fleet/fuelReferences'
import { registerCrudResource } from '../../http/crudResource'
import { conflict } from '../../http/errors'
import { readNumber, readString } from '../../http/input'
import { optionalReference, requireReference } from '../../http/references'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'

export function fuelReferencesApi(db: MockDatabase): FuelReferenceApi[] {
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const routes = new Map(db.routeTemplates.all().map((route) => [route.no, route.name]))
  return db.fuelReferences.all().map((row) => ({
    ...row,
    vehiclePlate: plates.get(row.vehicleNo) ?? row.vehicleNo,
    routeName: row.routeTemplateNo ? (routes.get(row.routeTemplateNo) ?? row.routeTemplateNo) : ''
  }))
}

/** The reference of a vehicle on a corridor: the one set for that corridor, else for all of them. */
export function vehicleReference(
  rows: readonly FuelReferenceRow[],
  vehicleNo: string,
  routeTemplateNo: string | null
): FuelReferenceRow | null {
  const own = rows.filter((row) => row.vehicleNo === vehicleNo)
  return (
    (routeTemplateNo ? own.find((row) => row.routeTemplateNo === routeTemplateNo) : undefined) ??
    own.find((row) => row.routeTemplateNo === null) ??
    null
  )
}

export function registerFuelReferencesHandlers(router: MockRouter, db: MockDatabase): void {
  function assertUnique(vehicleNo: string, routeTemplateNo: string | null, no?: string) {
    const twin = db.fuelReferences
      .all()
      .find(
        (row) =>
          row.no !== no && row.vehicleNo === vehicleNo && row.routeTemplateNo === routeTemplateNo
      )
    if (twin) throw conflict(FLEET_MESSAGES.fuelReferenceDuplicate)
  }

  const readL100 = (input: Record<string, unknown>) =>
    readNumber(input, 'referenceL100', { required: true, min: 5, max: 100 }) ?? 0

  registerCrudResource(router, {
    basePath: '/fleet/fuel-references',
    feature: 'FUELREFERENCE',
    collection: db.fuelReferences,
    list: () => fuelReferencesApi(db),
    searchColumns: ['vehiclePlate', 'routeName'],
    create: (input) => {
      const vehicleNo = requireReference(db.vehicles, input, 'vehicleNo')
      const routeTemplateNo = optionalReference(db.routeTemplates, input, 'routeTemplateNo')
      assertUnique(vehicleNo, routeTemplateNo)
      return {
        no: nextNo(
          db.fuelReferences.all().map((row) => row.no),
          'CREF-',
          3
        ),
        vehicleNo,
        routeTemplateNo,
        referenceL100: readL100(input),
        comment: readString(input, 'comment')
      }
    },
    // The vehicle and the corridor make the reference: only the value and the comment change.
    update: (_existing, input) => ({
      ...('referenceL100' in input ? { referenceL100: readL100(input) } : {}),
      ...('comment' in input ? { comment: readString(input, 'comment') } : {})
    }),
    remove: () => undefined
  })
}
