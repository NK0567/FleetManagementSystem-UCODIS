<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { CalendarDays } from '@lucide/vue'
import { formatNumber } from '@/utils/format'
import { dayPluralChoice } from '../domain/myspace'
import type { MyBalance } from '../types/mySpace.types'

defineProps<{ balances: MyBalance[] }>()

const { t } = useI18n()

const days = (value: number) => formatNumber(value, Number.isInteger(value) ? 0 : 1)
</script>

<template>
  <section class="bg-card border border-border rounded">
    <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
      {{ t('selfService.profile.balances') }}
    </h2>
    <p v-if="!balances.length" class="p-4 text-sm text-muted-foreground">
      {{ t('selfService.profile.noBalance') }}
    </p>
    <div v-else class="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div
        v-for="balance in balances"
        :key="balance.leaveTypeNo"
        class="border border-border rounded p-3 flex items-center gap-3"
      >
        <span class="p-2 rounded bg-primary/10 text-primary shrink-0">
          <CalendarDays class="w-5 h-5" />
        </span>
        <div class="min-w-0">
          <p class="text-sm font-medium text-card-foreground truncate">
            {{ balance.leaveTypeName }}
          </p>
          <p class="text-xs text-muted-foreground">
            <span class="text-2xl font-semibold tabular-nums text-card-foreground">
              {{ days(balance.remainingDays) }}
            </span>
            {{ t('selfService.profile.daysUnit', dayPluralChoice(balance.remainingDays)) }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
