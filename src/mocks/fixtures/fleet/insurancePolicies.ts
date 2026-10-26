import type { InsuranceCoverage } from '@/modules/fleet/insurance-policies/types/insurancePolicy.types'
import { addDays, addMonths } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'
import { documentsCollection } from './documents'

export interface InsurancePolicyRow extends MockRow {
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
}

type Seed = Omit<InsurancePolicyRow, keyof typeof seedAudit | 'no'>

const INSURERS: Record<string, string> = { ARO: 'PRS-010', NYH: 'PRS-011' }
const TRACTORS = 10

/**
 * One policy per insurance certificate of the vehicle documents, with the same number and dates,
 * so the contract and the proof carried in the cab never disagree.
 */
function fromCertificates(): Seed[] {
  return documentsCollection
    .seed()
    .filter((document) => document.documentTypeNo === 'VEH-INS' && document.issueDate)
    .map((certificate) => {
      const tractor = Number(certificate.subjectNo.slice(4)) <= TRACTORS
      return {
        vehicleNo: certificate.subjectNo,
        insurerNo: INSURERS[certificate.number.slice(0, 3)] ?? 'PRS-010',
        policyNumber: certificate.number,
        coverage: tractor ? 'comprehensive' : 'third_party_fire_theft',
        startDate: certificate.issueDate ?? '',
        // A renewed certificate ends the day its successor begins; the contract stops the day before.
        endDate: certificate.replacedByNo
          ? addDays(certificate.expiryDate ?? '', -1)
          : (certificate.expiryDate ?? ''),
        annualPremium: tractor ? 4_800_000 : 1_350_000,
        deductible: tractor ? 500_000 : 150_000,
        terminatedOn: null,
        terminationReason: ''
      }
    })
}

/** VEH-015 changed insurer: its former policy was terminated the day before the new one began. */
function formerPolicy(current: Seed[]): Seed[] {
  const next = current.find((policy) => policy.vehicleNo === 'VEH-015')
  if (!next) return []
  return [
    {
      ...next,
      insurerNo: 'PRS-010',
      policyNumber: 'ARO-2025-0015',
      startDate: addMonths(next.startDate, -8),
      endDate: addDays(addMonths(next.startDate, 4), -1),
      terminatedOn: addDays(next.startDate, -1),
      terminationReason: "Changement d'assureur : offre plus avantageuse de NY HAVANA."
    }
  ]
}

function seed(): Omit<InsurancePolicyRow, keyof typeof seedAudit>[] {
  const current = fromCertificates()
  return [...current, ...formerPolicy(current)].map((policy, index) => ({
    no: `POL-${String(index + 1).padStart(3, '0')}`,
    ...policy
  }))
}

export const insurancePoliciesCollection: CollectionDefinition<InsurancePolicyRow> = {
  name: 'insurance-policies',
  seed: () => seed().map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['startDate', 'endDate', 'terminatedOn']
}
