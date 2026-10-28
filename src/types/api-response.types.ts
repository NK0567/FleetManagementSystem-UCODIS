export interface ApiResponse<T = unknown> {
  success: boolean
  statusCode: number
  message: string
  data: T
  timestamp: string
}

export interface ApiErrorResponse {
  success: false
  statusCode: number
  message: string
  data: null
  errors?: string[]
  errorCode?: string
  duplicateField?: string
  duplicateValue?: string
  path?: string
  timestamp: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  success: true
  statusCode: number
  message: string
  data: {
    items: T[]
    meta: PaginationMeta
  }
  timestamp: string
}

export type ListResponse<T> = ApiResponse<T[]>

export type SingleResponse<T> = ApiResponse<T>

export function isApiError(response: ApiResponse | ApiErrorResponse): response is ApiErrorResponse {
  return response.success === false
}
