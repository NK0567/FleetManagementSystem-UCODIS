import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { LoadingListApi, PickupEntryInput, PickupNoteApi } from '../types/pickup.types'

export interface IncidentListsApi {
  incidentTypes: { no: string; name: string }[]
  reasonTypes: { no: string; name: string }[]
  reasonCodes: { no: string; name: string; reasonTypeNo: string }[]
}
export interface VehicleCandidateApi {
  vehicleNo: string
  plate: string
  trailerNo: string | null
  driverNo: string | null
  driverName: string
  licenceNo: string
  licenceExpiry: string | null
  carrierName: string
}
export interface DeviationCandidateApi {
  requestNo: string
  recipientName: string
  deliveryPointName: string
  productName: string
  quantity: number
}

const path = (no: string) => resourcePath('/planning/transport-orders', no)

export const pickupApi = {
  async note(no: string): Promise<PickupNoteApi> {
    return (await httpClient.get<SingleResponse<PickupNoteApi>>(`${path(no)}/pickup-note`)).data
      .data
  },
  async send(no: string, email: string): Promise<PickupNoteApi> {
    return (
      await httpClient.post<SingleResponse<PickupNoteApi>>(`${path(no)}/pickup-note/send`, {
        email
      })
    ).data.data
  },
  async sendElectronic(no: string): Promise<PickupNoteApi> {
    return (
      await httpClient.post<SingleResponse<PickupNoteApi>>(`${path(no)}/pickup-note/send`, {
        electronic: true
      })
    ).data.data
  },
  async systemConfirm(no: string): Promise<PickupNoteApi> {
    return (
      await httpClient.post<SingleResponse<PickupNoteApi>>(
        `${path(no)}/pickup-note/system-confirm`,
        {}
      )
    ).data.data
  },
  async confirm(
    no: string,
    documentRef: string,
    entries: PickupEntryInput[]
  ): Promise<PickupNoteApi> {
    return (
      await httpClient.post<SingleResponse<PickupNoteApi>>(`${path(no)}/pickup-note/confirm`, {
        documentRef,
        entries
      })
    ).data.data
  },
  async incidentLists(no: string): Promise<IncidentListsApi> {
    return (
      await httpClient.get<SingleResponse<IncidentListsApi>>(
        `${path(no)}/pickup-note/incident-lists`
      )
    ).data.data
  },
  async vehicleCandidate(no: string, vehicleNo: string): Promise<VehicleCandidateApi> {
    return (
      await httpClient.get<SingleResponse<VehicleCandidateApi>>(
        `${path(no)}/pickup-note/vehicle-candidate`,
        {
          params: { vehicleNo }
        }
      )
    ).data.data
  },
  async changeVehicle(
    no: string,
    body: { vehicleNo: string; trailerNo: string | null; driverNo: string }
  ) {
    return (
      await httpClient.post<SingleResponse<PickupNoteApi>>(
        `${path(no)}/pickup-note/change-vehicle`,
        body
      )
    ).data.data
  },
  async changeSite(no: string, siteNo: string) {
    return (
      await httpClient.post<SingleResponse<PickupNoteApi>>(`${path(no)}/pickup-note/change-site`, {
        siteNo
      })
    ).data.data
  },
  async cancelDelivery(no: string, pointNo: string, body: Record<string, unknown>) {
    return (
      await httpClient.post<SingleResponse<PickupNoteApi>>(
        `${path(no)}/points/${encodeURIComponent(pointNo)}/cancel`,
        body
      )
    ).data.data
  },
  async deviationCandidates(no: string, pointNo: string): Promise<DeviationCandidateApi[]> {
    return (
      await httpClient.get<SingleResponse<DeviationCandidateApi[]>>(
        `${path(no)}/points/${encodeURIComponent(pointNo)}/deviation-candidates`
      )
    ).data.data
  },
  async deviate(no: string, pointNo: string, body: Record<string, unknown>) {
    return (
      await httpClient.post<SingleResponse<PickupNoteApi>>(
        `${path(no)}/points/${encodeURIComponent(pointNo)}/deviate`,
        body
      )
    ).data.data
  },
  async loadingList(no: string): Promise<LoadingListApi> {
    return (await httpClient.get<SingleResponse<LoadingListApi>>(`${path(no)}/loading-list`)).data
      .data
  }
}
