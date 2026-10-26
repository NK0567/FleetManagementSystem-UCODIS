import type {
  TransportMeans,
  TransportOrderEventKind
} from '@/modules/planning/transport-orders/domain/transportOrder'
import {
  emptyFollowUp,
  type LineFollowUp
} from '@/modules/planning/customer-confirmations/domain/confirmation'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface TransportOrderLineRow extends LineFollowUp {
  lineNo: number
  deliveryRequestNo: string | null
  deliveryPointNo: string
  productNo: string
  quantity: number
  weightKg: number | null
}

export interface TransportOrderEventRow {
  at: string
  by: string
  kind: TransportOrderEventKind
  detail: string
}

export interface TransportOrderRow extends MockRow {
  routeTemplateNo: string | null
  plannedDeparture: string | null
  comment: string
  lines: TransportOrderLineRow[]
  means: TransportMeans | null
  tripNo: string | null
  carrierNo: string | null
  carrierVehiclePlate: string
  carrierDriverName: string
  carrierDepartedAt: string | null
  carrierArrivedAt: string | null
  cancellationReasonNo: string | null
  cancellationComment: string
  cancelledAt: string | null
  cancelledBy: string | null
  events: TransportOrderEventRow[]
}

const line = (
  lineNo: number,
  deliveryRequestNo: string | null,
  deliveryPointNo: string,
  productNo: string,
  quantity: number,
  weightKg: number | null
): TransportOrderLineRow => ({
  lineNo,
  deliveryRequestNo,
  deliveryPointNo,
  productNo,
  quantity,
  weightKg,
  ...emptyFollowUp()
})

const event = (at: string, kind: TransportOrderEventKind, detail = ''): TransportOrderEventRow => ({
  at,
  by: 'FLT001',
  kind,
  detail
})

const SEED: Omit<TransportOrderRow, keyof typeof seedAudit>[] = [
  {
    no: 'TR-2026-0001',
    routeTemplateNo: 'TNR-ATS',
    plannedDeparture: '2026-09-09T08:00:00',
    comment: 'Deux enseignes vers Antsirabe, à planifier.',
    lines: [
      line(1, 'DL-2026-0007', 'DP-002', 'PRD-001', 200, 3000),
      line(2, 'DL-2026-0008', 'DP-001', 'PRD-002', 80, 1200)
    ],
    means: null,
    tripNo: null,
    carrierNo: null,
    carrierVehiclePlate: '',
    carrierDriverName: '',
    carrierDepartedAt: null,
    carrierArrivedAt: null,
    cancellationReasonNo: null,
    cancellationComment: '',
    cancelledAt: null,
    cancelledBy: null,
    events: [
      event('2026-09-02T09:00:00', 'created'),
      event('2026-09-02T09:05:00', 'lines_changed', '2')
    ]
  },
  {
    no: 'TR-2026-0002',
    routeTemplateNo: 'TNR-MJN',
    plannedDeparture: '2026-09-04T14:00:00',
    comment: '',
    lines: [line(1, 'DL-2026-0009', 'DP-003', 'PRD-003', 400, 6000)],
    means: 'fleet',
    tripNo: 'TRP-00007',
    carrierNo: null,
    carrierVehiclePlate: '',
    carrierDriverName: '',
    carrierDepartedAt: null,
    carrierArrivedAt: null,
    cancellationReasonNo: null,
    cancellationComment: '',
    cancelledAt: null,
    cancelledBy: null,
    events: [
      event('2026-09-03T16:00:00', 'created'),
      event('2026-09-03T16:20:00', 'planned', 'TRP-00007')
    ]
  },
  {
    no: 'TR-2026-0003',
    routeTemplateNo: 'TNR-TOA',
    plannedDeparture: '2026-09-04T06:00:00',
    comment: '',
    lines: [line(1, 'DL-2026-0010', 'DP-006', 'PRD-001', 150, 2200)],
    means: 'fleet',
    tripNo: 'TRP-00006',
    carrierNo: null,
    carrierVehiclePlate: '',
    carrierDriverName: '',
    carrierDepartedAt: null,
    carrierArrivedAt: null,
    cancellationReasonNo: null,
    cancellationComment: '',
    cancelledAt: null,
    cancelledBy: null,
    events: [
      event('2026-09-03T18:00:00', 'created'),
      event('2026-09-03T18:10:00', 'planned', 'TRP-00006')
    ]
  },
  {
    no: 'TR-2026-0004',
    routeTemplateNo: 'TNR-ATS',
    plannedDeparture: '2026-09-08T08:00:00',
    comment: '',
    lines: [line(1, 'DL-2026-0011', 'DP-005', 'PRD-004', 60, 600)],
    means: 'carrier',
    tripNo: null,
    carrierNo: 'PRS-016',
    carrierVehiclePlate: '1234 TBA',
    carrierDriverName: 'Hery Rakoto',
    carrierDepartedAt: null,
    carrierArrivedAt: null,
    cancellationReasonNo: null,
    cancellationComment: '',
    cancelledAt: null,
    cancelledBy: null,
    events: [
      event('2026-09-03T11:00:00', 'created'),
      event('2026-09-03T11:15:00', 'planned', 'PRS-016')
    ]
  },
  {
    no: 'TR-2026-0005',
    routeTemplateNo: 'TNR-TOA',
    plannedDeparture: '2026-09-02T08:00:00',
    comment: '',
    lines: [line(1, null, 'DP-001', 'PRD-001', 40, 600)],
    means: null,
    tripNo: null,
    carrierNo: null,
    carrierVehiclePlate: '',
    carrierDriverName: '',
    carrierDepartedAt: null,
    carrierArrivedAt: null,
    cancellationReasonNo: 'CXL-CUSTOMER',
    cancellationComment: 'Le client a reporté.',
    cancelledAt: '2026-09-03T11:00:00',
    cancelledBy: 'FLT001',
    events: [
      event('2026-09-02T08:30:00', 'created'),
      event('2026-09-03T11:00:00', 'cancelled', 'CXL-CUSTOMER')
    ]
  }
]

export const transportOrdersCollection: CollectionDefinition<TransportOrderRow> = {
  name: 'transport-orders',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['plannedDeparture', 'cancelledAt', 'events[].at']
}
