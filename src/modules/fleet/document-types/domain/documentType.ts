import type { DocumentTypeApi } from '../types/documentType.types'

type TypeScope = Pick<DocumentTypeApi, 'target' | 'active' | 'vehicleTypeNos' | 'personScope'>

/** A vehicle type concerned by the document type; an empty list means every vehicle. */
export function appliesToVehicle(type: TypeScope, vehicleTypeNo: string): boolean {
  return (
    type.active &&
    type.target === 'vehicle' &&
    (type.vehicleTypeNos.length === 0 || type.vehicleTypeNos.includes(vehicleTypeNo))
  )
}

/** People concerned, from whether their position involves driving. */
export function appliesToPerson(type: TypeScope, drives: boolean): boolean {
  if (!type.active || type.target !== 'person') return false
  if (type.personScope === 'drivers') return drives
  if (type.personScope === 'office') return !drives
  return true
}
