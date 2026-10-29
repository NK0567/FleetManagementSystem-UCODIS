import { createCrudService } from '@/core/factories'
import type { AvailabilityApi } from '@/modules/fleet/trips'
import { transportOrderApi, type TransportOrderAction } from '../api/transportOrderApi'
import type {
  DebriefingInput,
  TransportOrderApi,
  TransportOrderClosingApi,
  TransportOrderLineInput,
  TransportOrderSearchColumn
} from '../types/transportOrder.types'

export const transportOrderService = {
  ...createCrudService<TransportOrderApi, TransportOrderSearchColumn>(transportOrderApi),
  async replaceLines(
    no: string,
    lines: TransportOrderLineInput[],
    force = false
  ): Promise<TransportOrderApi> {
    return (await transportOrderApi.replaceLines(no, lines, force)).data.data
  },
  /** The execution order of the lines; their line numbers stay as they are. */
  async reorderLines(no: string, lineNos: number[]): Promise<TransportOrderApi> {
    return (await transportOrderApi.reorderLines(no, lineNos)).data.data
  },
  async act(
    no: string,
    action: TransportOrderAction,
    body: Record<string, unknown> = {}
  ): Promise<TransportOrderApi> {
    return (await transportOrderApi.act(no, action, body)).data.data
  },
  async depart(no: string): Promise<void> {
    await transportOrderApi.depart(no)
  },
  async declareLine(
    no: string,
    lineNo: number,
    receivedQuantity: number,
    justification = ''
  ): Promise<void> {
    await transportOrderApi.declareLine(no, lineNo, receivedQuantity, justification)
  },
  async handBack(no: string, lineNo: number): Promise<void> {
    await transportOrderApi.handBack(no, lineNo)
  },
  async remainder(no: string, lineNo: number, date: string): Promise<void> {
    await transportOrderApi.remainder(no, lineNo, date)
  },
  async closing(no: string): Promise<TransportOrderClosingApi> {
    return (await transportOrderApi.closing(no)).data.data
  },
  async attachDocument(no: string, kind: string, fileNo: string): Promise<void> {
    await transportOrderApi.attachDocument(no, kind, fileNo)
  },
  async saveDebriefing(no: string, debriefing: DebriefingInput): Promise<void> {
    await transportOrderApi.saveDebriefing(no, debriefing)
  },
  async close(no: string): Promise<void> {
    await transportOrderApi.close(no)
  },
  async availability(from: string, to: string): Promise<AvailabilityApi> {
    return (await transportOrderApi.availability(from, to)).data.data
  }
}
