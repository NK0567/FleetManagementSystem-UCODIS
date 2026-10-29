import type { FileMeta } from '@/types/file.types'
import type {
  CompartmentIssue,
  CompartmentRules,
  CompartmentUse
} from '@/modules/fleet/vehicles/domain/compartments'
import type {
  ClosingBlock,
  DebriefingCompartment,
  OrderDebriefing
} from '@/modules/planning/closing/domain/closing'
import type {
  DocumentaryDossierApi,
  OrderGapApi
} from '@/modules/planning/closing/types/dossier.types'
import type { LoadCapacity } from '@/modules/fleet/vehicles/domain/capacity'
import type {
  LoadFill,
  OrderLineState,
  TransportMeans,
  TransportMode,
  TransportOrderEventKind,
  TransportOrderStatus
} from '../domain/transportOrder'

export type {
  LoadFill,
  OrderLineState,
  TransportMeans,
  TransportMode,
  TransportOrderEventKind,
  TransportOrderStatus
}

export interface TransportOrderLineApi {
  lineNo: number
  deliveryRequestNo: string | null
  deliveryPointNo: string
  deliveryPointName: string
  recipientName: string
  productNo: string
  productName: string
  unit: string
  quantity: number
  weightKg: number | null
  volumeM3: number | null
  /** The order's reference in our management system, which follows it to the vehicle. */
  externalReference: string
  /** Replanned to a day, into a pending order (TRS01-US16, US17). */
  replannedAt: string | null
  replannedOn: string | null
  replannedToOrderNo: string | null
  replannedFrom: { orderNo: string; lineNo: number } | null
  /* The recipient's answer before loading (TRS01-US14, US16). */
  confirmedAt: string | null
  unavailableAt: string | null
  unavailabilityReasonName: string
  clientProposedOn: string | null
  plannerProposedOn: string | null
  availableOn: string | null
  postponementReasonName: string
  undeliveredReasonName: string
  loadedQuantity: number | null
  nonconformityAt: string | null
  declaredAt: string | null
  receivedQuantity: number | null
  quantityGap: number | null
  refusalAt: string | null
  postponedAt: string | null
  returnedAt: string | null
  handedBackAt: string | null
  warehouseReceivedAt: string | null
  remainderAt: string | null
  remainderRequestNo: string | null
  /* A delivery contested by its recipient, then handled by the planner (TRS04-US03). */
  receptionContestedAt: string | null
  contestReasonName: string
  contestComment: string
  contestHandledAt: string | null
  contestHandledBy: string | null
  contestNote: string
  satisfactionScore: number | null
  satisfactionComment: string
  /* Goods coming back from the order, and the warehouse's check (TRS04-US01). */
  undeliveredReasonNo?: string | null
  incident?: { kind: string; comment: string } | null
  returnReasonName: string
  warehouseConforming: boolean | null
  returnNonconformityReasonName: string
  /* The qualification of a quantity gap (TRS03-US17). */
  gapQualification?: 'gain' | 'loss' | null
  gapComment?: string
  gapImputableToDriver?: boolean | null
}

/** What the lines action accepts: a request, or a line keyed without one. */
export interface TransportOrderLineInput {
  deliveryRequestNo?: string | null
  deliveryPointNo?: string
  productNo?: string
  quantity?: number | null
  weightKg?: number | null
  volumeM3?: number | null
  /** An order keyed in the transport order: who orders it (TRS01-US06). */
  ordererNo?: string
  /** A line already in the order without an order behind it, kept as it is. */
  lineNo?: number
  /** A part of the order's lines; empty takes them all. */
  requestLineNos?: number[]
  /** A reduced quantity for some lines of the order (TRS01-US17). */
  lineQuantities?: Record<number, number>
}

/** How the lines fit in the compartments of the vehicle: a proposal, the planner decides. */
export interface CompartmentPlanApi {
  compartments: CompartmentRules[]
  uses: CompartmentUse[]
  issues: CompartmentIssue[]
}

