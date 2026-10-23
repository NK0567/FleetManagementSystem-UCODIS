import type { MatchMode } from '@/modules/fleet/fuel-card-transactions/types/fuelCardTransaction.types'
import { addDays, addMinutes } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { seedAudit } from '../seedAudit'
import { seededRefills } from './fuelRefills'

export interface FuelCardTransactionRow extends MockRow {
  cardNo: string
  transactedAt: string
  station: string
  city: string
  liters: number
  amount: number
  refillNo: string | null
  matchMode: MatchMode | null
}

type Seed = Omit<FuelCardTransactionRow, keyof typeof seedAudit | 'no'>

/** The supplier's record of a seeded refill: a few minutes later, same litres and price. */
function fromRefill(
  cardNo: string,
  vehicleNo: string,
  index: number,
  city: string,
  matchMode: MatchMode | null
): Seed[] {
  const refill = seededRefills()
    .filter((row) => row.vehicleNo === vehicleNo)
    .sort((a, b) => a.refueledAt.localeCompare(b.refueledAt))[index]
  if (!refill) return []
  return [
    {
      cardNo,
      transactedAt: addMinutes(refill.refueledAt, 4),
      station: refill.stationName || 'Dépôt de Tanjombato',
      city,
      liters: refill.liters,
      amount: Math.round(refill.liters * refill.unitPrice),
      refillNo: matchMode === 'auto' || matchMode === 'manual' ? refill.no : null,
      matchMode
    }
  ]
}

const day = (days: number, time: string) => `${addDays(DEMO_REFERENCE_DATE, days)}T${time}:00`

function seed(): Omit<FuelCardTransactionRow, keyof typeof seedAudit>[] {
  return [
    ...fromRefill('CC-0001', 'VEH-001', 5, 'Antananarivo', 'auto'),
    ...fromRefill('CC-0001', 'VEH-001', 6, 'Antsirabe', null),
    // Detached by hand: an automatic match must leave it alone.
    ...fromRefill('CC-0001', 'VEH-001', 7, 'Antananarivo', 'detached'),
    ...fromRefill('CC-0002', 'VEH-002', 6, 'Antananarivo', 'auto'),
    ...fromRefill('CC-0002', 'VEH-002', 7, 'Antsirabe', 'auto'),
    {
      cardNo: 'CC-0002',
      transactedAt: day(-4, '22:40'),
      station: 'Station Galana Ivato',
      city: 'Antananarivo',
      liters: 120,
      amount: 660_000,
      refillNo: null,
      matchMode: null
    },
    ...fromRefill('CC-0004', 'VEH-006', 7, 'Antananarivo', 'auto'),
    {
      cardNo: 'CC-0005',
      transactedAt: day(-2, '10:15'),
      station: 'Station Jovena Ambohimanambola',
      city: 'Antananarivo',
      liters: 85,
      amount: 467_500,
      refillNo: null,
      matchMode: null
    }
  ].map((transaction, index) => ({
    no: `TX-${String(index + 1).padStart(5, '0')}`,
    ...transaction
  }))
}

export const fuelCardTransactionsCollection: CollectionDefinition<FuelCardTransactionRow> = {
  name: 'fuel-card-transactions',
  seed: () => seed().map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['transactedAt']
}
