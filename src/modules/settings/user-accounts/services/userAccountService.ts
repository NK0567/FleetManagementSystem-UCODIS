import { createCrudService } from '@/core/factories'
import { userAccountApi } from '../api/userAccountApi'
import type { UserAccountApi, UserAccountSearchColumn } from '../types/userAccount.types'

export const userAccountService = {
  ...createCrudService<UserAccountApi, UserAccountSearchColumn>(userAccountApi),
  async disable(no: string, reason: string): Promise<UserAccountApi> {
    return (await userAccountApi.disable(no, reason)).data.data
  },
  async enable(no: string): Promise<UserAccountApi> {
    return (await userAccountApi.enable(no)).data.data
  }
}
