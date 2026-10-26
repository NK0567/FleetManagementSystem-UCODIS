export const CUSTOMER_NATURES = ['external', 'internal'] as const
export type CustomerNature = (typeof CUSTOMER_NATURES)[number]

export const NOTIFICATION_CHANNELS = ['sms', 'email', 'sms_email'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

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
