import { createCrudService } from '@/core/factories'
import { inspectionApi, type InspectionGridItem } from '../api/inspectionApi'
import type { InspectionApi, InspectionSearchColumn } from '../types/inspection.types'

export const inspectionService = {
  ...createCrudService<InspectionApi, InspectionSearchColumn>(inspectionApi),
  async grid(vehicleNo: string): Promise<InspectionGridItem[]> {
    return (await inspectionApi.grid(vehicleNo)).data.data
  },
  async recheck(no: string, recheckDoneOn: string): Promise<InspectionApi> {
    return (await inspectionApi.recheck(no, recheckDoneOn)).data.data
  }
}
