import { createCrudApi } from '@/core/factories'
import type { SiteApi } from '../types/site.types'

export const siteApi = createCrudApi<SiteApi>({
  basePath: '/fleet/sites'
})
