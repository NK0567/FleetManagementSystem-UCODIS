import type { DeliveryRequestStatus } from '../domain/deliveryRequest'
import type { FreightPayer } from '../../planning-settings/domain/planningSettings'

export type { FreightPayer }

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
  productNo: string
  quantity: number
  weightKg: number | null
  volumeM3: number | null
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
