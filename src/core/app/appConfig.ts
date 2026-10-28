export const appConfig = {
  name: import.meta.env.VITE_APP_NAME || 'FMS UCODIS',
  companyName: import.meta.env.VITE_COMPANY_NAME || '',
  version: import.meta.env.VITE_APP_VERSION || '0.0.0',
  useMockApi: import.meta.env.VITE_USE_MOCK_API === 'true'
} as const
