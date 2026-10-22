import type { ReferenceData } from '@/types/reference.types'
import type { MockDatabase } from '../db/database'
import { optionsFor } from '../fixtures/options'
import { toMockLanguage } from '../i18n'
import { ok } from '../http/responses'
import type { MockRouter } from '../http/router'

/** Small lists used by selects and filters; each module adds its own entries. */
function referenceData(): ReferenceData {
  return {}
}

export function registerSharedHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/options/all', { public: true }, (request) =>
    ok(optionsFor(toMockLanguage(request.query.language ?? request.language)))
  )

  router.get('/reference/all', {}, () => ok(referenceData()))

  router.post('/__mock/reset', {}, () => {
    db.reset()
    return ok(null)
  })
}
