import type { FileMeta } from '@/types/file.types'
import type { DeviationNature } from '@/modules/fleet/route-deviations/domain/routeDeviation'
import type { ProtestStatus } from '@/modules/planning/delivery-quality/domain/quality'
import type { TransportOrderApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import type { DossierPieceKind, DossierPieceState, OrderDebriefing } from '../domain/closing'

export interface DossierPieceApi {
  kind: DossierPieceKind
  state: DossierPieceState
  reference: string
  at: string | null
  fileNo: string | null
  file: FileMeta | null
  /** The recipient, for a delivery note. */
  label: string
  /** A fuel order: the depot hands over a BSL. */
  fuel: boolean
}

export type IncidentKind =
  | 'loading_nonconformity'
  | 'refusal'
  | 'undelivered'
  | 'quantity_gap'
  | 'contestation'
  | 'return_nonconformity'
  | 'low_satisfaction'
  | 'protest'
  | 'postponement'
  | 'route_deviation'
  | 'cancellation'

export interface IncidentApi {
  kind: IncidentKind
  lineNo: number | null
  at: string | null
  detail: string
}

/** The documentary dossier of an order, put together on its own (TRS05-US04). */
export interface DocumentaryDossierApi {
  pieces: DossierPieceApi[]
  complete: boolean
  incidents: IncidentApi[]
  /** Other files filed on the order. */
  documents: { kind: string; fileNo: string; file: FileMeta | null }[]
}

export interface OrderGapApi {
  lineNo: number
  productName: string
  unit: string
  gap: number
  qualification: 'gain' | 'loss' | null
  /** Whether the qualified gap is put on the driver (TRS03-US17). */
  imputableToDriver: boolean | null
}

export type GoodsOutcome =
  | 'pending'
  | 'not_loaded'
  | 'delivered'
  | 'partial'
  | 'refused'
  | 'postponed'
  | 'returned'

/** The complete file of an order in one place (TRS02-US07). */
export interface OrderDossierApi {
  order: TransportOrderApi
  routePlan: {
    siteNo: string
    siteName: string
    role: string
    plannedAt: string | null
    passedAt: string | null
    late: boolean
  }[]
  progress: {
    deliveryPointNo: string
    deliveryPointName: string
    recipientName: string
    plannedAt: string | null
    arrivedAt: string | null
    declaredAt: string | null
    confirmedAt: string | null
    contestedAt: string | null
    lines: number[]
  }[]
  goods: {
    lineNo: number
    deliveryPointName: string
    productName: string
    unit: string
    quantity: number
    loadedQuantity: number | null
    receivedQuantity: number | null
    quantityGap: number | null
    gapQualification: 'gain' | 'loss' | null
    outcome: GoodsOutcome
    protests: { no: string; status: ProtestStatus }[]
  }[]
  compliance: {
    tracked: boolean
    stopsPassed: number
    stopsTotal: number
    lateStops: number
    deviations: {
      no: string
      typeName: string
      detectedAt: string
      location: string
      nature: DeviationNature
    }[]
    toQualify: number
    unjustified: number
    compliant: boolean | null
  }
  debriefing: OrderDebriefing | null
  dossier: DocumentaryDossierApi
}
