<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2 } from '@lucide/vue'
import { formatNumber } from '@/utils/format'
import { COMPARTMENT_CONTENTS, defaultRules, type CompartmentContent } from '../domain/compartments'
import type { VehicleCompartment } from '../types/vehicle.types'

const props = defineProps<{ disabled?: boolean }>()
const compartments = defineModel<VehicleCompartment[]>({ required: true })

const { t } = useI18n()

const total = computed(() => compartments.value.reduce((sum, item) => sum + (item.volumeL || 0), 0))

/** Compartments are numbered in their order, so the numbers follow any removal. */
const renumber = (items: VehicleCompartment[]): VehicleCompartment[] =>
  items.map((item, index) => ({ ...item, no: index + 1 }))

function patch(index: number, change: Partial<VehicleCompartment>) {
  compartments.value = renumber(
    compartments.value.map((item, position) => (position === index ? { ...item, ...change } : item))
  )
}

function add() {
  // A new compartment takes the rules of the last one: tankers are usually alike.
  const last = compartments.value.at(-1)
  compartments.value = renumber([
    ...compartments.value,
    last ? { ...last, volumeL: 0, families: [...last.families] } : defaultRules(1, 0)
  ])
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(compartment, index) in compartments"
      :key="compartment.no"
      class="border border-border rounded p-2 space-y-2"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="w-28 text-sm font-medium text-card-foreground shrink-0">
          {{ t('fleet.vehicles.compartment', { no: compartment.no }) }}
        </span>
        <div class="w-32">
          <FormInput
            :model-value="compartment.volumeL"
            type="number"
            :min="0"
            :disabled="props.disabled"
            :aria-label="t('fleet.vehicles.compartmentVolume')"
            @update:model-value="patch(index, { volumeL: Number($event) || 0 })"
          />
        </div>
        <span class="text-sm text-muted-foreground">L</span>
        <select
          class="h-8 px-2 text-sm border border-border rounded bg-background disabled:opacity-60"
          :value="compartment.content"
          :disabled="props.disabled"
          :aria-label="t('fleet.vehicles.compartmentContent')"
          @change="
            patch(index, {
              content: ($event.target as HTMLSelectElement).value as CompartmentContent
            })
          "
        >
          <option v-for="content in COMPARTMENT_CONTENTS" :key="content" :value="content">
            {{ t(`fleet.vehicles.content.${content}`) }}
          </option>
        </select>
        <label class="inline-flex items-center gap-1.5 text-sm text-card-foreground">
          <input
            type="checkbox"
            class="h-4 w-4 accent-primary"
            :checked="compartment.fullFill"
            :disabled="props.disabled"
            @change="patch(index, { fullFill: ($event.target as HTMLInputElement).checked })"
          />
          {{ t('fleet.vehicles.fullFill') }}
        </label>
        <button
          v-if="!props.disabled"
          type="button"
          class="ml-auto p-1.5 text-destructive rounded hover:bg-destructive/10"
          :aria-label="t('fleet.vehicles.removeCompartment')"
          :title="t('fleet.vehicles.removeCompartment')"
          @click="
            compartments = renumber(compartments.filter((_item, position) => position !== index))
          "
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
      <div class="flex items-start gap-2">
        <span class="w-28 text-xs text-muted-foreground shrink-0 pt-1">
          {{ t('fleet.vehicles.compartmentFamilies') }}
        </span>
        <ProductFamilyPicker
          :model-value="compartment.families"
          :disabled="props.disabled"
          @update:model-value="patch(index, { families: $event })"
        />
      </div>
    </div>
    <div class="flex items-center justify-between gap-2">
      <button
        v-if="!props.disabled"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition"
        @click="add"
      >
        <Plus class="w-4 h-4" /> {{ t('fleet.vehicles.addCompartment') }}
      </button>
      <span class="text-sm text-muted-foreground ml-auto">
        {{ t('fleet.vehicles.totalCapacity', { volume: formatNumber(total, 0) }) }}
      </span>
    </div>
  </div>
</template>
