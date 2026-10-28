<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppBootstrapStore } from '@/stores/appBootstrapStore'

const store = useAppBootstrapStore()
const { t } = useI18n()

const message = computed(() => t('common.gettingReady'))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="store.active"
      class="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center font-[family-name:var(--font-sans,Poppins,system-ui,sans-serif)]"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        class="mb-4 h-8 w-8 rounded-full border-2 border-primary/25 border-t-primary animate-spin"
        aria-hidden="true"
      />
      <p class="m-0 text-sm text-primary">{{ message }}</p>
    </div>
  </Teleport>
</template>
