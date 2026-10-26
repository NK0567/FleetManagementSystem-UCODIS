import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { downtimeCodeService } from '../services/downtimeCodeService'
import type { DowntimeCodeApi, DowntimeCodeSearchColumn } from '../types/downtimeCode.types'

export const useDowntimeCodeStore = defineStore('maintenance-downtime-code', () => {
  const crud = useCrudState<DowntimeCodeApi, DowntimeCodeSearchColumn>({
    persistKey: 'maintenance-downtime-code',
    service: downtimeCodeService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'maintenance.downtimeCodes.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
