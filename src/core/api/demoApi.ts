import httpClient from '@/core/api/httpClient'

/** Only served by the mock backend: puts every demo record back in its initial state. */
export const demoApi = {
  resetData() {
    return httpClient.post('/__mock/reset')
  }
}
