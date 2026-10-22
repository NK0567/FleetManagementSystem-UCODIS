import { createCrudApi } from '@/core/factories'
import type { PublicHolidayApi } from '../types/publicHoliday.types'

export const publicHolidayApi = createCrudApi<PublicHolidayApi>({
  basePath: '/hr/public-holidays'
})
