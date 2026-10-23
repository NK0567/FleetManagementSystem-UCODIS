import { createCrudService } from '@/core/factories'
import { equipmentTypeApi } from '../api/equipmentTypeApi'
import type { EquipmentTypeApi, EquipmentTypeSearchColumn } from '../types/equipmentType.types'

export const equipmentTypeService = createCrudService<EquipmentTypeApi, EquipmentTypeSearchColumn>(
  equipmentTypeApi
)
