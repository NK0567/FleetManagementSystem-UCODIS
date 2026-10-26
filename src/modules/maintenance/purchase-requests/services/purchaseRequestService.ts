import { createCrudService } from '@/core/factories'
import { purchaseRequestApi, type PurchaseRequestAction } from '../api/purchaseRequestApi'
import type {
  PurchaseRequestApi,
  PurchaseRequestSearchColumn
} from '../types/purchaseRequest.types'

export const purchaseRequestService = {
  ...createCrudService<PurchaseRequestApi, PurchaseRequestSearchColumn>(purchaseRequestApi),
  async act(
    no: string,
    action: PurchaseRequestAction,
    body: Record<string, unknown> = {}
  ): Promise<PurchaseRequestApi> {
    return (await purchaseRequestApi.act(no, action, body)).data.data
  }
}
