import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import VueRouter from 'vue-router/vite'
import Components from 'unplugin-vue-components/vite'
import VueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  base: './',
  plugins: [
    VueRouter({
      routesFolder: 'src/pages',
      dts: 'src/typed-router.d.ts'
    }),
    vue(),
    VueDevTools(),
    tailwindcss(),
    Components({
      dts: 'src/components.d.ts',
      dirs: [
        'src/components',
        'src/components/shared',
        'src/components/layout',
        'src/layouts',
        'src/modules/**/components',
        'src/modules/**/pages'
      ]
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
