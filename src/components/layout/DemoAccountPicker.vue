<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { authApi } from '@/core/api/authApi'
import { useOptionsStore } from '@/stores/optionsStore'
import type { DemoAccount } from '@/types/auth.types'

defineProps<{
  selectedCode: string
}>()

const emit = defineEmits<{
  select: [account: DemoAccount]
}>()

const { t } = useI18n()
const optionsStore = useOptionsStore()
const accounts = ref<DemoAccount[]>([])

onMounted(async () => {
  void optionsStore.fetchOptions()
  try {
    accounts.value = (await authApi.getDemoAccounts()).data.data
  } catch {
    accounts.value = []
  }
})
</script>

<template>
  <section v-if="accounts.length" class="space-y-2">
    <h2 class="text-sm font-medium text-card-foreground">{{ t('auth.demo.title') }}</h2>
    <p class="text-xs text-muted-foreground">{{ t('auth.demo.hint') }}</p>
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="account in accounts"
        :key="account.code"
        type="button"
        class="text-left rounded border px-3 py-2 transition hover:border-primary"
        :class="selectedCode === account.code ? 'border-primary bg-primary/5' : 'border-border'"
        @click="emit('select', account)"
      >
        <span class="block text-sm font-medium text-card-foreground">
          {{ optionsStore.getOptionLabel('userProfile', account.profile) }}
        </span>
        <span class="block text-xs text-muted-foreground"
          >{{ account.name }} · {{ account.code }}</span
        >
      </button>
    </div>
  </section>
</template>
