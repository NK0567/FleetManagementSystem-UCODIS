import { createCrudService } from '@/core/factories'
import { technicianApi } from '../api/technicianApi'
import type { TechnicianApi, TechnicianSearchColumn } from '../types/technician.types'

export const technicianService = createCrudService<TechnicianApi, TechnicianSearchColumn>(
  technicianApi
)
