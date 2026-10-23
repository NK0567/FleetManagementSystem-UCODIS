import { createCrudService } from '@/core/factories'
import { siteApi } from '../api/siteApi'
import type { SiteApi, SiteSearchColumn } from '../types/site.types'

export const siteService = createCrudService<SiteApi, SiteSearchColumn>(siteApi)
