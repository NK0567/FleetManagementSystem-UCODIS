<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from '@lucide/vue'
import { useReferenceStore } from '@/stores/referenceStore'
import { modelLabel } from '../domain/maintenancePlan'

const props = defineProps<{ disabled?: boolean }>()
/** The models the plan applies to: their vehicles inherit it, today's and tomorrow's. */
const modelCodes = defineModel<string[]>({ required: true })

const { t } = useI18n()
const referenceStore = useReferenceStore()

const vehicles = computed(() => referenceStore.getItems('planVehicles'))
const platesOf = (code: string) =>
  vehicles.value
    .filter((item) => item.parentCode === code)
    .map((item) => item.description)
    .sort()
const inherited = computed(() => modelCodes.value.flatMap(platesOf))

const picked = ref<string | null>(null)

function add(code: string) {
  if (code) modelCodes.value = [...new Set([...modelCodes.value, code])]
  picked.value = null
}

function remove(code: string) {
  modelCodes.value = modelCodes.value.filter((item) => item !== code)
}
</script>

<template>
  <div class="space-y-3">
    <p v-if="!modelCodes.length" class="text-sm text-muted-foreground">
      {{ t('maintenance.maintenancePlans.models.empty') }}
    </p>
    <ul v-else class="space-y-2">
      <li
        v-for="code in modelCodes"
        :key="code"
        class="flex items-start justify-between gap-3 rounded border border-border px-3 py-2 text-sm"
      >
        <div class="min-w-0">
          <p class="font-medium">{{ modelLabel(code) }}</p>
          <p class="text-xs text-muted-foreground">
            {{
              platesOf(code).length
                ? t('maintenance.maintenancePlans.models.vehicles', {
                    plates: platesOf(code).join(', ')
                  })
                : t('maintenance.maintenancePlans.models.noVehicle')
            }}
          </p>
        </div>
        <button
          v-if="!props.disabled"
          type="button"
          class="cursor-pointer text-muted-foreground hover:text-destructive"
          :aria-label="t('common.remove')"
          @click="remove(code)"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </li>
    </ul>
    <p v-if="modelCodes.length" class="text-xs text-muted-foreground">
      {{ t('maintenance.maintenancePlans.vehicles.count', inherited.length) }} ·
      {{ t('maintenance.maintenancePlans.models.inheritHint') }}
    </p>
    <BaseFormField v-if="!props.disabled" :label="t('maintenance.maintenancePlans.models.add')">
      <ReferenceLookup
        :model-value="picked"
        reference-key="vehicleModels"
        :exclude-codes="modelCodes"
        :modal-title="t('maintenance.maintenancePlans.models.add')"
        @update:model-value="add"
      />
    </BaseFormField>
  </div>
</template>
