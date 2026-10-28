import type { CardHolderType } from '@/modules/fleet/fuel-cards/domain/fuelCard'
import type { CardEvent } from '@/modules/fleet/fuel-cards/types/fuelCard.types'
import { addDays } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { seedAudit } from '../seedAudit'

export interface FuelCardRow extends MockRow {
  number: string
  supplierNo: string
  holderType: CardHolderType
  vehicleNo: string | null
  driverNo: string | null
  expiresOn: string
  monthlyAmount: number | null
  monthlyVolumeL: number | null
  transactionsPerDay: number | null
  zones: string[]
  startHour: number | null
  endHour: number | null
  blockedAt: string | null
  blockReason: string
  history: CardEvent[]
}

const STANDARD = {
  monthlyAmount: 12_000_000,
  monthlyVolumeL: 2_000,
  transactionsPerDay: 3,
  zones: [] as string[],
  startHour: 4,
  endHour: 21,
  blockedAt: null,
  blockReason: '',
  history: [] as CardEvent[]
}

const blockedAt = `${addDays(DEMO_REFERENCE_DATE, -6)}T12:00:00.000Z`

const SEED: Omit<FuelCardRow, keyof typeof seedAudit>[] = [
  {
    no: 'CC-0001',
    number: '7089 1200 0001 4021',
    supplierNo: 'PRS-007',
    holderType: 'vehicle',
    vehicleNo: 'VEH-001',
    driverNo: null,
    expiresOn: '2027-06-30',
    ...STANDARD
  },
  {
    no: 'CC-0002',
    number: '7089 1200 0002 4022',
    supplierNo: 'PRS-007',
    holderType: 'vehicle',
    vehicleNo: 'VEH-002',
    driverNo: null,
    expiresOn: '2027-06-30',
    ...STANDARD,
    zones: ['Antananarivo', 'Toamasina', 'Mahajanga']
  },
  {
    no: 'CC-0003',
    number: '7089 1200 0003 4024',
    supplierNo: 'PRS-007',
    holderType: 'vehicle',
    vehicleNo: 'VEH-004',
    driverNo: null,
    expiresOn: '2027-06-30',
    ...STANDARD
  },
  {
    no: 'CC-0004',
    number: '6120 8800 0004 0015',
    supplierNo: 'PRS-008',
    holderType: 'driver',
    vehicleNo: null,
    driverNo: 'UCT-015',
    expiresOn: '2027-03-31',
    ...STANDARD,
    monthlyAmount: 8_000_000,
    monthlyVolumeL: 1_400
  },
  {
    no: 'CC-0005',
    number: '7089 1200 0005 4029',
    supplierNo: 'PRS-007',
    holderType: 'vehicle',
    vehicleNo: 'VEH-009',
    driverNo: null,
    expiresOn: '2027-06-30',
    ...STANDARD,
    blockedAt,
    blockReason: 'Véhicule hors service après accident',
    history: [
      {
        at: blockedAt,
        by: 'FLT001',
        kind: 'blocked',
        comment: 'Véhicule hors service après accident'
      }
    ]
  }
]

export const fuelCardsCollection: CollectionDefinition<FuelCardRow> = {
  name: 'fuel-cards',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['blockedAt', 'history[].at']
}
