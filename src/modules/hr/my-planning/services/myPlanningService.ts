import { myPlanningApi } from '../api/myPlanningApi'
import type { MyPlanningApi } from '../types/myPlanning.types'

export const myPlanningService = {
  async get(weekStart?: string): Promise<MyPlanningApi> {
    return (await myPlanningApi.get(weekStart)).data.data
  }
}
