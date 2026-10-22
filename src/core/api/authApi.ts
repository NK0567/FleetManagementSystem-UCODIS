import httpClient from '@/core/api/httpClient'
import type { ApiResponse } from '@/types/api-response.types'
import type {
  DemoAccount,
  LoginRequest,
  LoginResponseData,
  User,
  UserPermissionRow
} from '@/types/auth.types'

export const authApi = {
  login(payload: LoginRequest) {
    return httpClient.post<ApiResponse<LoginResponseData>>('/auth/login', payload)
  },
  getProfile() {
    return httpClient.get<ApiResponse<User>>('/auth/profile')
  },
  getPermissions() {
    return httpClient.get<ApiResponse<UserPermissionRow[]>>('/auth/permissions')
  },
  getDemoAccounts() {
    return httpClient.get<ApiResponse<DemoAccount[]>>('/auth/demo-accounts')
  }
}