/** The forecast trip plan of an order (TRS01-US11), drawn from its route template. */
export interface RoutePlanApi {
  routeTemplateNo: string
  routeName: string
  distanceKm: number
  stops: {
    siteNo: string
    siteName: string
    role: string
    plannedAt: string | null
    maxIntervalMin: number
    maxStopMin: number
  }[]
  drivingMin: number
  restMin: number
  riskZones: { siteNo: string; name: string; distanceKm: number }[]
  corridorKm: number
  validatedAt: string | null
}

export interface TransportOrderEventApi {
  at: string
  by: string
  kind: TransportOrderEventKind
  detail: string
}

export interface TransportOrderApi {
  no: string
  routeTemplateNo: string | null
  routeName: string
  plannedDeparture: string | null
  /** The day of the departure, for the period filter. */
  plannedDate: string | null
  plannedArrival: string | null
  /** The arrival estimated from the live position, its delay in minutes, flagged when late. */
  expectedArrival: string | null
  delayMin: number | null
  late: boolean
  /** The depot its route leaves from, and the regions of the sites it serves. */
  depotSiteNo: string | null
  depotName: string
  regions: string[]
  comment: string
  lines: TransportOrderLineApi[]
  lineCount: number
  recipientSummary: string
  totalWeightKg: number | null
  totalVolumeM3: number | null
  totalFuelL: number | null
  /** What the chosen or proposed combination carries, and how full it is (TRS01-US08). */
  capacity: LoadCapacity | null
  fill: LoadFill
  transportMode: TransportMode
  /** Past its planned day without having left (TRS07-US07). */
  expired: boolean
  /** Gathers the lines replanned to that day (TRS01-US16). */
  replanDate: string | null
  proposedVehicleNo: string | null
  proposedTrailerNo: string | null
  proposedCarrierNo: string | null
  routePlan: RoutePlanApi | null
  routeHistory: { at: string; by: string; routeName: string; reason: string }[]
  means: TransportMeans | null
  tripNo: string | null
  tripStatus: string | null
  vehicleNo: string | null
  vehiclePlate: string
  trailerNo: string | null
  trailerPlate: string
  compartmentPlan: CompartmentPlanApi | null
  /** Product categories the vehicle is kept for; empty means any. */
  vehicleProductFamilies: string[]
  driverNo: string | null
  driverName: string
  carrierNo: string | null
  carrierName: string
  carrierVehiclePlate: string
  carrierDriverName: string
  cancellationReasonNo: string | null
  cancellationReasonName: string
  cancellationComment: string
  cancelledAt: string | null
  cancelledBy: string | null
  events: TransportOrderEventApi[]
  status: TransportOrderStatus
  /** In progress and every line dealt with: shown in the « awaiting closing » view. */
  awaitingClosing: boolean
  /** A completed order is final and joins the archives (TRS05-US06). */
  archived: boolean
  ordererSurveys: {
    requestNo: string
    ordererName: string
    orderScore: number
    delayScore: number
    qualityScore: number
    comment: string
    at: string
  }[]
  /** Lines of a planned order still waiting for their recipient to confirm. */
  awaitingConfirmations: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type TransportOrderSearchColumn =
  | 'no'
  | 'routeName'
  | 'recipientSummary'
  | 'carrierName'
  | 'tripNo'
  | 'no,routeName,recipientSummary,carrierName,tripNo'

export interface TransportOrderDocumentApi {
  kind: string
  fileNo: string
  file: FileMeta | null
}

/** The closing dossier: what still blocks it, its documents and the debriefing. */
export interface TransportOrderClosingApi {
  blocks: ClosingBlock[]
  requiredDocuments: string[]
  documents: TransportOrderDocumentApi[]
  debriefing: OrderDebriefing | null
  derived: {
    vehicle: string
    trailer: string
    places: string
    gainLoss: string
    /** The gaps of the lines with their qualification, and the compartments (TRS05-US05). */
    gaps: OrderGapApi[]
    compartments: DebriefingCompartment[]
  }
  /** The documentary dossier put together on its own (TRS05-US04). */
  dossier: DocumentaryDossierApi
}

export interface DebriefingInput {
  voucherNo: string
  loadedAt: string
  unloadedAt: string
  observations: string
}
