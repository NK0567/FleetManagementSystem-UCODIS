import { createCrudService } from '@/core/factories'
import { telematicsEventTypeApi } from '../api/telematicsEventTypeApi'
import type {
  TelematicsEventTypeApi,
  TelematicsEventTypeSearchColumn
} from '../types/telematicsEventType.types'

export const telematicsEventTypeService = createCrudService<
  TelematicsEventTypeApi,
  TelematicsEventTypeSearchColumn
>(telematicsEventTypeApi)
