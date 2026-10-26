<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from '@lucide/vue'
import { useReferenceStore } from '@/stores/referenceStore'

const props = defineProps<{ disabled?: boolean }>()
const vehicleNos = defineModel<string[]>({ required: true })

const { t } = useI18n()
const referenceStore = useReferenceStore()

const vehicles = computed(() => referenceStore.getItems('planVehicles'))
const plateOf = (no: string) => vehicles.value.find((item) => item.code === no)?.description ?? no

const picked = ref<string | null>(null)
const model = ref<string | null>(null)

function add(nos: string[]) {
  vehicleNos.value = [...new Set([...vehicleNos.value, ...nos])]
}

function addPicked(no: string) {
  if (no) add([no])
  picked.value = null
}

function addModel(code: string) {
  add(vehicles.value.filter((item) => item.parentCode === code).map((item) => item.code))
  model.value = null
}

function remove(no: string) {
  vehicleNos.value = vehicleNos.value.filter((item) => item !== no)
}
</script>

<template>
  <div class="space-y-3">
    <p v-if="!vehicleNos.length" class="text-sm text-muted-foreground">
      {{ t('maintenance.maintenancePlans.vehicles.empty') }}
    </p>
    <ul v-else class="flex flex-wrap gap-2">
      <li
        v-for="no in vehicleNos"
        :key="no"
        class="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-sm"
      >
        {{ plateOf(no) }}
        <button
          v-if="!props.disabled"
          type="button"
          class="cursor-pointer text-muted-foreground hover:text-destructive"
          :aria-label="t('common.remove')"
          @click="remove(no)"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </li>
    </ul>
    <div v-if="!props.disabled" class="grid gap-3 sm:grid-cols-2">
      <BaseFormField :label="t('maintenance.maintenancePlans.vehicles.addOne')">
        <ReferenceLookup
          :model-value="picked"
          reference-key="planVehicles"
          :exclude-codes="vehicleNos"
          :modal-title="t('maintenance.maintenancePlans.vehicles.addOne')"
          @update:model-value="addPicked"
        />
      </BaseFormField>
      <BaseFormField :label="t('maintenance.maintenancePlans.vehicles.addModel')">
        <ReferenceLookup
          :model-value="model"
          reference-key="vehicleModels"
          :modal-title="t('maintenance.maintenancePlans.vehicles.addModel')"
          @update:model-value="addModel"
        />
        <p class="text-xs text-muted-foreground mt-1">
          {{ t('maintenance.maintenancePlans.vehicles.addModelHint') }}
        </p>
      </BaseFormField>
    </div>
  </div>
</template>
