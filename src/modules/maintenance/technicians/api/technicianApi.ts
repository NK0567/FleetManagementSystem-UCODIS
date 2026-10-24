import { createCrudApi } from '@/core/factories'
import type { TechnicianApi } from '../types/technician.types'

export const technicianApi = createCrudApi<TechnicianApi>({
  basePath: '/maintenance/technicians'
})
