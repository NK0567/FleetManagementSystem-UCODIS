import { createCrudApi } from '@/core/factories'
import type { FailureCodeApi } from '../types/failureCode.types'

export const failureCodeApi = createCrudApi<FailureCodeApi>({
  basePath: '/maintenance/failure-codes'
})
