import { createCrudService } from '@/core/factories'
import { alertApi } from '../api/alertApi'
import type { AlertApi, AlertSearchColumn, AlertStatsApi, InboxApi } from '../types/alert.types'

export const alertService = {
  ...createCrudService<AlertApi, AlertSearchColumn>(alertApi),
  async acknowledge(no: string): Promise<AlertApi> {
    return (await alertApi.acknowledge(no)).data.data
  },
  async handle(no: string, comment: string): Promise<AlertApi> {
    return (await alertApi.handle(no, comment)).data.data
  },
  async stats(): Promise<AlertStatsApi> {
    return (await alertApi.stats()).data.data
  },
  /** What the bell of the top bar gathers for the user. */
  async inbox(): Promise<InboxApi> {
    return (await alertApi.inbox()).data.data
  }
}
