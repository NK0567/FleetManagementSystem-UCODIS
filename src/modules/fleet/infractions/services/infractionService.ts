import { createCrudService } from '@/core/factories'
import { infractionApi } from '../api/infractionApi'
import type { InfractionOutcome } from '../domain/infraction'
import type { InfractionApi, InfractionSearchColumn } from '../types/infraction.types'

export const infractionService = {
  ...createCrudService<InfractionApi, InfractionSearchColumn>(infractionApi),
  async take(no: string): Promise<InfractionApi> {
    return (await infractionApi.take(no)).data.data
  },
  async close(no: string, outcome: InfractionOutcome, comment: string): Promise<InfractionApi> {
    return (await infractionApi.close(no, outcome, comment)).data.data
  }
}
