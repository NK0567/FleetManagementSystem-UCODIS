import { createCrudService } from '@/core/factories'
import { failureCodeApi } from '../api/failureCodeApi'
import type { FailureCodeApi, FailureCodeSearchColumn } from '../types/failureCode.types'

export const failureCodeService = createCrudService<FailureCodeApi, FailureCodeSearchColumn>(
  failureCodeApi
)
