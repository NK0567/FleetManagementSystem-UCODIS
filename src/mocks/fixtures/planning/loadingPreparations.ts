import type { CollectionDefinition, MockRow } from '../../db/collection'
import type {
  PlanEntry,
  PreparationStatus,
  PreparationVehicleInput
} from '@/modules/planning/loading-preparations/types/loadingPreparation.types'

/** A loading preparation of several vehicles from one depot (TRS01-US20); none at start. */
export interface LoadingPreparationRow extends MockRow {
  depotSiteNo: string
  loadingDate: string
  validUntil: string | null
  region: string
  status: PreparationStatus
  requestNos: string[]
  vehicles: PreparationVehicleInput[]
  plan: PlanEntry[]
}

export const loadingPreparationsCollection: CollectionDefinition<LoadingPreparationRow> = {
  name: 'planning-loading-preparations',
  seed: () => [],
  dateFields: ['loadingDate', 'validUntil']
}
