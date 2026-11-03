<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { Plus, Trash2 } from '@lucide/vue'
import type { CarrierVehicle } from '../types/provider.types'

defineProps<{ disabled?: boolean }>()
const vehicles = defineModel<CarrierVehicle[]>({ default: () => [] })

const { t } = useI18n()

function add() {
  vehicles.value = [...vehicles.value, { plate: '', description: '' }]
}
function remove(index: number) {
  vehicles.value = vehicles.value.filter((_, position) => position !== index)
}
function patch(index: number, field: keyof CarrierVehicle, value: string | number | null) {
  vehicles.value = vehicles.value.map((vehicle, position) =>
    position === index ? { ...vehicle, [field]: value } : vehicle
  )
}
const numberOf = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? null : Number(value)
</script>

<template>
  <div class="space-y-2">
    <p v-if="!vehicles.length" class="text-sm text-muted-foreground">
      {{ t('fleet.providers.carrierVehicles.empty') }}
    </p>
    <div
      v-for="(vehicle, index) in vehicles"
      :key="index"
      class="grid grid-cols-[10rem_1fr_auto] gap-2 items-center border-b border-border pb-2"
    >
      <FormInput
        :model-value="vehicle.plate"
        :maxlength="20"
        :disabled="disabled"
        :placeholder="t('fleet.providers.carrierVehicles.plate')"
        @update:model-value="patch(index, 'plate', String($event ?? ''))"
      />
      <FormInput
        :model-value="vehicle.description"
        :maxlength="80"
        :disabled="disabled"
        :placeholder="t('fleet.providers.carrierVehicles.description')"
        @update:model-value="patch(index, 'description', String($event ?? ''))"
      />
      <button
        v-if="!disabled"
        type="button"
        class="cursor-pointer p-1.5 rounded text-destructive hover:bg-destructive/10"
        :aria-label="t('fleet.providers.carrierVehicles.remove')"
        @click="remove(index)"
      >
        <Trash2 class="w-4 h-4" />
      </button>
      <div class="col-span-3 grid grid-cols-3 gap-2">
        <label class="text-xs text-muted-foreground space-y-1">
          {{ t('fleet.providers.carrierVehicles.maxLoadKg') }}
          <FormInput
            type="number"
            :min="0"
            :model-value="vehicle.maxLoadKg ?? null"
            :disabled="disabled"
            @update:model-value="patch(index, 'maxLoadKg', numberOf($event))"
          />
        </label>
        <label class="text-xs text-muted-foreground space-y-1">
          {{ t('fleet.providers.carrierVehicles.maxVolumeM3') }}
          <FormInput
            type="number"
            :min="0"
            :model-value="vehicle.maxVolumeM3 ?? null"
            :disabled="disabled"
            @update:model-value="patch(index, 'maxVolumeM3', numberOf($event))"
          />
        </label>
        <label class="text-xs text-muted-foreground space-y-1">
          {{ t('fleet.providers.carrierVehicles.capacityL') }}
          <FormInput
            type="number"
            :min="0"
            :model-value="vehicle.capacityL ?? null"
            :disabled="disabled"
            @update:model-value="patch(index, 'capacityL', numberOf($event))"
          />
        </label>
      </div>
    </div>
    <button
      v-if="!disabled"
      type="button"
      class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition"
      @click="add"
    >
      <Plus class="w-4 h-4 text-primary" />
      {{ t('fleet.providers.carrierVehicles.add') }}
    </button>
  </div>
</template>
