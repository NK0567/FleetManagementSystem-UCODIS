import { createApp } from 'vue'
import { createPinia } from 'pinia'
import httpClient from '@/core/api/httpClient'
import i18n from '@/core/i18n'
import {
  getBootstrapMessage,
  showBootstrapOverlay,
  shouldBootstrapOnColdStart
} from '@/core/bootstrap/appBootstrap'
import { registerModules } from '@/modules'
import router from './router'
import App from './App.vue'
import './style.css'

async function bootstrap() {
  if (shouldBootstrapOnColdStart()) showBootstrapOverlay(getBootstrapMessage())

  // Literal check so the production build drops the mock backend when it is disabled.
  if (import.meta.env.VITE_USE_MOCK_API === 'true') {
    const { installMockApi } = await import('@/mocks')
    installMockApi(httpClient)
  }

  registerModules()
  createApp(App).use(createPinia()).use(i18n).use(router).mount('#app')
}

void bootstrap()
