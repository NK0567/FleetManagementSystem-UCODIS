import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { competenceService } from '../services/competenceService'
import type { CompetenceApi, CompetenceSearchColumn } from '../types/competence.types'

export const useCompetenceStore = defineStore('maintenance-competence', () => {
  const crud = useCrudState<CompetenceApi, CompetenceSearchColumn>({
    persistKey: 'maintenance-competence',
    service: competenceService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'maintenance.competences.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
