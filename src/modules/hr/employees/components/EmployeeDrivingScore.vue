<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePermissions } from '@/composables/usePermissions'
import { driverService, type DriverScoreApi } from '@/modules/fleet/drivers'

const props = defineProps<{ employeeNo: string }>()
const { t } = useI18n()
const { canRead } = usePermissions('DRIVER')

const score = ref<DriverScoreApi | null>(null)
const failed = ref(false)

watch(
  () => [props.employeeNo, canRead.value] as const,
  async ([no, allowed]) => {
    score.value = null
    failed.value = false
    if (!allowed || !no) return
    try {
      score.value = await driverService.score(no)
    } catch {
      failed.value = true
    }
  },
  { immediate: true }
)

const tone = computed(() =>
  score.value?.belowThreshold ? 'text-destructive' : 'text-card-foreground'
)
</script>

<template>
  <section v-if="score" class="mx-6 mb-6 rounded border border-border p-4 bg-white">
    <h3 class="text-sm font-semibold text-card-foreground">
      {{ t('hr.employees.score.title') }}
    </h3>
    <div class="mt-3 flex flex-wrap items-end gap-8">
      <div>
        <div class="text-3xl font-semibold" :class="tone">{{ score.score }}</div>
        <div class="text-xs text-muted-foreground">{{ t('hr.employees.score.outOf') }}</div>
      </div>
      <dl class="grid grid-cols-3 gap-x-8 gap-y-1 text-sm">
        <div>
          <dt class="text-xs text-muted-foreground">{{ t('hr.employees.score.previous') }}</dt>
          <dd>{{ score.previousScore }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">{{ t('hr.employees.score.rank') }}</dt>
          <dd>{{ score.rank }} / {{ score.driverCount }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">{{ t('hr.employees.score.threshold') }}</dt>
          <dd>{{ score.threshold }}</dd>
        </div>
      </dl>
    </div>
    <ul class="mt-3 flex flex-wrap gap-2 text-xs">
      <li
        v-for="family in score.families"
        :key="family.family"
        class="rounded-full bg-accent px-2.5 py-1 text-muted-foreground"
      >
        {{ family.label }} : {{ family.mark }}
      </li>
    </ul>
    <p class="mt-3 text-xs text-muted-foreground">{{ t('hr.employees.score.bonusRule') }}</p>
  </section>
  <p v-else-if="failed" class="mx-6 mb-4 text-xs text-muted-foreground">
    {{ t('hr.employees.score.unavailable') }}
  </p>
</template>
