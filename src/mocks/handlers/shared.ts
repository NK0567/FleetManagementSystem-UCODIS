import type { ReferenceData } from '@/types/reference.types'
import type { MockDatabase } from '../db/database'
import { optionsFor } from '../fixtures/options'
import { toMockLanguage } from '../i18n'
import { ok } from '../http/responses'
import type { MockRouter } from '../http/router'
import { fleetReferenceData } from './fleet/references'
import { hrReferenceData } from './hr/references'
import { maintenanceReferenceData } from './maintenance/references'
import { planningReferenceData } from './planning/references'

/** Small lists used by selects and filters; each module adds its own entries. */
function referenceData(db: MockDatabase): ReferenceData {
  return {
    ...hrReferenceData(db),
    ...fleetReferenceData(db),
    ...maintenanceReferenceData(db),
    ...planningReferenceData(db)
  }
}

export function registerSharedHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/options/all', { public: true }, (request) =>
    ok(optionsFor(toMockLanguage(request.query.language ?? request.language)))
  )

  router.get('/reference/all', {}, () => ok(referenceData(db)))

  router.post('/__mock/reset', {}, () => {
    db.reset()
    return ok(null)
  })
}
