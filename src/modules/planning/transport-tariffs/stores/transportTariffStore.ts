import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { transportTariffService } from '../services/transportTariffService'
import type {
  TransportTariffApi,
  TransportTariffSearchColumn
} from '../types/transportTariff.types'

export const useTransportTariffStore = defineStore('planning-transport-tariff', () => {
  const crud = useCrudState<TransportTariffApi, TransportTariffSearchColumn>({
    persistKey: 'planning-transport-tariff',
    service: transportTariffService,
    defaultSearchColumn: 'no,partyName,family',
    entityLabelKey: 'planning.transportTariffs.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
