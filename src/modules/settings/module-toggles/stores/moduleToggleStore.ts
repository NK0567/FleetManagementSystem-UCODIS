import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { useCrudState } from '@/core/factories'
import { useMenuPermissionsStore } from '@/stores/menuPermissions'
import { moduleToggleService } from '../services/moduleToggleService'
import type { ModuleToggleApi, ModuleToggleSearchColumn } from '../types/moduleToggle.types'

const ALL_TOGGLES_PAGE_SIZE = 100

export const useModuleToggleStore = defineStore('settings-module-toggle', () => {
  const crud = useCrudState<ModuleToggleApi, ModuleToggleSearchColumn>({
    service: moduleToggleService,
    defaultSearchColumn: 'no',
    entityLabelKey: 'settings.moduleToggles.title',
    defaultSortBy: 'order'
  })

  const savingNo = ref<string | null>(null)
  const saveError = ref<string | null>(null)

  const fetchAll = () => crud.fetchItems(1, ALL_TOGGLES_PAGE_SIZE)

  /** The menus and the router guard follow at once: disabled features leave the permissions. */
  async function setActive(no: string, active: boolean) {
    savingNo.value = no
    saveError.value = null
    try {
      const updated = await moduleToggleService.setActive(no, active)
      crud.items.value = crud.items.value.map((item) => (item.no === no ? updated : item))
      await useMenuPermissionsStore().fetchPermissions()
    } catch (error) {
      saveError.value = apiErrorMessage(error, i18n.global.t('settings.moduleToggles.saveError'))
    } finally {
      savingNo.value = null
    }
  }

  return { ...crud, savingNo, saveError, fetchAll, setActive }
})
