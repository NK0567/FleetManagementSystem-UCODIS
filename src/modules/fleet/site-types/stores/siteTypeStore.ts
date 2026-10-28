import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { siteTypeService } from '../services/siteTypeService'
import type { SiteTypeApi, SiteTypeSearchColumn } from '../types/siteType.types'

export const useSiteTypeStore = defineStore('fleet-site-type', () => {
  const crud = useCrudState<SiteTypeApi, SiteTypeSearchColumn>({
    persistKey: 'fleet-site-type',
    service: siteTypeService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'fleet.siteTypes.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
