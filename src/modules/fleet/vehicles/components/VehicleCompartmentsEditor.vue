<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2 } from '@lucide/vue'
import { formatNumber } from '@/utils/format'
import type { VehicleCompartment } from '../types/vehicle.types'

const props = defineProps<{ disabled?: boolean }>()
const compartments = defineModel<VehicleCompartment[]>({ required: true })

const { t } = useI18n()

const total = computed(() => compartments.value.reduce((sum, item) => sum + (item.volumeL || 0), 0))

/** Compartments are numbered in their order, so the numbers follow any removal. */
function renumber(items: Omit<VehicleCompartment, 'no'>[]): VehicleCompartment[] {
  return items.map((item, index) => ({ no: index + 1, volumeL: item.volumeL }))
}

function setVolume(index: number, value: string | number) {
  compartments.value = renumber(
    compartments.value.map((item, position) =>
      position === index ? { ...item, volumeL: Number(value) || 0 } : item
    )
  )
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(compartment, index) in compartments"
      :key="compartment.no"
      class="flex items-center gap-2"
    >
      <span class="w-28 text-sm text-muted-foreground shrink-0">
        {{ t('fleet.vehicles.compartment', { no: compartment.no }) }}
      </span>
      <div class="w-36">
        <FormInput
          :model-value="compartment.volumeL"
          type="number"
          :min="0"
          :disabled="props.disabled"
          @update:model-value="setVolume(index, $event)"
        />
      </div>
      <span class="text-sm text-muted-foreground">L</span>
      <button
        v-if="!props.disabled"
        type="button"
        class="p-1.5 text-destructive rounded hover:bg-destructive/10"
        :aria-label="t('fleet.vehicles.removeCompartment')"
        :title="t('fleet.vehicles.removeCompartment')"
        @click="
          compartments = renumber(compartments.filter((_item, position) => position !== index))
        "
      >
        <Trash2 class="w-4 h-4" />
      </button>
    </div>
    <div class="flex items-center justify-between gap-2">
      <button
        v-if="!props.disabled"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition"
        @click="compartments = renumber([...compartments, { volumeL: 0 }])"
      >
        <Plus class="w-4 h-4" /> {{ t('fleet.vehicles.addCompartment') }}
      </button>
      <span class="text-sm text-muted-foreground ml-auto">
        {{ t('fleet.vehicles.totalCapacity', { volume: formatNumber(total, 0) }) }}
      </span>
    </div>
  </div>
</template>
