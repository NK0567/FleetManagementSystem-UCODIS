import { createCrudService } from '@/core/factories'
import { workOrderApi, type WorkOrderAction } from '../api/workOrderApi'
import type { WorkOrderApi, WorkOrderSearchColumn } from '../types/workOrder.types'

export const workOrderService = {
  ...createCrudService<WorkOrderApi, WorkOrderSearchColumn>(workOrderApi),
  async act(
    no: string,
    action: WorkOrderAction,
    body: Record<string, unknown> = {}
  ): Promise<WorkOrderApi> {
    return (await workOrderApi.act(no, action, body)).data.data
  },
  async openFromSource(origin: string, originNo: string): Promise<WorkOrderApi> {
    return (await workOrderApi.openFromSource(origin, originNo)).data.data
  }
}
