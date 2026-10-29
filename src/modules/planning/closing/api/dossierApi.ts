import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'
import type { OrderDossierApi } from '../types/dossier.types'

export const dossierApi = {
  /** The complete file of the order (TRS02-US07). */
  async ofOrder(no: string): Promise<OrderDossierApi> {
    const path = `${resourcePath('/planning/transport-orders', no)}/dossier`
    return (await httpClient.get<SingleResponse<OrderDossierApi>>(path)).data.data
  }
}
