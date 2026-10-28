import { createCrudService } from '@/core/factories'
import { competenceApi } from '../api/competenceApi'
import type { CompetenceApi, CompetenceSearchColumn } from '../types/competence.types'

export const competenceService = createCrudService<CompetenceApi, CompetenceSearchColumn>(
  competenceApi
)
