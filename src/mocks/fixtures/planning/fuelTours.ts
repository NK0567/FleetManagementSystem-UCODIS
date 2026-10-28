import type { CollectionDefinition, MockRow } from '../../db/collection'
import type { FuelMeasure } from '@/modules/planning/fuel-tours/domain/fuel'

export interface FuelCompartmentRow {
  vehicleNo: string
  compartmentNo: number
  productNo: string
  volumeL: number
  deliveryRequestNo: string
}

export interface FuelBlRow {
  no: string
  vehicleNo: string
  compartmentNo: number
  productNo: string
  volumeL: number
  deliveryRequestNo: string
  status: 'issued' | 'cancelled' | 'deviated'
  reason: string
}

export interface FuelVoucherRow {
  no: string
  status: 'issued' | 'confirmed'
  bslNo: string
  measures: (FuelMeasure & { vehicleNo: string; compartmentNo: number })[]
}

export interface FuelTourRow extends MockRow {
  depotNo: string
  date: string
  validUntil: string
  requestNos: string[]
  compartments: FuelCompartmentRow[]
  bls: FuelBlRow[]
  voucher: FuelVoucherRow | null
  orderNos: string[]
  validatedAt: string | null
  cancelledAt: string | null
}

export const fuelToursCollection: CollectionDefinition<FuelTourRow> = {
  name: 'fuel-tours',
  seed: () => []
}
