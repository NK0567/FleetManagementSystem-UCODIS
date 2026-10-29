import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'

export interface UserPerimeterApi {
  code: string
  name: string
  profile: string
  depotNos: string[]
  regions: string[]
}

export interface PerimeterOptionsApi {
  depots: { no: string; name: string; region: string; ownerName: string }[]
  regions: string[]
}

/** The depots and regions each user is tied to (TRS07-US02). */
export const perimeterApi = {
  list: () =>
    httpClient.get<SingleResponse<{ users: UserPerimeterApi[]; options: PerimeterOptionsApi }>>(
      '/planning/perimeters'
    ),
  update: (code: string, perimeter: { depotNos: string[]; regions: string[] }) =>
    httpClient.put<SingleResponse<UserPerimeterApi>>(
      `/planning/perimeters/${encodeURIComponent(code)}`,
      perimeter
    )
}
