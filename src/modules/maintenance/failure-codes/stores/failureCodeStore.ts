import { defineStore } from 'pinia'
import { useCrudState } from '@/core/factories'
import { failureCodeService } from '../services/failureCodeService'
import type { FailureCodeApi, FailureCodeSearchColumn } from '../types/failureCode.types'

export const useFailureCodeStore = defineStore('maintenance-failure-code', () => {
  const crud = useCrudState<FailureCodeApi, FailureCodeSearchColumn>({
    persistKey: 'maintenance-failure-code',
    service: failureCodeService,
    defaultSearchColumn: 'no,name',
    entityLabelKey: 'maintenance.failureCodes.title',
    defaultSortBy: 'no'
  })

  return { ...crud }
})
