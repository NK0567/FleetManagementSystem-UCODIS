import { createCrudService } from '@/core/factories'
import { publicHolidayApi } from '../api/publicHolidayApi'
import type { PublicHolidayApi, PublicHolidaySearchColumn } from '../types/publicHoliday.types'

export const publicHolidayService = createCrudService<PublicHolidayApi, PublicHolidaySearchColumn>(
  publicHolidayApi
)
