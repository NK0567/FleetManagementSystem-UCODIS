import { createCrudService } from '@/core/factories'
import { departureAuthorizationApi } from '../api/departureAuthorizationApi'
import type {
  DepartureAuthorizationApi,
  DepartureAuthorizationSearchColumn
} from '../types/departureAuthorization.types'

export const departureAuthorizationService = {
  ...createCrudService<DepartureAuthorizationApi, DepartureAuthorizationSearchColumn>(
    departureAuthorizationApi
  ),
  async grant(no: string): Promise<DepartureAuthorizationApi> {
    return (await departureAuthorizationApi.grant(no)).data.data
  },
  async refuse(no: string, reason: string): Promise<DepartureAuthorizationApi> {
    return (await departureAuthorizationApi.refuse(no, reason)).data.data
  }
}
