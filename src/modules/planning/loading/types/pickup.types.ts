/**
 * The pickup note (bon d'enlèvement) of a transport order, one per vehicle (TRS03-US03): what
 * the pickup site must load, compartment by compartment. It is issued once the order is
 * planned, sent to the site, then confirmed with the data handed over by the site (TRS03-US04).
 */
export type PickupStatus = 'issued' | 'sent' | 'confirmed'

export interface PickupEntryApi {
  lineNo: number
  recipientName: string
  deliveryPointName: string
  productName: string
  unit: string
  /** Fuel asks for its measures at loading: temperature, density and volume at 15 °C. */
  isFuel: boolean
  expectedQuantity: number
  loadedQuantity: number | null
  temperatureC: number | null
  density: number | null
  volume15L: number | null
}

export interface PickupCompartmentApi {
  /** 0 when the vehicle has no compartments: one space. */
  no: number
  volumeL: number | null
  entries: PickupEntryApi[]
}

export interface PickupNoteApi {
  orderNo: string
  status: PickupStatus
  orderStatus: string
  plannedDeparture: string | null
  pickupSiteName: string
  pickupSiteEmail: string
  vehiclePlate: string
  trailerPlate: string
  driverName: string
  carrierName: string
  compartments: PickupCompartmentApi[]
  sentAt: string | null
  sentTo: string
  confirmedAt: string | null
  confirmedBy: string | null
  documentRef: string
  pickupSiteNo: string
  deliveries: {
    pointNo: string
    deliveryPointName: string
    recipientName: string
    products: string
    state: 'open' | 'done' | 'cancelled' | 'deviated' | 'returned' | 'out'
    deviatedToRequestNo: string | null
  }[]
}

export interface PickupEntryInput {
  compartmentNo: number
  lineNo: number
  loadedQuantity: number
  temperatureC?: number | null
  density?: number | null
  volume15L?: number | null
}

/** The loading list (TRS03-US06): in the order of loading, or by compartment. */
export interface LoadingListApi {
  orderNo: string
  plannedDeparture: string | null
  vehiclePlate: string
  trailerPlate: string
  driverName: string
  carrierName: string
  /** One space: last delivered loaded first; compartments with their own access: by compartment. */
  mode: 'one_space' | 'compartments'
  groups: {
    title: string
    compartmentNo: number | null
    lines: {
      lineNo: number
      recipientName: string
      deliveryPointName: string
      productName: string
      unit: string
      quantity: number
    }[]
  }[]
}
