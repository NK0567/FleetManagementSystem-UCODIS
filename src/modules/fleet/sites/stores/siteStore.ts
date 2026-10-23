import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { siteService } from '../services/siteService'
import type { SiteApi, SiteSearchColumn } from '../types/site.types'

export const useSiteStore = defineStore('fleet-site', () => {
  const crud = useCrudState<SiteApi, SiteSearchColumn>({
    persistKey: 'fleet-site',
    service: siteService,
    defaultSearchColumn: 'no,name,city',
    entityLabelKey: 'fleet.sites.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
