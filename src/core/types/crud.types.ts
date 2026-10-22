import type { AxiosResponse } from 'axios'
import type { PaginatedResponse, SingleResponse } from '@/types/api-response.types'

export type SortDirection = 'ASC' | 'DESC'

export type ListFilterOperator = '=' | '<>' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'STARTS' | 'ENDS'

export interface ListFilter {
  field: string
  valueType: 'string' | 'number' | 'boolean' | 'date' | 'datetime'
  value: unknown
  operator?: ListFilterOperator
}

export interface GetListParams<SearchCol extends string = string> {
  page?: number
  pageSize?: number
  searchQuery?: string
  searchColumns?: SearchCol
  sortBy?: string
  sortDirection?: SortDirection
  filters?: ListFilter[]
  signal?: AbortSignal
}

export interface CrudApi<T> {
  getAll(params: Record<string, unknown>): Promise<AxiosResponse<PaginatedResponse<T>>>
  getById(id: string): Promise<AxiosResponse<SingleResponse<T>>>
  update(id: string, data: Record<string, unknown>): Promise<AxiosResponse<SingleResponse<T>>>
  create(data: Record<string, unknown>): Promise<AxiosResponse<SingleResponse<T>>>
  remove(id: string): Promise<AxiosResponse<SingleResponse<null>>>
  exportExcel(body: Record<string, unknown>): Promise<AxiosResponse<Blob>>
}

export interface CrudService<T, SearchCol extends string = string> {
  getAll(params?: GetListParams<SearchCol>): Promise<PaginatedResponse<T>>
  getById(id: string): Promise<T>
  update(id: string, data: Record<string, unknown>): Promise<T>
  create(data: Record<string, unknown>): Promise<T>
  remove(id: string): Promise<void>
}

export interface ListAccessScopeOptions {
  feature: string
  extraFeatures?: string[]
  ownerField: string
  ownerValue?: () => string
  teamField?: string
  teamValue?: () => string
}

export interface CrudStateOptions<T, SearchCol extends string = string> {
  service: CrudService<T, SearchCol>
  defaultSearchColumn: SearchCol
  /** i18n key of the plural entity label, used in error messages. */
  entityLabelKey: string
  getListFilters?: () => ListFilter[] | undefined
  /** "My Only" / "My Team" restriction applied to every list and export request. */
  listAccessScope?: ListAccessScopeOptions
  defaultSortBy?: string
  defaultSortDirection?: SortDirection
  /** sessionStorage key that keeps advanced filters and panel state across reloads. */
  persistKey?: string
}
