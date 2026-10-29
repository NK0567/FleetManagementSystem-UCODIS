export const CUSTOMER_NATURES = ['external', 'internal'] as const
export type CustomerNature = (typeof CUSTOMER_NATURES)[number]

/** How the recipient wants to hear about a delivery, among the channels made available. */
export const NOTIFICATION_CHANNELS = ['none', 'sms', 'call', 'email', 'whatsapp'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

/** The part of the day the recipient prefers to be delivered. */
export const DELIVERY_SLOTS = ['any', 'morning', 'afternoon'] as const
export type DeliverySlot = (typeof DELIVERY_SLOTS)[number]

/** The recipient's preferences: kept on its record, copied on each new order and editable there. */
export interface RecipientPreferences {
  notificationChannel: NotificationChannel
  confirmationRequired: boolean
  preferredSlot: DeliverySlot
}

export interface CustomerApi {
  no: string
  name: string
  isOrderer: boolean
  isRecipient: boolean
  nature: CustomerNature
  address: string
  city: string
  contactName: string
  phone: string
  email: string
  notificationChannel: NotificationChannel
  confirmationRequired: boolean
  preferredSlot: DeliverySlot
  active: boolean
  deliveryPointCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type CustomerSearchColumn =
  | 'no'
  | 'name'
  | 'city'
  | 'contactName'
  | 'no,name,city,contactName'
