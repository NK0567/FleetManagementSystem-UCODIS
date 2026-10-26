import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { technicianService } from '../services/technicianService'
import type { TechnicianApi, TechnicianSearchColumn } from '../types/technician.types'

export const useTechnicianStore = defineStore('maintenance-technician', () => {
  const crud = useCrudState<TechnicianApi, TechnicianSearchColumn>({
    persistKey: 'maintenance-technician',
    service: technicianService,
    defaultSearchColumn: 'no,fullName',
    entityLabelKey: 'maintenance.technicians.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
