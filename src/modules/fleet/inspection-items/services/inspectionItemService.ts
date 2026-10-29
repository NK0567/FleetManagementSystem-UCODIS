import { createCrudService } from '@/core/factories'
import { inspectionItemApi } from '../api/inspectionItemApi'
import type { InspectionItemApi, InspectionItemSearchColumn } from '../types/inspectionItem.types'

export const inspectionItemService = createCrudService<
  InspectionItemApi,
  InspectionItemSearchColumn
>(inspectionItemApi)
