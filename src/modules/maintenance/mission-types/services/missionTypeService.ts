import { createCrudService } from '@/core/factories'
import { missionTypeApi } from '../api/missionTypeApi'
import type { MissionTypeApi, MissionTypeSearchColumn } from '../types/missionType.types'

export const missionTypeService = createCrudService<MissionTypeApi, MissionTypeSearchColumn>(
  missionTypeApi
)
