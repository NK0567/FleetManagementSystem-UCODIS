import './assets/main.css'

import { createApp } from 'vue'
import { devise } from './lib/monnaie'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
/* Monnaie de l'entreprise, lisible dans tous les gabarits (FMS-PA). */
app.config.globalProperties.$devise = devise
app.mount('#app')
