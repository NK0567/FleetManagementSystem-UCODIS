import httpClient from '@/core/api/httpClient'
import { createCrudApi, resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { TripApi } from '../types/trip.types'

const basePath = '/fleet/trips'

const action = (no: string, name: string, body: Record<string, unknown> = {}) =>
  httpClient.post<SingleResponse<TripApi>>(`${resourcePath(basePath, no)}/${name}`, body)

export const tripApi = {
  ...createCrudApi<TripApi>({ basePath }),
  start: (no: string, startOdometerKm: number | null) => action(no, 'start', { startOdometerKm }),
  passStop: (no: string) => action(no, 'pass-stop'),
  complete: (no: string, endOdometerKm: number) => action(no, 'complete', { endOdometerKm }),
  close: (no: string) => action(no, 'close'),
  cancel: (no: string, reason: string) => action(no, 'cancel', { reason })
}
