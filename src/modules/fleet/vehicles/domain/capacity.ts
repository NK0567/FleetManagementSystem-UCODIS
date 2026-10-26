export interface LoadCapacity {
  maxLoadKg: number | null
  maxVolumeM3: number | null
  /** Sum of the compartments; 0 without compartments. */
  capacityL: number
}

export interface CarryingVehicle {
  carriesGoods: boolean
  maxLoadKg: number | null
  maxVolumeM3: number | null
  totalCapacityL: number
}

const capacityOf = (vehicle: CarryingVehicle): LoadCapacity => ({
  maxLoadKg: vehicle.maxLoadKg,
  maxVolumeM3: vehicle.maxVolumeM3,
  capacityL: vehicle.totalCapacityL
})

/**
 * What a combination can carry: a tractor carries what its trailer holds, a rigid truck carries
 * its own load. Null when nothing in it carries goods, such as a tractor on its own.
 */
export function combinationCapacity(
  vehicle: CarryingVehicle,
  trailer: CarryingVehicle | null
): LoadCapacity | null {
  if (trailer?.carriesGoods) return capacityOf(trailer)
  return vehicle.carriesGoods ? capacityOf(vehicle) : null
}
