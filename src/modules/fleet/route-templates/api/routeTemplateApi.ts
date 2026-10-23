import { createCrudApi } from '@/core/factories'
import type { RouteTemplateApi } from '../types/routeTemplate.types'

export const routeTemplateApi = createCrudApi<RouteTemplateApi>({
  basePath: '/fleet/route-templates'
})
