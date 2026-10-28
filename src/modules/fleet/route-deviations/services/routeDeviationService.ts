import { createCrudService } from '@/core/factories'
import { routeDeviationApi, type DeviationQualificationInput } from '../api/routeDeviationApi'
import type {
  RouteDeviationApi,
  RouteDeviationSearchColumn,
  RouteDeviationSummary
} from '../types/routeDeviation.types'

export const routeDeviationService = {
  ...createCrudService<RouteDeviationApi, RouteDeviationSearchColumn>(routeDeviationApi),
  async summary(): Promise<RouteDeviationSummary> {
    return (await routeDeviationApi.summary()).data.data
  },
  async justify(no: string, justification: string): Promise<RouteDeviationApi> {
    return (await routeDeviationApi.justify(no, justification)).data.data
  },
  async qualify(
    no: string,
    qualification: DeviationQualificationInput
  ): Promise<RouteDeviationApi> {
    return (await routeDeviationApi.qualify(no, qualification)).data.data
  }
}
