import type { ConfirmationState } from '../domain/confirmation'

export interface ConfirmationLineApi {
  orderNo: string
  lineNo: number
  deliveryPointName: string
  recipientName: string
  productName: string
  quantity: number
  unit: string
  state: ConfirmationState
  clientProposedOn: string | null
  plannerProposedOn: string | null
  availableOn: string | null
  trackingToken: string | null
  trackingExpiresOn: string | null
}

export type ConfirmationAction =
  | 'confirm'
  | 'unavailable'
  | 'client-date'
  | 'propose-date'
  | 'accept-date'

export const RECEPTION_STATES = ['awaiting', 'contested', 'to_rate'] as const
export type ReceptionState = (typeof RECEPTION_STATES)[number]

export interface ReceptionLineApi {
  orderNo: string
  lineNo: number
  recipientName: string
  deliveryPointName: string
  productName: string
  unit: string
  quantity: number
  receivedQuantity: number | null
  state: ReceptionState
  attested: boolean
}

export type ReceptionAction =
  | 'receive-confirm'
  | 'receive-contest'
  | 'handle-contest'
  | 'satisfaction'

export type ActionBody = Record<string, unknown>
