import type { ApiErrorResponse, ApiResponse, PaginationMeta } from '@/types/api-response.types'
import type { ErrorExtra } from './errors'
import type { MockResponse } from './types'

function envelope<T>(status: number, data: T): ApiResponse<T> {
  return {
    success: true,
    statusCode: status,
    message: 'OK',
    data,
    timestamp: new Date().toISOString()
  }
}

export function ok<T>(data: T): MockResponse {
  return { status: 200, data: envelope(200, data) }
}

export function created<T>(data: T): MockResponse {
  return { status: 201, data: envelope(201, data) }
}

export function paginated<T>(result: { items: T[]; meta: PaginationMeta }): MockResponse {
  return ok(result)
}

export function file(blob: Blob, fileName: string): MockResponse {
  return {
    status: 200,
    data: blob,
    headers: {
      'content-type': blob.type || 'application/octet-stream',
      'content-disposition': `attachment; filename="${fileName}"`
    }
  }
}

export function errorResponse(
  status: number,
  message: string,
  path: string,
  extra?: ErrorExtra
): MockResponse {
  const body: ApiErrorResponse = {
    success: false,
    statusCode: status,
    message,
    data: null,
    path,
    timestamp: new Date().toISOString(),
    ...extra
  }
  return { status, data: body }
}
