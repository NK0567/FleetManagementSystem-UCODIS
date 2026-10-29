import type { AxiosResponse } from 'axios'
import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { CrudApi } from '@/core/types/crud.types'
import { serializeListFiltersParam } from '@/core/utils/listFilters'
import type { SingleResponse } from '@/types/api-response.types'
import type {
  FleetStatusApi,
  FleetStatusDay,
  FleetStatusDispatchApi
} from '../types/fleetStatus.types'

const basePath = '/fleet/fleet-status'

/** The lines depend on the day shown: each request carries it. */
export function createFleetStatusApi(day: () => string): CrudApi<FleetStatusApi> {
  const base = createCrudApi<FleetStatusApi>({ basePath })
  return {
    ...base,
    getAll: (params) => base.getAll({ ...params, date: day() }),
    exportExcel(body) {
      const { filters, ...rest } = body
      const payload: Record<string, unknown> = { ...rest }
      const filtersParam = serializeListFiltersParam(filters)
      if (filtersParam) payload.filters = filtersParam
      return httpClient.post<Blob>(`${basePath}/export`, payload, {
        params: { date: day() },
        responseType: 'blob',
        timeout: 0
      }) as Promise<AxiosResponse<Blob>>
    }
  }
}

export const fleetStatusDayApi = {
  days: () => httpClient.get<SingleResponse<FleetStatusDay[]>>(`${basePath}/days`),
  archive: () => httpClient.post<SingleResponse<null>>(`${basePath}/archive`, {}),
  dispatches: () =>
    httpClient.get<SingleResponse<FleetStatusDispatchApi[]>>(`${basePath}/dispatches`),
  send: (date: string, recipients: string[]) =>
    httpClient.post<SingleResponse<FleetStatusDispatchApi>>(`${basePath}/send`, {
      date,
      recipients
    }),
  saveNote: (vehicleNo: string, observation: string, expectedBackOn: string | null) =>
    httpClient.put<SingleResponse<FleetStatusApi>>(resourcePath(`${basePath}/notes`, vehicleNo), {
      observation,
      expectedBackOn
    })
}
