import { createCrudApi } from '@/core/factories'
import type { MedicalFollowUpApi } from '../types/medicalFollowUp.types'

const basePath = '/fleet/medical-follow-ups'

export const medicalFollowUpApi = {
  ...createCrudApi<MedicalFollowUpApi>({ basePath })
}
