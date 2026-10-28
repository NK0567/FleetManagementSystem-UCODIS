import { createCrudApi } from '@/core/factories'
import type { CompetenceApi } from '../types/competence.types'

export const competenceApi = createCrudApi<CompetenceApi>({
  basePath: '/maintenance/competences'
})
