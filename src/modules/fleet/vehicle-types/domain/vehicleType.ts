import type { VehicleTypeApi } from '../types/vehicleType.types'

export type VehicleTypeIssue =
  | 'motorizedCannotBeTowed'
  | 'unpoweredCannotTow'
  | 'compartmentsNeedGoods'

type VehicleTypeShape = Pick<
  VehicleTypeApi,
  'motorized' | 'couplingRole' | 'carriesGoods' | 'hasCompartments'
>

/** The properties a type cannot combine; empty when the type is consistent. */
export function vehicleTypeIssues(type: VehicleTypeShape): VehicleTypeIssue[] {
  const issues: VehicleTypeIssue[] = []
  if (type.motorized && type.couplingRole === 'towed') issues.push('motorizedCannotBeTowed')
  if (!type.motorized && type.couplingRole === 'tows') issues.push('unpoweredCannotTow')
  if (type.hasCompartments && !type.carriesGoods) issues.push('compartmentsNeedGoods')
  return issues
}

/** Properties that other records rely on: they are frozen once a vehicle uses the type. */
export const VEHICLE_TYPE_STRUCTURAL_FIELDS = [
  'motorized',
  'couplingRole',
  'carriesGoods',
  'hasCompartments'
] as const
