import { createCrudService } from '@/core/factories'
import { medicalFollowUpApi } from '../api/medicalFollowUpApi'
import type {
  MedicalFollowUpApi,
  MedicalFollowUpSearchColumn
} from '../types/medicalFollowUp.types'

export const medicalFollowUpService = {
  ...createCrudService<MedicalFollowUpApi, MedicalFollowUpSearchColumn>(medicalFollowUpApi)
}
