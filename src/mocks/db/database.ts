import { demoDayOffset } from '../clock'
import { moduleTogglesCollection } from '../fixtures/settings/moduleToggles'
import { createCollection, type CollectionContext } from './collection'
import { clearStoredCollections } from './storage'

/** Bump when fixtures change shape: every collection is then reseeded. */
export const MOCK_SEED_VERSION = 1

export function createDatabase(
  context: CollectionContext = {
    seedVersion: MOCK_SEED_VERSION,
    dayOffset: demoDayOffset()
  }
) {
  const collections = {
    moduleToggles: createCollection(moduleTogglesCollection, context)
  }

  return {
    ...collections,
    reset(): void {
      clearStoredCollections()
      for (const collection of Object.values(collections)) collection.reset()
    }
  }
}

export type MockDatabase = ReturnType<typeof createDatabase>
