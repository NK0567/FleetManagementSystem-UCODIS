import type { PaginatedResponse } from '@/types/api-response.types'
import type { CrudApi, CrudService, GetListParams } from '@/core/types/crud.types'
import { getAppliedListFilters } from '@/core/utils/listFilters'

/** Unwraps the HTTP envelope so stores and components never handle raw responses. */
export function createCrudService<T, SearchCol extends string = string>(
  api: CrudApi<T>
): CrudService<T, SearchCol> {
  return {
    async getAll(params: GetListParams<SearchCol> = {}): Promise<PaginatedResponse<T>> {
      const {
        page = 1,
        pageSize = 25,
        searchQuery,
        searchColumns,
        sortBy,
        sortDirection,
        filters,
        signal
      } = params
      const appliedFilters = filters ? getAppliedListFilters(filters) : []

      const response = await api.getAll({
        page,
        pageSize,
        ...(searchQuery && { searchQuery, searchColumns }),
        ...(sortBy && { sortBy, sortDirection }),
        ...(appliedFilters.length > 0 && { filters: appliedFilters }),
        ...(signal && { signal })
      })
      return response.data
    },

    async getById(id: string): Promise<T> {
      return (await api.getById(id)).data.data
    },

    async update(id: string, data: Record<string, unknown>): Promise<T> {
      return (await api.update(id, data)).data.data
    },

    async create(data: Record<string, unknown>): Promise<T> {
      return (await api.create(data)).data.data
    },

    async remove(id: string): Promise<void> {
      await api.remove(id)
    }
  }
}
