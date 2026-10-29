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

/** Entered on screen, imported from a file, or keyed by the planner on a customer's behalf. */
export const DELIVERY_REQUEST_ORIGINS = ['request', 'import', 'planner'] as const
export type DeliveryRequestOrigin = (typeof DELIVERY_REQUEST_ORIGINS)[number]

export interface DeliveryRequestApi {
  no: string
  ordererNo: string
  deliveryPointNo: string
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
