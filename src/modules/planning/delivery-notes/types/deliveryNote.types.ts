/**
 * The electronic delivery note of one delivery: the lines of an order going to one delivery
 * point (TRS05-US03). It opens with the driver's declaration and is signed only by the
 * recipient's own confirmation, with his name.
 */
export interface DeliveryNoteLineApi {
  lineNo: number
  productName: string
  unit: string
  /** Quantity loaded for the recipient, or ordered when no loading was recorded. */
  quantity: number
  /** Declared delivered quantity; null when the line is not delivered. */
  deliveredQuantity: number | null
  /** The line is not delivered (refused or postponed), with its reason. */
  notDelivered: boolean
  reason: string
}

export interface DeliveryNoteApi {
  orderNo: string
  deliveryPointNo: string
  deliveryPointName: string
  recipientName: string
  vehiclePlate: string
  /** First declaration on this delivery; the note does not exist before. */
  openedAt: string
  state: 'awaiting' | 'signed' | 'contested'
  signedAt: string | null
  signedBy: string
  contestedAt: string | null
  contestReason: string
  lines: DeliveryNoteLineApi[]
}
