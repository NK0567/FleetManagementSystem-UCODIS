import { defineStore } from 'pinia'
import { makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import type { TrainingStatus } from '../domain/training'
import { trainingService } from '../services/trainingService'
import type { TrainingApi, TrainingSearchColumn } from '../types/training.types'

export type TrainingListView = 'pending' | 'attended' | 'all'

const VIEW_STATUSES: Record<TrainingListView, TrainingStatus[] | null> = {
  pending: ['to_plan', 'planned'],
  attended: ['attended'],
  all: null
}

function viewFilters(view: TrainingListView): ListFilter[] {
  const statuses = VIEW_STATUSES[view]
  return statuses ? [{ field: 'status', valueType: 'string', value: statuses }] : []
}

function detectView(filters: ListFilter[]): TrainingListView {
  const value = JSON.stringify(filters.find((filter) => filter.field === 'status')?.value ?? null)
  const match = (Object.keys(VIEW_STATUSES) as TrainingListView[]).find(
    (view) => JSON.stringify(VIEW_STATUSES[view]) === value
  )
  return match ?? 'all'
}

export const useTrainingStore = defineStore('fleet-training', () => {
  const crud = useCrudState<TrainingApi, TrainingSearchColumn>({
    persistKey: 'fleet-training',
    service: trainingService,
    defaultSearchColumn: 'no,employeeName,topic,originNo',
    entityLabelKey: 'fleet.trainings.title',
    defaultSortBy: 'plannedOn',
    defaultUserFilters: viewFilters('pending')
  })

  const { listView, setListView } = makeViewAsFilters<TrainingListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['status'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  return { ...crud, listView, setListView }
})
