import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { fuelCardService } from '../services/fuelCardService'
import type { FuelCardApi, FuelCardSearchColumn } from '../types/fuelCard.types'

export const useFuelCardStore = defineStore('fleet-fuel-card', () => {
  const crud = useCrudState<FuelCardApi, FuelCardSearchColumn>({
    persistKey: 'fleet-fuel-card',
    service: fuelCardService,
    defaultSearchColumn: 'no,number,holderName',
    entityLabelKey: 'fleet.fuelCards.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
