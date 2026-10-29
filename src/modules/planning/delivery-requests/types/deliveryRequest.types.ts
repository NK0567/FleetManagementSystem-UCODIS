import type { DeliveryRequestStatus } from '../domain/deliveryRequest'
import type { FreightPayer } from '../../planning-settings/domain/planningSettings'
import type { DeliverySlot, NotificationChannel } from '../../customers/types/customer.types'

export type { DeliverySlot, FreightPayer, NotificationChannel }

/** One product line of an order: all the lines go to the same recipient and the same place. */
export interface DeliveryRequestLine {
  lineNo: number
  productNo: string
  quantity: number
  weightKg: number | null
  volumeM3: number | null
}

export interface DeliveryRequestLineApi extends DeliveryRequestLine {
  productName: string
  productFamily: string
  unit: string
}

export const DELIVERY_FOLLOW_UPS = [
  'planned',
  'postponed',
  'to_replan',
  'delivered',
  'confirmed',
  'contested',
  'refused'
] as const
export type DeliveryFollowUp = (typeof DELIVERY_FOLLOW_UPS)[number]

/**
 * How the order came in (TRS01-US01): transmitted by a service (the orderer accounts), imported
 * from a file, keyed by the planner, received from the management system by the connector, or
 * sent by an external orderer through the API.
 */
export const DELIVERY_REQUEST_ORIGINS = [
  'request',
  'import',
  'planner',
  'connector',
  'api'
] as const
export type DeliveryRequestOrigin = (typeof DELIVERY_REQUEST_ORIGINS)[number]

/** A sale to deliver, a transfer between sites of the company, or a return to the base. */
export const DELIVERY_REQUEST_KINDS = ['sale', 'transfer', 'return'] as const
export type DeliveryRequestKind = (typeof DELIVERY_REQUEST_KINDS)[number]

export interface DeliveryRequestApi {
  no: string
  kind: DeliveryRequestKind
  ordererNo: string
  deliveryPointNo: string
  /** Where the goods are picked up: a depot, or the recipient's site for a return. */
  pickupPointNo: string | null
  pickupPointName: string
  /** What the goods are, in words, and how many units (cartons, pallets...) they make. */
  content: string
  unitCount: number | null
  /** Equipment the vehicle must carry, such as a pump. */
  requiredEquipmentTypeNo: string | null
  requiredEquipmentName: string
  desiredDate: string
  validUntil: string | null
  externalReference: string
  freightPayer: FreightPayer
  comment: string
  lines: DeliveryRequestLineApi[]
  lineCount: number
  /** First product and totals, for the lists. */
  productNo: string
  quantity: number
  weightKg: number | null
  volumeM3: number | null
  /** The recipient's preferences, copied from its record and editable until the order is planned. */
  notificationChannel: NotificationChannel
  confirmationRequired: boolean
  preferredSlot: DeliverySlot
  fullDeliveryRequired: boolean
  origin: DeliveryRequestOrigin
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
  status: DeliveryRequestStatus
  /** Where the order stands in its transport order, once planned. */
  followUp: DeliveryFollowUp | null
  plannedOn: string | null
  vehiclePlate: string
  /** Its transport order is completed: the orderer's survey is open (TRS04-US07). */
  orderCompleted: boolean
  ordererSurvey: {
    orderScore: number
    delayScore: number
    qualityScore: number
    comment: string
    at: string
    by: string
  } | null
  rejectionReasonName: string
  cancellationReasonName: string
  ordererName: string
  deliveryPointName: string
  recipientName: string
  productName: string
  unit: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type DeliveryRequestSearchColumn =
  | 'no'
  | 'ordererName'
  | 'deliveryPointName'
  | 'externalReference'
  | 'no,ordererName,deliveryPointName,externalReference'
