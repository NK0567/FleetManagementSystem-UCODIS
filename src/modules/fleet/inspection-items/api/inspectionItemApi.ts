import { createCrudApi } from '@/core/factories'
import type { InspectionItemApi } from '../types/inspectionItem.types'

export const inspectionItemApi = createCrudApi<InspectionItemApi>({
  basePath: '/fleet/inspection-items'
})
