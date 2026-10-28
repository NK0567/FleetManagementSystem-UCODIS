import { createCrudApi } from '@/core/factories'
import type { EquipmentTypeApi } from '../types/equipmentType.types'

export const equipmentTypeApi = createCrudApi<EquipmentTypeApi>({
  basePath: '/fleet/equipment-types'
})
