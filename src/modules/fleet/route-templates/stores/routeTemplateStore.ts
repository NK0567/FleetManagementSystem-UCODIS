import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { routeTemplateService } from '../services/routeTemplateService'
import type { RouteTemplateApi, RouteTemplateSearchColumn } from '../types/routeTemplate.types'

export const useRouteTemplateStore = defineStore('fleet-route-template', () => {
  const crud = useCrudState<RouteTemplateApi, RouteTemplateSearchColumn>({
    persistKey: 'fleet-route-template',
    service: routeTemplateService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'fleet.routeTemplates.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
