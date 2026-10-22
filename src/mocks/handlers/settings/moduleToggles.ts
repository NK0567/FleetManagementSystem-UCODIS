import type { ModuleToggleApi } from '@/modules/settings/module-toggles/types/moduleToggle.types'
import type { MockDatabase } from '../../db/database'
import { requiredField } from '../../http/errors'
import { registerCrudResource } from '../../http/crudResource'
import type { MockRouter } from '../../http/router'
import { MODULE_TOGGLE_CATALOG, type ModuleToggleRow } from '../../fixtures/settings/moduleToggles'

function toApi(row: ModuleToggleRow): ModuleToggleApi {
  const definition = MODULE_TOGGLE_CATALOG.find((toggle) => toggle.no === row.no)
  return {
    no: row.no,
    group: definition?.group ?? 'fleet',
    order: definition?.order ?? 0,
    active: row.active,
    features: [...(definition?.features ?? [])],
    modifiedAt: row.modifiedAt,
    modifiedBy: row.modifiedBy
  }
}

export function registerModuleToggleHandlers(router: MockRouter, db: MockDatabase): void {
  registerCrudResource(router, {
    basePath: '/settings/module-toggles',
    feature: 'MODULETOGGLE',
    collection: db.moduleToggles,
    toApi,
    update: (_existing, input) => {
      if (typeof input.active !== 'boolean') throw requiredField('active')
      return { active: input.active }
    }
  })
}
