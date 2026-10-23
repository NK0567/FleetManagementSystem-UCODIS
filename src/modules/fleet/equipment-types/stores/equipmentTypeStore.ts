import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { equipmentTypeService } from '../services/equipmentTypeService'
import type { EquipmentTypeApi, EquipmentTypeSearchColumn } from '../types/equipmentType.types'

export const useEquipmentTypeStore = defineStore('fleet-equipment-type', () => {
  const crud = useCrudState<EquipmentTypeApi, EquipmentTypeSearchColumn>({
    persistKey: 'fleet-equipment-type',
    service: equipmentTypeService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'fleet.equipmentTypes.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
