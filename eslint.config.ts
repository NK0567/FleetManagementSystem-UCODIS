import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}']
  },

  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    'legacy/**',
    'src/typed-router.d.ts',
    'src/components.d.ts'
  ]),

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  skipFormatting,

  {
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  },

  {
    name: 'app/mock-backend-entry',
    files: ['src/**/*.{ts,vue}'],
    ignores: ['src/main.ts', 'src/mocks/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/mocks', '@/mocks/*'],
              message: 'The mock backend is installed by src/main.ts only.'
            }
          ]
        }
      ]
    }
  },

  {
    name: 'app/mock-backend-isolation',
    files: ['src/mocks/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['vue', 'pinia', 'vue-router', 'vue-i18n'],
          patterns: [
            {
              group: [
                '*.vue',
                '@/stores/*',
                '@/components/*',
                '@/composables/*',
                '@/layouts/*',
                '@/pages/*',
                '@/modules/*/*/stores/*',
                '@/modules/*/*/components/*',
                '@/modules/*/*/pages/*'
              ],
              message: 'The mock backend plays the server: it may only use types and domain rules.'
            }
          ]
        }
      ]
    }
  }
)
