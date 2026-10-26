import { createCrudService } from '@/core/factories'
import type { AvailabilityApi } from '@/modules/fleet/trips'
import { transportOrderApi, type TransportOrderAction } from '../api/transportOrderApi'
import type {
  TransportOrderApi,
  TransportOrderLineInput,
  TransportOrderSearchColumn
} from '../types/transportOrder.types'

export const transportOrderService = {
  ...createCrudService<TransportOrderApi, TransportOrderSearchColumn>(transportOrderApi),
  async replaceLines(no: string, lines: TransportOrderLineInput[]): Promise<TransportOrderApi> {
    return (await transportOrderApi.replaceLines(no, lines)).data.data
  },
  async act(
    no: string,
    action: TransportOrderAction,
    body: Record<string, unknown> = {}
  ): Promise<TransportOrderApi> {
    return (await transportOrderApi.act(no, action, body)).data.data
  },
  async availability(from: string, to: string): Promise<AvailabilityApi> {
    return (await transportOrderApi.availability(from, to)).data.data
  }
}
