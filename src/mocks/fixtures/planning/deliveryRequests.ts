import type {
  DeliveryRequestOrigin,
  FreightPayer
} from '@/modules/planning/delivery-requests/types/deliveryRequest.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

function request(
  no: string,
  ordererNo: string,
  deliveryPointNo: string,
  productNo: string,
  quantity: number,
  weightKg: number | null,
  desiredDate: string,
  transportOrderNo: string
): Omit<DeliveryRequestRow, keyof typeof seedAudit> {
  return {
    no,
    ordererNo,
    deliveryPointNo,
    productNo,
    quantity,
    weightKg,
    volumeM3: null,
    desiredDate,
    validUntil: null,
    externalReference: '',
    freightPayer: 'orderer',
    comment: '',
    origin: 'planner',
    parentNo: null,
    rejectionReasonNo: null,
    rejectionComment: '',
    rejectedAt: null,
    rejectedBy: null,
    cancellationReasonNo: null,
    cancellationComment: '',
    cancelledAt: null,
    cancelledBy: null,
    transportOrderNo
  }
}

export interface DeliveryRequestRow extends MockRow {
  ordererNo: string
  deliveryPointNo: string
  desiredDate: string
  validUntil: string | null
  externalReference: string
  freightPayer: FreightPayer
  comment: string
  productNo: string
  quantity: number
  weightKg: number | null
  volumeM3: number | null
  origin: DeliveryRequestOrigin
  /** The request a part was split from. */
  parentNo: string | null
  rejectionReasonNo: string | null
  rejectionComment: string
  rejectedAt: string | null
  rejectedBy: string | null
  cancellationReasonNo: string | null
  cancellationComment: string
  cancelledAt: string | null
  cancelledBy: string | null
  transportOrderNo: string | null
}

const SEED: Omit<DeliveryRequestRow, keyof typeof seedAudit>[] = [
  {
    no: 'DL-2026-0001',
    ordererNo: 'CLI-002',
    deliveryPointNo: 'DP-002',
    productNo: 'PRD-001',
    quantity: 420,
    weightKg: 6300,
    volumeM3: null,
    desiredDate: '2026-09-08',
    validUntil: null,
    externalReference: 'LPA-5512',
    freightPayer: 'orderer',
    comment: '',
    origin: 'request',
    parentNo: null,
    rejectionReasonNo: null,
    rejectionComment: '',
    rejectedAt: null,
    rejectedBy: null,
    cancellationReasonNo: null,
    cancellationComment: '',
    cancelledAt: null,
    cancelledBy: null,
    transportOrderNo: null
  },
  {
    no: 'DL-2026-0002',
    ordererNo: 'CLI-004',
    deliveryPointNo: 'DP-001',
    productNo: 'PRD-002',
    quantity: 180,
    weightKg: 2700,
    volumeM3: null,
    desiredDate: '2026-09-07',
    validUntil: null,
    externalReference: '',
    freightPayer: 'orderer',
    comment: '',
    origin: 'request',
    parentNo: null,
    rejectionReasonNo: null,
    rejectionComment: '',
    rejectedAt: null,
    rejectedBy: null,
    cancellationReasonNo: null,
    cancellationComment: '',
    cancelledAt: null,
    cancelledBy: null,
    transportOrderNo: null
  },
  {
    no: 'DL-2026-0003',
    ordererNo: 'CLI-004',
    deliveryPointNo: 'DP-003',
    productNo: 'PRD-003',
    quantity: 650,
    weightKg: 9750,
    volumeM3: null,
    desiredDate: '2026-09-10',
    validUntil: '2026-09-15',
    externalReference: '',
    freightPayer: 'orderer',
    comment: '',
    origin: 'request',
    parentNo: null,
    rejectionReasonNo: null,
    rejectionComment: '',
    rejectedAt: null,
    rejectedBy: null,
    cancellationReasonNo: null,
    cancellationComment: '',
    cancelledAt: null,
    cancelledBy: null,
    transportOrderNo: null
  },
  {
    no: 'DL-2026-0004',
    ordererNo: 'CLI-010',
    deliveryPointNo: 'DP-009',
    productNo: 'PRD-006',
    quantity: 18000,
    weightKg: null,
    volumeM3: null,
    desiredDate: '2026-09-06',
    validUntil: null,
    externalReference: 'RSH-0907',
    freightPayer: 'orderer',
    comment: '',
    origin: 'request',
    parentNo: null,
    rejectionReasonNo: null,
    rejectionComment: '',
    rejectedAt: null,
    rejectedBy: null,
    cancellationReasonNo: null,
    cancellationComment: '',
    cancelledAt: null,
    cancelledBy: null,
    transportOrderNo: null
  },
  {
    no: 'DL-2026-0005',
    ordererNo: 'CLI-002',
    deliveryPointNo: 'DP-005',
    productNo: 'PRD-004',
    quantity: 90,
    weightKg: 900,
    volumeM3: null,
    desiredDate: '2026-09-02',
    validUntil: '2026-09-03',
    externalReference: '',
    freightPayer: 'orderer',
    comment: '',
    origin: 'request',
    parentNo: null,
    rejectionReasonNo: null,
    rejectionComment: '',
    rejectedAt: null,
    rejectedBy: null,
    cancellationReasonNo: null,
    cancellationComment: '',
    cancelledAt: null,
    cancelledBy: null,
    transportOrderNo: null
  },
  {
    no: 'DL-2026-0006',
    ordererNo: 'CLI-004',
    deliveryPointNo: 'DP-007',
    productNo: 'PRD-005',
    quantity: 3,
    weightKg: null,
    volumeM3: null,
    desiredDate: '2026-09-09',
    validUntil: null,
    externalReference: '',
    freightPayer: 'orderer',
    comment: '',
    origin: 'request',
    parentNo: null,
    rejectionReasonNo: 'REJ-INCOMPLETE',
    rejectionComment: 'Quantité en unités : le poids manque pour planifier.',
    rejectedAt: '2026-09-03T15:20:00',
    rejectedBy: 'FLT001',
    cancellationReasonNo: null,
    cancellationComment: '',
    cancelledAt: null,
    cancelledBy: null,
    transportOrderNo: null
  },
  request('DL-2026-0007', 'CLI-002', 'DP-002', 'PRD-001', 200, 3000, '2026-09-09', 'TR-2026-0001'),
  request('DL-2026-0008', 'CLI-004', 'DP-001', 'PRD-002', 80, 1200, '2026-09-09', 'TR-2026-0001'),
  request('DL-2026-0009', 'CLI-004', 'DP-003', 'PRD-003', 400, 6000, '2026-09-04', 'TR-2026-0002'),
  request('DL-2026-0010', 'CLI-002', 'DP-006', 'PRD-001', 150, 2200, '2026-09-04', 'TR-2026-0003'),
  request('DL-2026-0011', 'CLI-002', 'DP-005', 'PRD-004', 60, 600, '2026-09-08', 'TR-2026-0004')
]

export const deliveryRequestsCollection: CollectionDefinition<DeliveryRequestRow> = {
  name: 'delivery-requests',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['desiredDate', 'validUntil', 'rejectedAt', 'cancelledAt']
}
