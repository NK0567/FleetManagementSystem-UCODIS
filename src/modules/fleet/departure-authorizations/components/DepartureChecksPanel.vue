<script lang="ts" setup>
import { CircleCheck, CircleX } from '@lucide/vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { DepartureCheck } from '../domain/departure'

defineProps<{ checks: DepartureCheck[] }>()

const optionsStore = useOptionsStore()
</script>

<template>
  <ul class="divide-y divide-border border border-border rounded text-sm">
    <li v-for="check in checks" :key="check.code" class="flex items-start gap-3 px-3 py-2">
      <CircleCheck v-if="check.ok" class="w-5 h-5 shrink-0 text-success" />
      <CircleX v-else class="w-5 h-5 shrink-0 text-destructive" />
      <div class="min-w-0">
        <p class="font-medium text-card-foreground">
          {{ optionsStore.getOptionLabel('departureCheck', check.code) }}
        </p>
        <p class="text-muted-foreground">{{ check.detail }}</p>
      </div>
    </li>
  </ul>
</template>
