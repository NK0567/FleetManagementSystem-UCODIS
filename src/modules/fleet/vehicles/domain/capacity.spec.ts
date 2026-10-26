import { describe, expect, it } from 'vitest'
import { combinationCapacity, type CarryingVehicle } from './capacity'

const tractor: CarryingVehicle = {
  carriesGoods: false,
  maxLoadKg: null,
  maxVolumeM3: null,
  totalCapacityL: 0
}
const tanker: CarryingVehicle = {
  carriesGoods: true,
  maxLoadKg: 32_000,
  maxVolumeM3: null,
  totalCapacityL: 36_000
}
const rigid: CarryingVehicle = {
  carriesGoods: true,
  maxLoadKg: 12_000,
  maxVolumeM3: 45,
  totalCapacityL: 0
}

describe('combinationCapacity', () => {
  it('reads the trailer behind a tractor', () => {
    expect(combinationCapacity(tractor, tanker)).toEqual({
      maxLoadKg: 32_000,
      maxVolumeM3: null,
      capacityL: 36_000
    })
  })

  it('reads a rigid truck on its own and gives nothing for a lone tractor', () => {
    expect(combinationCapacity(rigid, null)).toEqual({
      maxLoadKg: 12_000,
      maxVolumeM3: 45,
      capacityL: 0
    })
    expect(combinationCapacity(tractor, null)).toBeNull()
  })
})
