import { createCrudService } from '@/core/factories'
import { tyreApi, type TyreAction } from '../api/tyreApi'
import type { TyreApi, TyrePositionSlot, TyreSearchColumn } from '../types/tyre.types'

export const tyreService = {
  ...createCrudService<TyreApi, TyreSearchColumn>(tyreApi),
  async positions(vehicleNo: string): Promise<TyrePositionSlot[]> {
    return (await tyreApi.positions(vehicleNo)).data.data
  },
  async act(no: string, action: TyreAction, body: Record<string, unknown> = {}): Promise<TyreApi> {
    return (await tyreApi.act(no, action, body)).data.data
  }
}
