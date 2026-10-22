import { createCrudService } from '@/core/factories'
import { moduleToggleApi } from '../api/moduleToggleApi'
import type { ModuleToggleApi, ModuleToggleSearchColumn } from '../types/moduleToggle.types'

const crudService = createCrudService<ModuleToggleApi, ModuleToggleSearchColumn>(moduleToggleApi)

export const moduleToggleService = {
  ...crudService,
  setActive(no: string, active: boolean): Promise<ModuleToggleApi> {
    return crudService.update(no, { active })
  }
}
