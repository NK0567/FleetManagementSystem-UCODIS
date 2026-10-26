<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { appConfig } from '@/core/app/appConfig'
import { useNavLayout } from '@/composables/useNavLayout'
import logo from '@/assets/logo-ucodis.png'

const { t } = useI18n()
const { menus, isMenuActive, pickMenu } = useNavLayout()
</script>

<template>
  <header class="bg-card border-b border-border shadow-xs shrink-0 z-30 relative">
    <div class="flex items-center gap-6 px-4 py-2">
      <RouterLink to="/" class="inline-flex items-center gap-2 shrink-0">
        <img :src="logo" :alt="appConfig.companyName" class="h-7" />
        <span class="pt-1 text-base font-semibold text-card-foreground whitespace-nowrap">
          {{ appConfig.companyName }}
        </span>
      </RouterLink>
      <div class="h-4 w-px bg-border"></div>
      <nav class="flex items-center gap-1 overflow-x-auto min-w-0">
        <button
          v-for="menu in menus"
          :key="menu.labelKey"
          type="button"
          class="cursor-pointer px-3 py-2 text-sm whitespace-nowrap rounded transition-colors"
          :class="
            isMenuActive(menu)
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:bg-accent hover:text-card-foreground'
          "
          @click="pickMenu(menu)"
        >
          {{ t(menu.labelKey) }}
        </button>
      </nav>
    </div>
  </header>
</template>
