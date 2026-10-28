import type {
  FetchFnParams,
  FetchFnResult
} from '@/components/ui/table-lookup/TableLookupModal.vue'
import type { CrudService } from '@/core/types/crud.types'

export function createCrudLookupFetch<T, SearchCol extends string>(
  service: CrudService<T, SearchCol>,
  defaultSearchColumn: SearchCol
): (params: FetchFnParams) => Promise<FetchFnResult> {
  return async (params) => {
    const response = await service.getAll({
      page: params.page,
      pageSize: params.pageSize,
      searchQuery: params.searchQuery,
      searchColumns: (params.searchColumn as SearchCol) || defaultSearchColumn,
      sortBy: params.sortBy,
      sortDirection: params.sortDirection,
      signal: params.signal
    })
    return {
      items: response.data.items as Record<string, unknown>[],
      meta: {
        total: response.data.meta.total,
        page: response.data.meta.page,
        totalPages: response.data.meta.totalPages
      }
    }
  }
}
