import { createCrudService } from '@/core/factories'
import { alertApi } from '../api/alertApi'
import type { AlertApi, AlertSearchColumn } from '../types/alert.types'

export const alertService = {
  ...createCrudService<AlertApi, AlertSearchColumn>(alertApi),
  async acknowledge(no: string): Promise<AlertApi> {
    return (await alertApi.acknowledge(no)).data.data
  },
  async handle(no: string, comment: string): Promise<AlertApi> {
    return (await alertApi.handle(no, comment)).data.data
  }
}
