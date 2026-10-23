import { createCrudService } from '@/core/factories'
import { routeTemplateApi } from '../api/routeTemplateApi'
import type { RouteTemplateApi, RouteTemplateSearchColumn } from '../types/routeTemplate.types'

export const routeTemplateService = createCrudService<RouteTemplateApi, RouteTemplateSearchColumn>(
  routeTemplateApi
)
