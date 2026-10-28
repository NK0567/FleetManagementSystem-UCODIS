import { loadingApi } from '../api/loadingApi'
import type {
  LoadedQuantity,
  LoadingCheckResult,
  LoadingLineApi,
  ReasonChoice,
  ReturnLineApi
} from '../types/loading.types'

type LineRef = { orderNo: string; lineNo: number }

export const loadingService = {
  async list(): Promise<LoadingLineApi[]> {
    return (await loadingApi.list()).data.data
  },
  async returns(): Promise<ReturnLineApi[]> {
    return (await loadingApi.returns()).data.data
  },
  async declare(orderNo: string, lines: LoadedQuantity[]): Promise<void> {
    await loadingApi.declare(orderNo, lines)
  },
  async conform(line: LineRef): Promise<LoadingCheckResult> {
    return (await loadingApi.conform(line.orderNo, line.lineNo)).data.data
  },
  async nonconform(line: LineRef, reason: ReasonChoice): Promise<LoadingCheckResult> {
    return (await loadingApi.nonconform(line.orderNo, line.lineNo, reason)).data.data
  },
  async receiveReturn(line: LineRef, reason: ReasonChoice | null): Promise<void> {
    await loadingApi.receiveReturn(
      line.orderNo,
      line.lineNo,
      reason ? { conforming: false, ...reason } : { conforming: true }
    )
  }
}
