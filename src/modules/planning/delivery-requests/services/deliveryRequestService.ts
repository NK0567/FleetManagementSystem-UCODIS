import { createCrudService } from '@/core/factories'
import type { ImportReport } from '@/core/utils/csvImport'
import { deliveryRequestApi, type DeliveryRequestAction } from '../api/deliveryRequestApi'
import type {
  DeliveryRequestApi,
  DeliveryRequestSearchColumn
} from '../types/deliveryRequest.types'

export const deliveryRequestService = {
  ...createCrudService<DeliveryRequestApi, DeliveryRequestSearchColumn>(deliveryRequestApi),
  async act(
    no: string,
    action: DeliveryRequestAction,
    body: Record<string, unknown> = {}
  ): Promise<DeliveryRequestApi> {
    return (await deliveryRequestApi.act(no, action, body)).data.data
  },
  async importRows(rows: Record<string, unknown>[]): Promise<ImportReport> {
    return (await deliveryRequestApi.importRows(rows)).data.data
  }
}
