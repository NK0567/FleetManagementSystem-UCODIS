import type { TyreApi } from '@/modules/maintenance/tyres/types/tyre.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export type TyreRow = MockRow &
  Pick<
    TyreApi,
    | 'serialNumber'
    | 'make'
    | 'size'
    | 'dotCode'
    | 'retreaded'
    | 'supplierNo'
    | 'price'
    | 'purchaseDate'
    | 'stints'
    | 'rotationFrom'
    | 'readings'
    | 'retreadCount'
    | 'retreadCost'
    | 'retreadingSince'
    | 'scrappedAt'
    | 'scrapReason'
    | 'history'
  >

const base = {
  size: '315/80 R22.5',
  dotCode: '1224',
  retreaded: false,
  supplierNo: 'PRS-004',
  price: 1_450_000,
  purchaseDate: '2026-03-20',
  stints: [],
  rotationFrom: null,
  readings: [],
  retreadCount: 0,
  retreadCost: 0,
  retreadingSince: null,
  scrappedAt: null,
  scrapReason: '',
  history: []
}

/** A tyre on VEH-001 since 150 000 km, with its last reading. */
const onTractor = (
  no: string,
  serialNumber: string,
  positionCode: string,
  reading: { pressureBar: number; treadMm: number },
  rotationKm = 175_000
) => ({
  ...base,
  no,
  serialNumber,
  make: positionCode === '1' || positionCode === '2' ? 'Michelin X Multi Z' : 'Bridgestone M729',
  stints: [
    {
      vehicleNo: 'VEH-001',
      positionCode,
      fromKm: 150_000,
      toKm: null,
      mountedAt: '2026-03-25T09:00:00',
      dismountedAt: null
    }
  ],
  rotationFrom: { km: rotationKm, date: '2026-08-01' },
  readings: [{ at: '2026-08-30T08:00:00', ...reading, by: 'MNT001' }]
})

const SEED: Omit<TyreRow, keyof typeof seedAudit>[] = [
  onTractor('PN-0001', 'MX4521887', '1', { pressureBar: 8.5, treadMm: 9 }),
  onTractor('PN-0002', 'MX4521888', '2', { pressureBar: 8.4, treadMm: 9.2 }),
  onTractor('PN-0003', 'BS7710231', '3', { pressureBar: 8.2, treadMm: 6 }, 150_000),
  onTractor('PN-0004', 'BS7710232', '4', { pressureBar: 8.1, treadMm: 1.8 }),
  onTractor('PN-0005', 'BS7710233', '5', { pressureBar: 6.5, treadMm: 7.5 }),
  onTractor('PN-0006', 'BS7710234', '6', { pressureBar: 8.3, treadMm: 7.4 }),
  onTractor('PN-0007', 'BS7710235', 'S1', { pressureBar: 8.6, treadMm: 12 }),
  { ...base, no: 'PN-0008', serialNumber: 'MX4530012', make: 'Michelin X Multi Z' },
  {
    ...base,
    no: 'PN-0009',
    serialNumber: 'RC0088120',
    make: 'Bridgestone M729',
    retreaded: true,
    supplierNo: 'PRS-005',
    price: 650_000
  },
  {
    ...base,
    no: 'PN-0010',
    serialNumber: 'BS7699001',
    make: 'Bridgestone M729',
    purchaseDate: '2025-06-10',
    stints: [
      {
        vehicleNo: 'VEH-002',
        positionCode: '3',
        fromKm: 98_000,
        toKm: 160_000,
        mountedAt: '2025-06-15T09:00:00',
        dismountedAt: '2026-08-20T10:00:00'
      }
    ],
    retreadingSince: '2026-08-21T09:00:00'
  },
  {
    ...base,
    no: 'PN-0011',
    serialNumber: 'BS7650440',
    make: 'Bridgestone M729',
    purchaseDate: '2024-11-02',
    stints: [
      {
        vehicleNo: 'VEH-002',
        positionCode: '4',
        fromKm: 60_000,
        toKm: 110_000,
        mountedAt: '2024-11-05T09:00:00',
        dismountedAt: '2025-06-15T08:00:00'
      },
      {
        vehicleNo: 'VEH-003',
        positionCode: '5',
        fromKm: 150_000,
        toKm: 190_000,
        mountedAt: '2025-06-20T09:00:00',
        dismountedAt: '2026-07-02T09:00:00'
      }
    ],
    retreadCount: 1,
    retreadCost: 380_000,
    scrappedAt: '2026-07-02T10:00:00',
    scrapReason: 'Carcasse coupée sur le flanc, non rechapable.'
  }
]

export const tyresCollection: CollectionDefinition<TyreRow> = {
  name: 'tyres',
  seed: () => SEED.map((row) => ({ ...structuredClone(row), ...seedAudit })),
  dateFields: [
    'purchaseDate',
    'stints[].mountedAt',
    'stints[].dismountedAt',
    'readings[].at',
    'rotationFrom.date',
    'retreadingSince',
    'scrappedAt'
  ]
}
