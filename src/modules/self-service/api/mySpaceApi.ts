import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { MyChecklistInput, MyProfileApi, MyTourApi } from '../types/mySpace.types'

export const mySpaceApi = {
  profile: () => httpClient.get<SingleResponse<MyProfileApi>>('/me'),
  tour: () => httpClient.get<SingleResponse<MyTourApi | null>>('/me/tour'),
  saveChecklist: (input: MyChecklistInput) =>
    httpClient.post<SingleResponse<unknown>>('/me/checklist', { stage: 'departure', ...input })
}
