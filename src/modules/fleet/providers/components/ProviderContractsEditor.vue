<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { Plus, Trash2 } from '@lucide/vue'
import { contractIssues } from '../domain/provider'
import type { ProviderContract } from '../types/provider.types'

const props = defineProps<{ disabled?: boolean }>()
const contracts = defineModel<ProviderContract[]>({ required: true })

const { t } = useI18n()

function addContract() {
  contracts.value = [
    ...contracts.value,
    { reference: '', subject: '', startDate: '', endDate: null, amount: null }
  ]
}

function removeContract(index: number) {
  contracts.value = contracts.value.filter((_contract, position) => position !== index)
}

function update(index: number, patch: Partial<ProviderContract>) {
  contracts.value = contracts.value.map((contract, position) =>
    position === index ? { ...contract, ...patch } : contract
  )
}

function readAmount(value: string | number): number | null {
  return value === '' ? null : Number(value)
}
</script>

<template>
  <div class="space-y-2">
    <p v-if="contracts.length === 0" class="text-sm text-muted-foreground">
      {{ t('fleet.providers.contracts.empty') }}
    </p>
    <div v-else class="overflow-x-auto border border-border rounded">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-muted/40 text-left text-xs text-muted-foreground">
            <th class="px-3 py-2 font-semibold">{{ t('fleet.providers.contracts.reference') }}</th>
            <th class="px-3 py-2 font-semibold">{{ t('fleet.providers.contracts.subject') }}</th>
            <th class="px-3 py-2 font-semibold">{{ t('fleet.providers.contracts.startDate') }}</th>
            <th class="px-3 py-2 font-semibold">{{ t('fleet.providers.contracts.endDate') }}</th>
            <th class="px-3 py-2 font-semibold">{{ t('fleet.providers.contracts.amount') }}</th>
            <th class="w-10"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(contract, index) in contracts"
            :key="contract.reference || `new-${index}`"
            class="border-t border-border align-top"
          >
            <td class="px-3 py-2 text-muted-foreground whitespace-nowrap">
              {{ contract.reference || t('fleet.providers.contracts.newReference') }}
            </td>
            <td class="px-3 py-2 min-w-56">
              <FormInput
                :model-value="contract.subject"
                :maxlength="120"
                :disabled="props.disabled"
                @update:model-value="update(index, { subject: String($event) })"
              />
              <p
                v-for="issue in contractIssues(contract)"
                :key="issue"
                class="text-xs text-destructive mt-1"
              >
                {{ t(`fleet.providers.contracts.issue.${issue}`) }}
              </p>
            </td>
            <td class="px-3 py-2 min-w-40">
              <DateFormInput
                :model-value="contract.startDate"
                :disabled="props.disabled"
                @update:model-value="update(index, { startDate: $event })"
              />
            </td>
            <td class="px-3 py-2 min-w-40">
              <DateFormInput
                :model-value="contract.endDate"
                :disabled="props.disabled"
                @update:model-value="update(index, { endDate: $event || null })"
              />
            </td>
            <td class="px-3 py-2 min-w-36">
              <FormInput
                :model-value="contract.amount"
                numeric-only
                inputmode="numeric"
                :disabled="props.disabled"
                @update:model-value="update(index, { amount: readAmount($event) })"
              />
            </td>
            <td class="px-2 py-2 text-right">
              <button
                v-if="!props.disabled"
                type="button"
                class="p-1.5 text-destructive rounded hover:bg-destructive/10"
                :title="t('fleet.providers.contracts.remove')"
                :aria-label="t('fleet.providers.contracts.remove')"
                @click="removeContract(index)"
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
      @click="addContract"
    >
      <Plus class="w-4 h-4" /> {{ t('fleet.providers.contracts.add') }}
    </button>
  </div>
</template>
