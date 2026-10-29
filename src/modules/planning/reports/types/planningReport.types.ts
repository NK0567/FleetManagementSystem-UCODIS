import type {
  TransportMeans,
  TransportOrderStatus
} from '@/modules/planning/transport-orders/domain/transportOrder'
import type { RateGroup } from '../domain/indicators'

export type { RateGroup }

/** Carrier indicators over the orders of the user perimeter. Rates are percentages. */
export interface CarrierReportRow {
  carrierNo: string
  carrierName: string | null
  orders: number
  punctuality: number | null
  confirmation: number | null
  contestation: number | null
  refusals: number
  partials: number
  invoices: number
  invoicesOutside: number
  withoutTariff: number
  /** Invoiced above (positive) or below the tariff, over the invoices with a tariff. */
  invoiceGap: number
}

/** Planned departure bounds, depot, region and orderer; an empty value does not filter. */
export interface ReportFilters {
  from: string
  to: string
  depotNo: string
  region: string
  ordererNo: string
}

export interface ReportChoices {
  depots: { no: string; name: string }[]
  regions: string[]
  orderers: { no: string; name: string }[]
}

export type DashboardAlertKind =
  | 'nonconformity'
  | 'refusal'
  | 'contestation'
  | 'gap'
  | 'protest'
  | 'deviation'

export interface PlanningDashboardApi {
  filters: ReportFilters
  choices: ReportChoices
  orders: number
  byStatus: Partial<Record<TransportOrderStatus, number>>
  late: {
    orderNo: string
    status: TransportOrderStatus
    recipientSummary: string
    plannedDeparture: string | null
    plannedArrival: string | null
    kind: 'departure' | 'arrival'
  }[]
  alerts: {
    orderNo: string
    status: TransportOrderStatus
    recipientSummary: string
    kind: DashboardAlertKind
    count: number
  }[]
  /** Commandes still waiting for a transport order. */
  pendingRequests: {
    no: string
    ordererName: string
    recipientName: string
    deliveryPointName: string
    productName: string
    desiredDate: string
    overdue: boolean
  }[]
  punctuality: number | null
  confirmation: number | null
  contestation: number | null
  lines: {
    declared: number
    attested: number
    contested: number
    onTime: number
    arrived: number
  }
  toInvoice: number
  toInvoiceAmount: number
  invoicesToCheck: number
  carriers: CarrierReportRow[]
}

export interface DeliveryPunctualityRow {
  orderNo: string
  deliveryPointNo: string
  deliveryPointName: string
  recipientNo: string
  recipientName: string
  /** The carrier number, or « fleet » for the own fleet. */
  carrierKey: string
  carrierName: string
  plannedAt: string
  actualAt: string
  delayMin: number
  onTime: boolean
}

export interface OrderCostRow {
  orderNo: string
  means: TransportMeans | null
  carrierName: string
  vehiclePlate: string
  distanceKm: number | null
  vehicleCost: number | null
  fuelCost: number | null
  carrierInvoice: number | null
  total: number | null
}

export interface MeansRow {
  orderNo: string
  status: TransportOrderStatus
  means: TransportMeans | null
  vehiclePlate: string
  carrierName: string
  weightKg: number | null
  capacityKg: number | null
  weightRate: number | null
  volumeL: number | null
  capacityL: number | null
  volumeRate: number | null
  deliveries: number
  distanceKm: number | null
}

export const OUTCOME_KEYS = [
  'confirmed',
  'partial',
  'refused',
  'postponed',
  'contested',
  'returned'
] as const
export type OutcomeKey = (typeof OUTCOME_KEYS)[number]

export interface TransportReportApi {
  filters: ReportFilters
  choices: ReportChoices
  orders: number
  punctuality: {
    marginMin: number
    onTime: number
    total: number
    rate: number | null
    deliveries: DeliveryPunctualityRow[]
    byPeriod: RateGroup[]
    byRecipient: RateGroup[]
    byCarrier: RateGroup[]
  }
  costs: {
    orders: OrderCostRow[]
    totals: { vehicleCost: number; fuelCost: number; carrierInvoice: number; total: number }
  }
  quality: Record<OutcomeKey | 'concerned', number> & {
    rates: Record<OutcomeKey, number | null>
    satisfaction: {
      recipientAverage: number | null
      recipientCount: number
      ordererOrder: number | null
      ordererDelay: number | null
      ordererQuality: number | null
      ordererCount: number
    }
    fuelGaps: {
      gainCount: number
      gainVolume: number
      lossCount: number
      lossVolume: number
      unqualified: number
      rows: {
        orderNo: string
        lineNo: number
        recipientName: string
        productName: string
        unit: string
        gap: number
        qualification: 'gain' | 'loss' | null
      }[]
    }
  }
  means: {
    orders: MeansRow[]
    averages: {
      weightRate: number | null
      volumeRate: number | null
      deliveries: number | null
      distanceKm: number
    }
  }
  carriers: CarrierReportRow[]
}
