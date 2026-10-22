import { createApp } from 'vue'
import { createPinia } from 'pinia'
import httpClient from '@/core/api/httpClient'
import i18n from '@/core/i18n'
import router from './router'
import App from './App.vue'

async function bootstrap() {
  // Literal check so the production build drops the mock backend when it is disabled.
  if (import.meta.env.VITE_USE_MOCK_API === 'true') {
    const { installMockApi } = await import('@/mocks')
    installMockApi(httpClient)
  }
  createApp(App).use(createPinia()).use(i18n).use(router).mount('#app')
}

void bootstrap()
