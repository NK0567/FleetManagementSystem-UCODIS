import { createCrudService } from '@/core/factories'
import { telematicsEventApi } from '../api/telematicsEventApi'
import type {
  TelematicsEventApi,
  TelematicsEventSearchColumn
} from '../types/telematicsEvent.types'

export const telematicsEventService = {
  ...createCrudService<TelematicsEventApi, TelematicsEventSearchColumn>(telematicsEventApi),
  async acknowledge(no: string, comment: string): Promise<TelematicsEventApi> {
    return (await telematicsEventApi.acknowledge(no, comment)).data.data
  },
  async openInfraction(no: string): Promise<TelematicsEventApi> {
    return (await telematicsEventApi.openInfraction(no)).data.data
  }
}
