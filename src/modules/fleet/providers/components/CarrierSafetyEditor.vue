<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { Plus, Trash2 } from '@lucide/vue'
import type { CarrierSafetyEvent } from '../types/provider.types'

defineProps<{ disabled?: boolean }>()
const events = defineModel<CarrierSafetyEvent[]>({ default: () => [] })

const { t } = useI18n()

function add() {
  events.value = [...events.value, { date: '', kind: 'accident', plate: '' }]
}
function remove(index: number) {
  events.value = events.value.filter((_, position) => position !== index)
}
function patch(index: number, field: keyof CarrierSafetyEvent, value: string) {
  events.value = events.value.map((event, position) =>
    position === index ? { ...event, [field]: value } : event
  )
}
</script>

<template>
  <div class="space-y-2">
    <p v-if="!events.length" class="text-sm text-muted-foreground">
      {{ t('fleet.providers.safetyEvents.empty') }}
    </p>
    <div
      v-for="(event, index) in events"
      :key="index"
      class="grid grid-cols-[10rem_10rem_1fr_auto] gap-2 items-center border-b border-border pb-2"
    >
      <input
        type="date"
        class="h-9 rounded border border-border bg-white px-2 text-sm"
        :value="event.date"
        :disabled="disabled"
        :aria-label="t('fleet.providers.safetyEvents.date')"
        @input="patch(index, 'date', ($event.target as HTMLInputElement).value)"
      />
      <select
        class="h-9 rounded border border-border bg-white px-2 text-sm"
        :value="event.kind"
        :disabled="disabled"
        :aria-label="t('fleet.providers.safetyEvents.kind')"
        @change="patch(index, 'kind', ($event.target as HTMLSelectElement).value)"
      >
        <option value="accident">{{ t('fleet.providers.safetyEvents.accident') }}</option>
        <option value="infraction">{{ t('fleet.providers.safetyEvents.infraction') }}</option>
      </select>
      <FormInput
        :model-value="event.plate"
        :maxlength="20"
        :disabled="disabled"
        :placeholder="t('fleet.providers.safetyEvents.plate')"
        @update:model-value="patch(index, 'plate', String($event ?? ''))"
      />
      <button
        v-if="!disabled"
        type="button"
        class="cursor-pointer p-1.5 rounded text-destructive hover:bg-destructive/10"
        :aria-label="t('fleet.providers.safetyEvents.remove')"
        @click="remove(index)"
      >
        <Trash2 class="w-4 h-4" />
      </button>
    </div>
    <button
      v-if="!disabled"
      type="button"
      class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition"
      @click="add"
    >
      <Plus class="w-4 h-4 text-primary" />
      {{ t('fleet.providers.safetyEvents.add') }}
    </button>
  </div>
</template>
