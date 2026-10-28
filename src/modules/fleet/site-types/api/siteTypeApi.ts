import { createCrudApi } from '@/core/factories'
import type { SiteTypeApi } from '../types/siteType.types'

export const siteTypeApi = createCrudApi<SiteTypeApi>({
  basePath: '/fleet/site-types'
})
