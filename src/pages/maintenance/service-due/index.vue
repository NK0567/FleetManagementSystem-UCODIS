<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const view = computed(() => (route.query.vue === 'calendar' ? 'calendar' : 'list'))
const tabs = computed(() => [
  { key: 'list', label: t('maintenance.serviceDue.tab.list') },
  { key: 'calendar', label: t('maintenance.serviceDue.tab.calendar') }
])

function pick(key: string) {
  router.replace({ query: { ...route.query, vue: key === 'calendar' ? 'calendar' : undefined } })
}
</script>

<template>
  <DashboardLayout>
    <div class="h-full flex flex-col">
      <div class="flex gap-1 px-4 pt-2 border-b border-border bg-white">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="px-3 py-2 text-sm border-b-2 -mb-px"
          :class="
            view === tab.key
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-card-foreground'
          "
          @click="pick(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="flex-1 min-h-0">
        <ServiceDueCalendar v-if="view === 'calendar'" />
        <ServiceDueList v-else />
      </div>
    </div>
  </DashboardLayout>
</template>
