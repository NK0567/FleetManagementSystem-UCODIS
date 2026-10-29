import type { DeliveryNoteApi } from '@/modules/planning/delivery-notes/types/deliveryNote.types'
import type {
  DeliverySlot,
  NotificationChannel
} from '@/modules/planning/customers/types/customer.types'
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
  plannedDeparture: string | null
  notificationChannel: NotificationChannel
  preferredSlot: DeliverySlot
  /** The agent handling the line, if any: it is not offered to the others meanwhile. */
  agent: string | null
  takenAt: string | null
  byLink: boolean
}

export type ConfirmationAction =
  | 'confirm'
  | 'unavailable'
  | 'client-date'
  | 'propose-date'
  | 'accept-date'
  | 'take'
  | 'release'

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

/** What the recipient sees through the link of his SMS, WhatsApp or e-mail. */
export interface TrackingApi {
  orderNo: string
  lineNo: number
  recipientName: string
  deliveryPointName: string
  productName: string
  quantity: number
  unit: string
  plannedDeparture: string | null
  preferredSlot: DeliverySlot
  state: ConfirmationState
  proposedDate: string
  availableOn: string | null
  plannerProposedOn: string | null
  reasons: { no: string; name: string }[]
  open: boolean
  step: 'planned' | 'on_the_way' | 'on_site' | 'received'
  loadedQuantity: number | null
  loadedOn: string | null
  notLoaded: boolean
  arrivedAt: string | null
  declaredAt: string | null
  receivedQuantity: number | null
  refusedAt: string | null
  refusalReason: string
  receptionConfirmedAt: string | null
  receptionConfirmedBy: string
  receptionContestedAt: string | null
  contestReason: string
  contestReasons: { no: string; name: string }[]
  refusalReasons: { no: string; name: string }[]
  deliveryNote: DeliveryNoteApi | null
  vehiclePlate: string
  driverName: string
  expectedArrival: string | null
  satisfactionScore: number | null
  satisfactionComment: string
  messages: { at: string; channel: string; kind: string }[]
}
