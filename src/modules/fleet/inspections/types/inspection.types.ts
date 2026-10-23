import type { InspectionState } from '../domain/inspection'

export const INSPECTION_RESULTS = ['conforming', 'non_conforming'] as const
export type InspectionResult = (typeof INSPECTION_RESULTS)[number]

export interface InspectionApi {
  no: string
  vehicleNo: string
  inspectedOn: string
  center: string
  result: InspectionResult
  findings: string
  recheckDoneOn: string | null
  vehiclePlate: string
  recheckDueOn: string | null
  state: InspectionState
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type InspectionSearchColumn = 'no' | 'vehiclePlate' | 'center' | 'no,vehiclePlate,center'
