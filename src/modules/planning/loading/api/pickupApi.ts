import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { LoadingListApi, PickupEntryInput, PickupNoteApi } from '../types/pickup.types'

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
  async loadingList(no: string): Promise<LoadingListApi> {
    return (await httpClient.get<SingleResponse<LoadingListApi>>(`${path(no)}/loading-list`)).data
      .data
  }
}
