import { createCrudService } from '@/core/factories'
import { couplingApi } from '../api/couplingApi'
import type { CouplingApi, CouplingSearchColumn } from '../types/coupling.types'

export const couplingService = {
  ...createCrudService<CouplingApi, CouplingSearchColumn>(couplingApi),
  async end(no: string, endDate: string): Promise<CouplingApi> {
    return (await couplingApi.end(no, endDate)).data.data
  }
}
