import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { telematicsEventTypeService } from '../services/telematicsEventTypeService'
import type {
  TelematicsEventTypeApi,
  TelematicsEventTypeSearchColumn
} from '../types/telematicsEventType.types'

export const useTelematicsEventTypeStore = defineStore('fleet-telematics-event-type', () => {
  const crud = useCrudState<TelematicsEventTypeApi, TelematicsEventTypeSearchColumn>({
    persistKey: 'fleet-telematics-event-type',
    service: telematicsEventTypeService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'fleet.telematicsEventTypes.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
