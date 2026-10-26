import { confirmationApi } from '../api/confirmationApi'
import type {
  ActionBody,
  ConfirmationAction,
  ConfirmationLineApi,
  ReceptionAction,
  ReceptionLineApi
} from '../types/confirmation.types'

export const confirmationService = {
  async list(): Promise<ConfirmationLineApi[]> {
    return (await confirmationApi.list()).data.data
  },
  async act(
    line: Pick<ConfirmationLineApi, 'orderNo' | 'lineNo'>,
    action: ConfirmationAction,
    body: ActionBody = {}
  ): Promise<void> {
    await confirmationApi.act(line.orderNo, line.lineNo, action, body)
  },
  async receptions(): Promise<ReceptionLineApi[]> {
    return (await confirmationApi.receptions()).data.data
  },
  async receive(
    line: Pick<ReceptionLineApi, 'orderNo' | 'lineNo'>,
    action: ReceptionAction,
    body: ActionBody
  ): Promise<void> {
    await confirmationApi.receive(line.orderNo, line.lineNo, action, body)
  }
}
