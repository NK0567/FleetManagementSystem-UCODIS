<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bell } from '@lucide/vue'
import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import { formatDateTime } from '@/utils/format'

/**
 * The driver's latest notifications (TRS03-US08): an order entrusted to him, an order
 * cancelled with its reason (TRS01-US18). Seen ones are marked read.
 */
interface NotificationApi {
  no: string
  at: string
  kind: 'order_assigned' | 'order_cancelled' | 'order_withdrawn'
  orderNo: string
  detail: string
  readAt: string | null
}

const { t } = useI18n()
const items = ref<NotificationApi[]>([])
const unread = computed(() => items.value.filter((item) => !item.readAt).length)

async function load() {
  try {
    items.value = (
      await httpClient.get<SingleResponse<NotificationApi[]>>('/me/notifications')
    ).data.data
  } catch {
    items.value = []
  }
}
async function markRead() {
  try {
    await httpClient.post('/me/notifications/read', {})
    await load()
  } catch {
    /* they stay unread */
  }
}
onMounted(load)
</script>

<template>
  <section v-if="items.length" class="bg-card border border-border rounded p-3 space-y-2">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-sm font-semibold text-card-foreground flex items-center gap-2">
        <Bell class="w-4 h-4 text-primary" /> {{ t('selfService.notifications.title') }}
        <span
          v-if="unread"
          class="inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs"
        >
          {{ unread }}
        </span>
      </h2>
      <button
        v-if="unread"
        type="button"
        class="cursor-pointer text-xs text-primary hover:underline"
        @click="markRead"
      >
        {{ t('selfService.notifications.markRead') }}
      </button>
    </div>
    <ul class="space-y-1.5">
      <li
        v-for="item in items"
        :key="item.no"
        class="text-sm"
        :class="item.readAt ? 'text-muted-foreground' : 'text-card-foreground font-medium'"
      >
        {{ t(`selfService.notifications.${item.kind}`, { no: item.orderNo, reason: item.detail }) }}
        <span class="block text-xs font-normal text-muted-foreground">{{
          formatDateTime(item.at)
        }}</span>
      </li>
    </ul>
  </section>
</template>
