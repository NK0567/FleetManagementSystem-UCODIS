import { createCrudService } from '@/core/factories'
import { siteTypeApi } from '../api/siteTypeApi'
import type { SiteTypeApi, SiteTypeSearchColumn } from '../types/siteType.types'

export const siteTypeService = createCrudService<SiteTypeApi, SiteTypeSearchColumn>(siteTypeApi)
