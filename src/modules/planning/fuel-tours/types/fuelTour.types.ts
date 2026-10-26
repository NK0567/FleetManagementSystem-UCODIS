export type FuelBlStatus = 'issued' | 'cancelled' | 'deviated'

/** One delivery note per loaded compartment. */
export interface FuelBlApi {
  no: string
  vehicleNo: string
  vehiclePlate: string | null
  compartmentNo: number
  productNo: string
  productName: string | null
  volumeL: number
  deliveryRequestNo: string
  status: FuelBlStatus
  reason: string
}

export interface FuelCompartmentApi {
  vehicleNo: string
  compartmentNo: number
  productNo: string
  volumeL: number
  deliveryRequestNo: string
}

export interface FuelVoucherApi {
  no: string
  status: 'issued' | 'confirmed'
  bslNo: string
}

export interface FuelTourApi {
  no: string
  depotNo: string
  depotName: string | null
  date: string
  validUntil: string
  requestNos: string[]
  compartments: FuelCompartmentApi[]
  bls: FuelBlApi[]
  voucher: FuelVoucherApi | null
  orderNos: string[]
  validatedAt: string | null
  cancelledAt: string | null
}
