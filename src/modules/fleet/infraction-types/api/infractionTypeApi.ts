import { createCrudApi } from '@/core/factories'
import type { InfractionTypeApi } from '../types/infractionType.types'

export const infractionTypeApi = createCrudApi<InfractionTypeApi>({
  basePath: '/fleet/infraction-types'
})
