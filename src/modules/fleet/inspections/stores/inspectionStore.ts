import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { inspectionService } from '../services/inspectionService'
import type { InspectionApi, InspectionSearchColumn } from '../types/inspection.types'

export const useInspectionStore = defineStore('fleet-inspection', () => {
  const crud = useCrudState<InspectionApi, InspectionSearchColumn>({
    persistKey: 'fleet-inspection',
    service: inspectionService,
    defaultSearchColumn: 'no,vehiclePlate,center',
    entityLabelKey: 'fleet.inspections.title',
    defaultSortBy: 'inspectedOn',
    defaultSortDirection: 'DESC'
  })

  return { ...crud }
})
