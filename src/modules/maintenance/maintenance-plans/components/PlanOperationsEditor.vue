<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { Plus, Trash2 } from '@lucide/vue'
import { operationIssues, type MaintenanceOperation } from '../domain/maintenancePlan'

const props = defineProps<{ disabled?: boolean }>()
const operations = defineModel<MaintenanceOperation[]>({ required: true })

const { t } = useI18n()

function addOperation() {
  operations.value = [
    ...operations.value,
    {
      no: '',
      label: '',
      subsystemNo: '',
      nature: 'check',
      intervalKm: null,
      intervalHours: null,
      intervalDays: null
    }
  ]
}

function removeOperation(index: number) {
  operations.value = operations.value.filter((_operation, position) => position !== index)
}

function update(index: number, patch: Partial<MaintenanceOperation>) {
  operations.value = operations.value.map((operation, position) =>
    position === index ? { ...operation, ...patch } : operation
  )
}

function readInterval(value: string | number): number | null {
  return value === '' ? null : Number(value)
}
</script>

<template>
  <div class="space-y-2">
    <p v-if="operations.length === 0" class="text-sm text-muted-foreground">
      {{ t('maintenance.maintenancePlans.operations.empty') }}
    </p>
    <div v-else class="overflow-x-auto border border-border rounded">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-muted/40 text-left text-xs text-muted-foreground">
            <th class="px-3 py-2 font-semibold">
              {{ t('maintenance.maintenancePlans.operations.no') }}
            </th>
            <th class="px-3 py-2 font-semibold">
              {{ t('maintenance.maintenancePlans.operations.label') }}
            </th>
            <th class="px-3 py-2 font-semibold">
              {{ t('maintenance.maintenancePlans.operations.subsystem') }}
            </th>
            <th class="px-3 py-2 font-semibold">
              {{ t('maintenance.maintenancePlans.operations.nature') }}
            </th>
            <th class="px-3 py-2 font-semibold">
              {{ t('maintenance.maintenancePlans.operations.intervalKm') }}
            </th>
            <th class="px-3 py-2 font-semibold">
              {{ t('maintenance.maintenancePlans.operations.intervalHours') }}
            </th>
            <th class="px-3 py-2 font-semibold">
              {{ t('maintenance.maintenancePlans.operations.intervalDays') }}
            </th>
            <th class="w-10"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(operation, index) in operations"
            :key="operation.no || `new-${index}`"
            class="border-t border-border align-top"
          >
            <td class="px-3 py-2 text-muted-foreground whitespace-nowrap">
              {{ operation.no || t('maintenance.maintenancePlans.operations.newNo') }}
            </td>
            <td class="px-3 py-2 min-w-64">
              <FormInput
                :model-value="operation.label"
                :maxlength="160"
                :disabled="props.disabled"
                @update:model-value="update(index, { label: String($event) })"
              />
              <p
                v-for="issue in operationIssues(operation)"
                :key="issue"
                class="text-xs text-destructive mt-1"
              >
                {{ t(`maintenance.maintenancePlans.operations.issue.${issue}`) }}
              </p>
            </td>
            <td class="px-3 py-2 min-w-56">
              <ReferenceLookup
                :model-value="operation.subsystemNo"
                reference-key="failureSubsystems"
                :modal-title="t('maintenance.maintenancePlans.operations.subsystem')"
                :disabled="props.disabled"
                @update:model-value="update(index, { subsystemNo: $event })"
              />
            </td>
            <td class="px-3 py-2 min-w-36">
              <OptionsSelect
                :model-value="operation.nature"
                options-key="operationNature"
                :disabled="props.disabled"
                @update:model-value="
                  update(index, { nature: String($event) as MaintenanceOperation['nature'] })
                "
              />
            </td>
            <td class="px-3 py-2 min-w-32">
              <FormInput
                :model-value="operation.intervalKm"
                numeric-only
                inputmode="numeric"
                :disabled="props.disabled"
                @update:model-value="update(index, { intervalKm: readInterval($event) })"
              />
            </td>
            <td class="px-3 py-2 min-w-28">
              <FormInput
                :model-value="operation.intervalHours"
                numeric-only
                inputmode="numeric"
                :disabled="props.disabled"
                @update:model-value="update(index, { intervalHours: readInterval($event) })"
              />
            </td>
            <td class="px-3 py-2 min-w-28">
              <FormInput
                :model-value="operation.intervalDays"
                numeric-only
                inputmode="numeric"
                :disabled="props.disabled"
                @update:model-value="update(index, { intervalDays: readInterval($event) })"
              />
            </td>
            <td class="px-2 py-2 text-right">
              <button
                v-if="!props.disabled"
                type="button"
                class="p-1.5 text-destructive rounded hover:bg-destructive/10"
                :title="t('maintenance.maintenancePlans.operations.remove')"
                :aria-label="t('maintenance.maintenancePlans.operations.remove')"
                @click="removeOperation(index)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <button
      v-if="!props.disabled"
      type="button"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition"
      @click="addOperation"
    >
      <Plus class="w-4 h-4" /> {{ t('maintenance.maintenancePlans.operations.add') }}
    </button>
  </div>
</template>
