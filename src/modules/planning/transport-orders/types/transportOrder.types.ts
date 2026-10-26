import type { FileMeta } from '@/types/file.types'
import type { ClosingBlock, OrderDebriefing } from '@/modules/planning/closing/domain/closing'
import type {
  OrderLineState,
  TransportMeans,
  TransportOrderEventKind,
  TransportOrderStatus
} from '../domain/transportOrder'

export type { OrderLineState, TransportMeans, TransportOrderEventKind, TransportOrderStatus }

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
  loadedQuantity: number | null
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
}

/** What the lines action accepts: a request, or a line keyed without one. */
export interface TransportOrderLineInput {
  deliveryRequestNo?: string | null
  deliveryPointNo?: string
  productNo?: string
  quantity?: number | null
  weightKg?: number | null
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
  plannedArrival: string | null
  comment: string
  lines: TransportOrderLineApi[]
  lineCount: number
  recipientSummary: string
  totalWeightKg: number | null
  totalFuelL: number | null
  means: TransportMeans | null
  tripNo: string | null
  tripStatus: string | null
  vehicleNo: string | null
  vehiclePlate: string
  trailerNo: string | null
  trailerPlate: string
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
  derived: { vehicle: string; trailer: string; places: string; gainLoss: string }
}

export interface DebriefingInput {
  voucherNo: string
  loadedAt: string
  unloadedAt: string
  observations: string
}
