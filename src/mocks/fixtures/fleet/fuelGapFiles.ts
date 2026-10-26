import type { FuelGapStatus } from '@/modules/fleet/fuel-consumption/domain/consumption'
import type { FuelGapFile } from '@/modules/fleet/fuel-consumption/types/fuelConsumption.types'
import { addDays } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { seedAudit } from '../seedAudit'
import { seededRefills } from './fuelRefills'

export interface FuelGapFileRow extends MockRow, FuelGapFile {
  status: Exclude<FuelGapStatus, 'normal' | 'to_qualify'>
}

/** The period of VEH-003 that burnt too much: qualified, a deduction awaits a second person. */
function proposedDeduction(): Omit<FuelGapFileRow, keyof typeof seedAudit>[] {
  const closing = seededRefills()
    .filter((refill) => refill.vehicleNo === 'VEH-003')
    .sort((a, b) => a.refueledAt.localeCompare(b.refueledAt))[5]
  if (!closing) return []
  const at = (days: number) => `${addDays(DEMO_REFERENCE_DATE, days)}T09:00:00.000Z`
  return [
    {
      no: `VEH-003:${closing.no}`,
      status: 'deduction_proposed',
      causeNo: 'DRIVING',
      comment: 'Ralenti prolongé relevé à trois livraisons ; conducteur entendu.',
      qualifiedBy: 'FLT001',
      qualifiedAt: at(-10),
      proposedAmount: 50_000,
      proposedBy: 'FLT001',
      proposedAt: at(-9),
      decisionComment: '',
      decidedBy: null,
      decidedAt: null
    }
  ]
}

export const fuelGapFilesCollection: CollectionDefinition<FuelGapFileRow> = {
  name: 'fuel-gap-files',
  seed: () => proposedDeduction().map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['qualifiedAt', 'proposedAt', 'decidedAt']
}
