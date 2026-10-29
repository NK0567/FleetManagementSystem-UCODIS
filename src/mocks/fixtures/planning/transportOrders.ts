import { addDays } from '@/utils/date'
import type {
  TransportMeans,
  TransportOrderEventKind
} from '@/modules/planning/transport-orders/domain/transportOrder'
import {
  emptyFollowUp,
  type LineFollowUp
} from '@/modules/planning/customer-confirmations/domain/confirmation'
import {
  emptyQuality,
  type QualityFields
} from '@/modules/planning/delivery-quality/domain/quality'
import { emptyDossier, type OrderDossier } from '@/modules/planning/closing/domain/closing'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface TransportOrderLineRow extends LineFollowUp, QualityFields {
  lineNo: number
  deliveryRequestNo: string | null
  /** The line of the order (commande) it carries; absent reads as its first line. */
  requestLineNo?: number | null
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

export interface TransportOrderRow extends MockRow, OrderDossier {
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
  /** The pickup note: sent to the site, then confirmed with its data (TRS03-US03, US04). */
  pickup?: PickupRecord | null
}

export interface PickupRecord {
  sentAt: string | null
  sentTo: string
  confirmedAt: string | null
  confirmedBy: string | null
  documentRef: string
  entries: {
    compartmentNo: number
    lineNo: number
    loadedQuantity: number
    temperatureC: number | null
    density: number | null
    volume15L: number | null
  }[]
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
  ...emptyFollowUp(),
  ...emptyQuality()
})

/** A fixed token for the demo, so that the recipient's link can be opened from the data. */
const withToken = (
  order: { no: string; plannedDeparture: string | null },
  item: TransportOrderLineRow
): TransportOrderLineRow => ({
  ...item,
  trackingToken: `demo${order.no}${item.lineNo}`
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
    .padEnd(32, '0'),
  trackingExpiresOn: addDays((order.plannedDeparture ?? '2026-09-01').slice(0, 10), 30)
})

const event = (at: string, kind: TransportOrderEventKind, detail = ''): TransportOrderEventRow => ({
  at,
  by: 'FLT001',
  kind,
  detail
})

const SEED: Omit<TransportOrderRow, keyof typeof seedAudit | keyof OrderDossier>[] = [
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
    // Loaded and checked by the driver before leaving (TRS03-US05).
    lines: [
      {
        ...line(1, 'DL-2026-0010', 'DP-006', 'PRD-001', 150, 2200),
        loadedQuantity: 150,
        conformingAt: '2026-09-04T05:40:00'
      }
    ],
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
    carrierVehiclePlate: '2345 TBA',
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
  seed: () =>
    SEED.map((row) => ({
      ...row,
      // A planned order has sent its tracking links: one per line, as planning does.
      lines:
        row.means && !row.cancelledAt ? row.lines.map((item) => withToken(row, item)) : row.lines,
      ...emptyDossier(),
      ...seedAudit
    })),
  dateFields: [
    'plannedDeparture',
    'cancelledAt',
    'events[].at',
    'lines[].trackingExpiresOn',
    'lines[].conformingAt'
  ]
}
