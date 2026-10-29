import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'

export interface MyRefill {
  no: string
  refueledAt: string
  vehiclePlate: string
  liters: number
  amount: number
  stationLabel: string
  channel: string
  status: string
}

export interface MyRefills {
  vehicleNo: string
  vehiclePlate: string
  refills: MyRefill[]
}

export interface MyBreakdown {
  no: string
  vehiclePlate: string
  symptom: string
  severity: string
  declaredAt: string
  status: string
}

export interface MyRefillInput {
  liters: number | null
  unitPrice: number | null
  odometerKm: number | null
  stationName: string
  fullTank: boolean
  receiptFileNo: string | null
}

/** What the driver declares on his own vehicle from his phone: refills and breakdowns. */
export const myVehicleApi = {
  refills: () => httpClient.get<SingleResponse<MyRefills>>('/me/refills'),
  declareRefill: (input: MyRefillInput) =>
    httpClient.post<SingleResponse<unknown>>('/me/refills', { ...input }),
  breakdowns: () => httpClient.get<SingleResponse<MyBreakdown[]>>('/me/breakdowns'),
  reportBreakdown: (input: { severity: string; symptom: string }) =>
    httpClient.post<SingleResponse<MyBreakdown>>('/me/breakdowns', input)
}
