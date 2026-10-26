import { layoutPositions, type TyrePosition } from '@/modules/maintenance/tyres/domain/tyre'
import type { MockDatabase } from '../../db/database'
import type { TyreRow } from '../../fixtures/maintenance/tyres'

export function openStint(tyre: Pick<TyreRow, 'stints'>) {
  return tyre.stints.find((stint) => stint.toKm === null) ?? null
}

/** The positions a vehicle offers, from the layout of its type; empty when its type has none. */
export function vehiclePositions(db: MockDatabase, vehicleNo: string): TyrePosition[] {
  const vehicle = db.vehicles.find(vehicleNo)
  const layout = vehicle ? db.tyreLayouts.find(vehicle.vehicleTypeNo) : undefined
  return layout ? layoutPositions(layout) : []
}

/** The tyre on each mounted position, keyed `vehicleNo position`. */
export function mountedTyres(db: MockDatabase): Map<string, TyreRow> {
  const mounted = new Map<string, TyreRow>()
  for (const tyre of db.tyres.all()) {
    const stint = openStint(tyre)
    if (stint) mounted.set(`${stint.vehicleNo} ${stint.positionCode}`, tyre)
  }
  return mounted
}
