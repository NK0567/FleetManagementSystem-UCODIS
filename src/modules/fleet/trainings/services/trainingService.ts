import { createCrudService } from '@/core/factories'
import { trainingApi } from '../api/trainingApi'
import type { TrainingApi, TrainingSearchColumn } from '../types/training.types'

export const trainingService = {
  ...createCrudService<TrainingApi, TrainingSearchColumn>(trainingApi),
  async attend(no: string, attendedOn: string, result: string): Promise<TrainingApi> {
    return (await trainingApi.attend(no, attendedOn, result)).data.data
  },
  async cancel(no: string, reason: string): Promise<TrainingApi> {
    return (await trainingApi.cancel(no, reason)).data.data
  }
}
