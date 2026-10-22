import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { publicHolidayService } from '../services/publicHolidayService'
import type { PublicHolidayApi, PublicHolidaySearchColumn } from '../types/publicHoliday.types'

export const usePublicHolidayStore = defineStore('hr-public-holiday', () => {
  const crud = useCrudState<PublicHolidayApi, PublicHolidaySearchColumn>({
    persistKey: 'hr-public-holiday',
    service: publicHolidayService,
    defaultSearchColumn: 'name',
    entityLabelKey: 'hr.publicHolidays.title',
    defaultSortBy: 'date'
  })

  return { ...crud }
})
