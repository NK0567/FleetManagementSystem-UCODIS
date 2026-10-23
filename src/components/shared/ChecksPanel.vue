<script lang="ts" setup>
import { CircleCheck, CircleX } from '@lucide/vue'
import { useOptionsStore } from '@/stores/optionsStore'

export interface CheckLine {
  code: string
  ok: boolean
  /** What was found, as the server words it. */
  detail: string
}

defineProps<{
  checks: CheckLine[]
  /** Option set naming each check code. */
  optionsKey: string
}>()

const optionsStore = useOptionsStore()
</script>

<template>
  <ul class="divide-y divide-border border border-border rounded text-sm">
    <li v-for="check in checks" :key="check.code" class="flex items-start gap-3 px-3 py-2">
      <CircleCheck v-if="check.ok" class="w-5 h-5 shrink-0 text-success" />
      <CircleX v-else class="w-5 h-5 shrink-0 text-destructive" />
      <div class="min-w-0">
        <p class="font-medium text-card-foreground">
          {{ optionsStore.getOptionLabel(optionsKey, check.code) }}
        </p>
        <p class="text-muted-foreground">{{ check.detail }}</p>
      </div>
    </li>
  </ul>
</template>
