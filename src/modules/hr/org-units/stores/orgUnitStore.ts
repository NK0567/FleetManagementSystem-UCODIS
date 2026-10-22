import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { useCrudState } from '@/core/factories'
import { orgUnitService } from '../services/orgUnitService'
import type { OrgUnitApi, OrgUnitSearchColumn } from '../types/orgUnit.types'

export const useOrgUnitStore = defineStore('hr-org-unit', () => {
  const crud = useCrudState<OrgUnitApi, OrgUnitSearchColumn>({
    persistKey: 'hr-org-unit',
    service: orgUnitService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'hr.orgUnits.title',
    defaultSortBy: 'no'
  })

  /** Every unit, unfiltered: the tree and the chart always show the whole company. */
  const structure = ref<OrgUnitApi[]>([])
  const structureLoading = ref(false)
  const structureError = ref<string | null>(null)

  async function fetchStructure() {
    structureLoading.value = true
    structureError.value = null
    try {
      structure.value = await orgUnitService.getStructure()
    } catch {
      structureError.value = i18n.global.t('common.error.loadList', {
        entity: i18n.global.t('hr.orgUnits.title')
      })
    } finally {
      structureLoading.value = false
    }
  }

  return { ...crud, structure, structureLoading, structureError, fetchStructure }
})
