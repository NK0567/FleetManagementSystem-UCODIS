import { createCrudApi } from '@/core/factories'
import type { MissionTypeApi } from '../types/missionType.types'

export const missionTypeApi = createCrudApi<MissionTypeApi>({
  basePath: '/maintenance/mission-types'
})
