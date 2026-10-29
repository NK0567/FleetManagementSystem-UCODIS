import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { DeliveryNoteApi } from '../types/deliveryNote.types'

export const deliveryNoteApi = {
  async ofOrder(orderNo: string): Promise<DeliveryNoteApi[]> {
    const response = await httpClient.get<SingleResponse<DeliveryNoteApi[]>>(
      `${resourcePath('/planning/transport-orders', orderNo)}/delivery-notes`
    )
    return response.data.data
  }
}
