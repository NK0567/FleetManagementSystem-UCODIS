import type { InspectionItemResult, InspectionState } from '../domain/inspection'

export const INSPECTION_RESULTS = ['conforming', 'non_conforming'] as const
export type InspectionResult = (typeof INSPECTION_RESULTS)[number]

export interface InspectionApi {
  /** The work order opened from this record, if any. */
  workOrderNo: string | null
  no: string
  vehicleNo: string
  inspectedOn: string
  center: string
  result: InspectionResult
  findings: string
  recheckDoneOn: string | null
  /** The grid as inspected; empty for an inspection recorded before the grid existed. */
  items: InspectionItemResult[]
  /** Who inspected and signed the report, and when he signed it. */
  inspector: string
  signedBy: string | null
  signedAt: string | null
  /** Codes of the non-conforming items, which the re-inspection looks at again. */
  recheckItemNos: string[]
  vehiclePlate: string
  recheckDueOn: string | null
  state: InspectionState
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type InspectionSearchColumn = 'no' | 'vehiclePlate' | 'center' | 'no,vehiclePlate,center'
