import { createCrudApi } from '@/core/factories'
import type { TelematicsEventTypeApi } from '../types/telematicsEventType.types'

export const telematicsEventTypeApi = createCrudApi<TelematicsEventTypeApi>({
  basePath: '/fleet/telematics-event-types'
})
