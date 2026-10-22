import { createCrudApi } from '@/core/factories'
import type { ModuleToggleApi } from '../types/moduleToggle.types'

export const moduleToggleApi = createCrudApi<ModuleToggleApi>({
  basePath: '/settings/module-toggles'
})
