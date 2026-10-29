<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Bell } from '@lucide/vue'
import { usePermissions } from '@/composables/usePermissions'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime } from '@/utils/format'
import { alertService } from '../services/alertService'
import type { InboxApi } from '../types/alert.types'
import AlertSeverityPill from './AlertSeverityPill.vue'

/** The bell of the top bar: the open alerts of the user and the requests waiting for him. */
const REFRESH_MS = 60_000

const { t } = useI18n()
const route = useRoute()
const optionsStore = useOptionsStore()
const { canRead: canReadAlerts } = usePermissions('ALERT')

const inbox = ref<InboxApi | null>(null)
const isOpen = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

async function load() {
  inbox.value = await alertService.inbox().catch(() => inbox.value)
}

const total = computed(() => (inbox.value?.alertCount ?? 0) + (inbox.value?.requestCount ?? 0))
const badge = computed(() => (total.value > 99 ? '99+' : String(total.value)))

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) void load()
}

watch(
  () => route.fullPath,
  () => {
    isOpen.value = false
    void load()
  }
)

onMounted(() => {
  void load()
  timer = setInterval(() => void load(), REFRESH_MS)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="p-2 hover:bg-white/10 rounded relative"
      :title="t('fleet.alerts.bell.title')"
      :aria-label="t('fleet.alerts.bell.title')"
      data-testid="alert-bell"
      @click="toggle"
    >
      <Bell class="w-4 h-4" />
      <span
        v-if="total > 0"
        class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-semibold leading-4 text-center"
      >
        {{ badge }}
      </span>
    </button>
    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-96 max-w-[calc(100vw-1rem)] bg-white text-gray-900 rounded-lg shadow-lg z-50 overflow-hidden"
    >
      <div class="max-h-[70vh] overflow-y-auto divide-y divide-gray-200 text-sm">
        <section class="p-3 space-y-2">
          <h2 class="text-xs font-semibold uppercase text-gray-500">
            {{ t('fleet.alerts.bell.alerts', inbox?.alertCount ?? 0) }}
          </h2>
          <p v-if="!inbox?.alerts.length" class="text-gray-500">
            {{ t('fleet.alerts.bell.noAlert') }}
          </p>
          <RouterLink
            v-for="alert in inbox?.alerts ?? []"
            :key="alert.no"
            to="/fleet/alerts"
            class="block rounded px-2 py-1.5 hover:bg-gray-100"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium truncate">{{ alert.subject }}</span>
              <AlertSeverityPill :severity="alert.severity" />
            </div>
            <p class="text-xs text-gray-600 truncate">
              {{ optionsStore.getOptionLabel('alertCategory', alert.category) }} ·
              {{ alert.detail }}
            </p>
            <p class="text-[11px] text-gray-500">
              {{ optionsStore.getOptionLabel('alertStatus', alert.status) }} ·
              {{ formatDateTime(alert.since) }}
            </p>
          </RouterLink>
        </section>
        <section class="p-3 space-y-2">
          <h2 class="text-xs font-semibold uppercase text-gray-500">
            {{ t('fleet.alerts.bell.requests', inbox?.requestCount ?? 0) }}
          </h2>
          <p v-if="!inbox?.requests.length" class="text-gray-500">
            {{ t('fleet.alerts.bell.noRequest') }}
          </p>
          <RouterLink
            v-for="request in inbox?.requests ?? []"
            :key="`${request.kind}-${request.no}`"
            :to="{ path: request.path, query: { no: request.no, cardMode: 'view' } }"
            class="block rounded px-2 py-1.5 hover:bg-gray-100"
          >
            <span class="font-medium">{{ t(`fleet.alerts.bell.kind.${request.kind}`) }}</span>
            · {{ request.subject }}
            <p class="text-[11px] text-gray-500">
              {{ request.no }} · {{ formatDateTime(request.since) }}
            </p>
          </RouterLink>
        </section>
      </div>
      <RouterLink
        v-if="canReadAlerts"
        to="/fleet/alerts"
        class="block px-3 py-2 text-sm text-center text-primary bg-gray-50 hover:bg-gray-100"
      >
        {{ t('fleet.alerts.bell.seeAll') }}
      </RouterLink>
    </div>
    <div v-if="isOpen" class="fixed inset-0 z-40" @click="isOpen = false" />
  </div>
</template>
