import type { AxiosResponse } from 'axios'
import httpClient from '@/core/api/httpClient'
import type { PaginatedResponse, SingleResponse } from '@/types/api-response.types'
import type { CrudApi } from '@/core/types/crud.types'
import { serializeListFiltersParam } from '@/core/utils/listFilters'

export interface CreateCrudApiOptions {
  /** Entity endpoint, e.g. '/hr/employees'. */
  basePath: string
}

export function resourcePath(basePath: string, id: string): string {
  return `${basePath}/${encodeURIComponent(id)}`
}

export function createCrudApi<T>({ basePath }: CreateCrudApiOptions): CrudApi<T> {
  return {
    getAll(params: Record<string, unknown>) {
      const { filters, signal, ...rest } = params
      const query: Record<string, unknown> = { ...rest }
      const filtersParam = serializeListFiltersParam(filters)
      if (filtersParam) query.filters = filtersParam
      return httpClient.get<PaginatedResponse<T>>(basePath, {
        params: query,
        ...(signal instanceof AbortSignal ? { signal } : {})
      })
    },

    getById(id: string) {
      return httpClient.get<SingleResponse<T>>(resourcePath(basePath, id))
    },

    update(id: string, data: Record<string, unknown>) {
      return httpClient.patch<SingleResponse<T>>(resourcePath(basePath, id), data)
    },

    create(data: Record<string, unknown>) {
      return httpClient.post<SingleResponse<T>>(basePath, data)
    },

    remove(id: string) {
      return httpClient.delete<SingleResponse<null>>(resourcePath(basePath, id))
    },

    exportExcel(body: Record<string, unknown>) {
      const { filters, ...rest } = body
      const payload: Record<string, unknown> = { ...rest }
      const filtersParam = serializeListFiltersParam(filters)
      if (filtersParam) payload.filters = filtersParam
      return httpClient.post<Blob>(`${basePath}/export`, payload, {
        responseType: 'blob',
        timeout: 0
      }) as Promise<AxiosResponse<Blob>>
    }
  }
}
