import { createCrudService } from '@/core/factories'
import { downtimeApi } from '../api/downtimeApi'
import type { DowntimeApi, DowntimeSearchColumn } from '../types/downtime.types'

export const downtimeService = {
  ...createCrudService<DowntimeApi, DowntimeSearchColumn>(downtimeApi),
  async end(no: string, comment: string): Promise<DowntimeApi> {
    return (await downtimeApi.end(no, comment)).data.data
  }
}
