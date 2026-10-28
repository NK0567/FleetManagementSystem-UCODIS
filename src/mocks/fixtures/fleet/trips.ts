import type { RouteStop } from '@/modules/fleet/route-templates/domain/routeTemplate'
import type { TripStatus } from '@/modules/fleet/trips/domain/trip'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'
import { ROUTE_TEMPLATE_STOPS } from './routeTemplates'

export interface TripStopRow extends RouteStop {
  passedAt: string | null
}

export interface TripRow extends MockRow {
  routeTemplateNo: string
  vehicleNo: string
  trailerNo: string | null
  driverNo: string
  plannedDeparture: string
  /** Copied from the route when the trip is planned: later changes of the route keep the past. */
  stops: TripStopRow[]
  referenceKm: number
  actualDeparture: string | null
  actualArrival: string | null
  startOdometerKm: number | null
  endOdometerKm: number | null
  status: TripStatus
  cancelReason: string
  closedAt: string | null
  closedBy: string | null
  cancelledAt: string | null
  cancelledBy: string | null
}

const REFERENCE_KM: Record<string, number> = { 'TNR-TOA': 352, 'TNR-ATS': 168, 'TNR-MJN': 570 }

interface TripSeed {
  no: string
  route: 'TNR-TOA' | 'TNR-ATS' | 'TNR-MJN'
  vehicleNo: string
  trailerNo: string
  driverNo: string
  plannedDeparture: string
  status: TripStatus
  /** Times the stops were passed, in order; missing ones are still ahead. */
  passed?: string[]
  km?: [number, number | null]
  cancelReason?: string
}

function trip(seed: TripSeed): Omit<TripRow, keyof typeof seedAudit> {
  const passed = seed.passed ?? []
  const done = seed.status === 'completed' || seed.status === 'closed'
  return {
    no: seed.no,
    routeTemplateNo: seed.route,
    vehicleNo: seed.vehicleNo,
    trailerNo: seed.trailerNo,
    driverNo: seed.driverNo,
    plannedDeparture: seed.plannedDeparture,
    stops: ROUTE_TEMPLATE_STOPS[seed.route].map((stop, index) => ({
      ...stop,
      passedAt: passed[index] ?? null
    })),
    referenceKm: REFERENCE_KM[seed.route] ?? 0,
    actualDeparture: passed[0] ?? null,
    actualArrival: done ? (passed[passed.length - 1] ?? null) : null,
    startOdometerKm: seed.km?.[0] ?? null,
    endOdometerKm: seed.km?.[1] ?? null,
    status: seed.status,
    cancelReason: seed.cancelReason ?? '',
    closedAt: seed.status === 'closed' ? (passed[passed.length - 1] ?? null) : null,
    closedBy: seed.status === 'closed' ? 'FLT001' : null,
    cancelledAt: seed.status === 'cancelled' ? '2026-09-02T16:00:00' : null,
    cancelledBy: seed.status === 'cancelled' ? 'FLT001' : null
  }
}

const SEED: TripSeed[] = [
  {
    no: 'TRP-00001',
    route: 'TNR-TOA',
    vehicleNo: 'VEH-001',
    trailerNo: 'VEH-011',
    driverNo: 'UCT-010',
    plannedDeparture: '2026-08-24T05:30:00',
    status: 'completed',
    passed: [
      '2026-08-24T05:48:00',
      '2026-08-24T06:20:00',
      '2026-08-24T08:55:00',
      '2026-08-24T11:20:00',
      '2026-08-24T14:12:00'
    ],
    km: [182022, 182400]
  },
  {
    no: 'TRP-00002',
    route: 'TNR-MJN',
    vehicleNo: 'VEH-002',
    trailerNo: 'VEH-012',
    driverNo: 'UCT-011',
    plannedDeparture: '2026-08-20T05:00:00',
    status: 'closed',
    passed: [
      '2026-08-20T05:10:00',
      '2026-08-20T07:25:00',
      '2026-08-20T11:50:00',
      '2026-08-20T17:40:00'
    ],
    km: [165328, 165900]
  },
  {
    no: 'TRP-00003',
    route: 'TNR-TOA',
    vehicleNo: 'VEH-004',
    trailerNo: 'VEH-014',
    driverNo: 'UCT-013',
    plannedDeparture: '2026-08-26T06:00:00',
    status: 'closed',
    passed: [
      '2026-08-26T06:22:00',
      '2026-08-26T06:50:00',
      '2026-08-26T09:15:00',
      '2026-08-26T11:40:00',
      '2026-08-26T14:05:00'
    ],
    km: [98139, 98500]
  },
  {
    no: 'TRP-00004',
    route: 'TNR-ATS',
    vehicleNo: 'VEH-006',
    trailerNo: 'VEH-016',
    driverNo: 'UCT-015',
    plannedDeparture: '2026-08-10T06:00:00',
    status: 'closed',
    passed: ['2026-08-10T06:10:00', '2026-08-10T07:55:00', '2026-08-10T09:45:00'],
    km: [176532, 176700]
  },
  {
    no: 'TRP-00005',
    route: 'TNR-MJN',
    vehicleNo: 'VEH-010',
    trailerNo: 'VEH-020',
    driverNo: 'UCT-019',
    plannedDeparture: '2026-08-22T05:30:00',
    status: 'closed',
    passed: [
      '2026-08-22T05:35:00',
      '2026-08-22T07:50:00',
      '2026-08-22T12:20:00',
      '2026-08-22T17:50:00'
    ],
    km: [112030, 112600]
  },
  {
    no: 'TRP-00006',
    route: 'TNR-TOA',
    vehicleNo: 'VEH-003',
    trailerNo: 'VEH-013',
    driverNo: 'UCT-012',
    plannedDeparture: '2026-09-04T06:00:00',
    status: 'in_progress',
    passed: ['2026-09-04T06:05:00', '2026-09-04T06:32:00'],
    km: [201300, null]
  },
  {
    no: 'TRP-00007',
    route: 'TNR-MJN',
    vehicleNo: 'VEH-007',
    trailerNo: 'VEH-017',
    driverNo: 'UCT-014',
    plannedDeparture: '2026-09-04T14:00:00',
    status: 'planned'
  },
  {
    no: 'TRP-00008',
    route: 'TNR-ATS',
    vehicleNo: 'VEH-004',
    trailerNo: 'VEH-014',
    driverNo: 'UCT-013',
    plannedDeparture: '2026-09-05T06:00:00',
    status: 'planned'
  },
  {
    no: 'TRP-00009',
    route: 'TNR-ATS',
    vehicleNo: 'VEH-002',
    trailerNo: 'VEH-012',
    driverNo: 'UCT-011',
    plannedDeparture: '2026-09-03T06:00:00',
    status: 'cancelled',
    cancelReason: 'Le client a reporté la livraison.'
  }
]

export const tripsCollection: CollectionDefinition<TripRow> = {
  name: 'trips',
  seed: () => SEED.map((row) => ({ ...trip(row), ...seedAudit })),
  dateFields: [
    'plannedDeparture',
    'actualDeparture',
    'actualArrival',
    'closedAt',
    'cancelledAt',
    'stops[].passedAt'
  ]
}
