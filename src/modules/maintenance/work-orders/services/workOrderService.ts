import { createCrudService } from '@/core/factories'
import { workOrderApi, type WorkOrderAction } from '../api/workOrderApi'
import type { ImportReport } from '@/core/utils/csvImport'
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
  async importHistory(rows: Record<string, unknown>[]): Promise<ImportReport> {
    return (await workOrderApi.importHistory(rows)).data.data
  },
  async openFromSource(origin: string, originNo: string): Promise<WorkOrderApi> {
    return (await workOrderApi.openFromSource(origin, originNo)).data.data
  }
}
