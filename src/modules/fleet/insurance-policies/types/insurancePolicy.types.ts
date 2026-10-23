import type { PolicyState } from '../domain/insurancePolicy'

export const INSURANCE_COVERAGES = [
  'third_party',
  'third_party_fire_theft',
  'comprehensive'
] as const
export type InsuranceCoverage = (typeof INSURANCE_COVERAGES)[number]

export interface InsurancePolicyApi {
  no: string
  vehicleNo: string
  insurerNo: string
  policyNumber: string
  coverage: InsuranceCoverage
  startDate: string
  endDate: string
  annualPremium: number | null
  deductible: number | null
  terminatedOn: string | null
  terminationReason: string
  vehiclePlate: string
  insurerName: string
  state: PolicyState
  notifyOn: string | null
  claimCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type InsurancePolicySearchColumn =
  | 'no'
  | 'policyNumber'
  | 'vehiclePlate'
  | 'insurerName'
  | 'no,policyNumber,vehiclePlate,insurerName'
