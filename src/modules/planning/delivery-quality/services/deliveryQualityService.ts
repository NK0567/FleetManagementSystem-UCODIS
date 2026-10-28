import { deliveryQualityApi } from '../api/deliveryQualityApi'
import type {
  ProtestInput,
  QualityRowApi,
  ResponsibilityInput
} from '../types/deliveryQuality.types'

type LineRef = Pick<QualityRowApi, 'orderNo' | 'lineNo'>

export const deliveryQualityService = {
  async list(): Promise<QualityRowApi[]> {
    return (await deliveryQualityApi.list()).data.data
  },
  async prepareProtest(line: LineRef, body: ProtestInput): Promise<string> {
    return (await deliveryQualityApi.prepareProtest(line.orderNo, line.lineNo, body)).data.data.no
  },
  async issueProtest(line: LineRef, protestNo: string): Promise<void> {
    await deliveryQualityApi.issueProtest(line.orderNo, line.lineNo, protestNo)
  },
  async closeProtest(line: LineRef, protestNo: string, outcome: string): Promise<void> {
    await deliveryQualityApi.closeProtest(line.orderNo, line.lineNo, protestNo, outcome)
  },
  async setResponsibility(line: LineRef, body: ResponsibilityInput): Promise<void> {
    await deliveryQualityApi.setResponsibility(line.orderNo, line.lineNo, body)
  },
  async issueCredit(line: LineRef, reference: string): Promise<void> {
    await deliveryQualityApi.issueCredit(line.orderNo, line.lineNo, reference)
  }
}
