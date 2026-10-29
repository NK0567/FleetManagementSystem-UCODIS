import type { CollectionDefinition, MockRow } from '../../db/collection'

/**
 * What the application tells a driver about his transport orders (TRS03-US08): an order
 * entrusted to him, an order cancelled with its reason (TRS01-US18). None at start.
 */
export interface NotificationRow extends MockRow {
  employeeNo: string
  at: string
  kind: 'order_assigned' | 'order_cancelled' | 'order_withdrawn' | 'order_route_changed'
  orderNo: string
  detail: string
  readAt: string | null
}

export const notificationsCollection: CollectionDefinition<NotificationRow> = {
  name: 'planning-notifications',
  seed: () => []
}
