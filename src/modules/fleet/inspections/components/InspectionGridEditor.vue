<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { useOptionsStore } from '@/stores/optionsStore'
import {
  INSPECTION_VERDICTS,
  type InspectionItemResult,
  type InspectionVerdict
} from '../domain/inspection'

const props = defineProps<{ disabled?: boolean }>()
const items = defineModel<InspectionItemResult[]>({ required: true })

const { t } = useI18n()
const optionsStore = useOptionsStore()

const ACTIVE: Record<InspectionVerdict, string> = {
  conforming: 'border-success bg-success-bg text-success',
  observation: 'border-warning bg-warning/10 text-warning',
  non_conforming: 'border-destructive bg-destructive/10 text-destructive'
}

function set(itemNo: string, patch: Partial<Pick<InspectionItemResult, 'verdict' | 'comment'>>) {
  items.value = items.value.map((item) => (item.itemNo === itemNo ? { ...item, ...patch } : item))
}

function markRemainingConforming() {
  items.value = items.value.map((item) =>
    item.verdict ? item : { ...item, verdict: 'conforming' as const }
  )
}
</script>

<template>
  <div class="space-y-2">
    <p v-if="!items.length" class="text-sm text-muted-foreground">
      {{ t('fleet.inspections.grid.empty') }}
    </p>
    <template v-else>
      <div v-if="!props.disabled" class="flex justify-end">
        <button
          type="button"
          class="cursor-pointer text-xs text-primary hover:underline"
          @click="markRemainingConforming"
        >
          {{ t('fleet.inspections.grid.allConforming') }}
        </button>
      </div>
      <div class="overflow-x-auto border border-border rounded">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-muted/40 text-left text-xs text-muted-foreground">
              <th class="px-3 py-2 font-semibold">{{ t('fleet.inspections.grid.code') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('fleet.inspections.grid.item') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('fleet.inspections.grid.verdict') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('fleet.inspections.grid.comment') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.itemNo" class="border-t border-border align-top">
              <td class="px-3 py-2 whitespace-nowrap font-medium">{{ item.itemNo }}</td>
              <td class="px-3 py-2 min-w-56">
                {{ item.label }}
                <span class="block text-xs text-muted-foreground">
                  {{ optionsStore.getOptionLabel('inspectionPart', item.part) }}
                </span>
              </td>
              <td class="px-3 py-2">
                <div v-if="!props.disabled" class="flex flex-wrap gap-1">
                  <button
                    v-for="verdict in INSPECTION_VERDICTS"
                    :key="verdict"
                    type="button"
                    class="cursor-pointer px-2 py-1 text-xs rounded border transition"
                    :class="
                      item.verdict === verdict ? ACTIVE[verdict] : 'border-border hover:bg-accent'
                    "
                    @click="set(item.itemNo, { verdict })"
                  >
                    {{ optionsStore.getOptionLabel('inspectionVerdict', verdict) }}
                  </button>
                </div>
                <span
                  v-else-if="item.verdict"
                  class="inline-block px-2 py-1 text-xs rounded border"
                  :class="ACTIVE[item.verdict]"
                >
                  {{ optionsStore.getOptionLabel('inspectionVerdict', item.verdict) }}
                </span>
              </td>
              <td class="px-3 py-2 min-w-56">
                <FormInput
                  v-if="!props.disabled"
                  :model-value="item.comment"
                  :maxlength="200"
                  :invalid="!!item.verdict && item.verdict !== 'conforming' && !item.comment.trim()"
                  @update:model-value="set(item.itemNo, { comment: String($event) })"
                />
                <span v-else class="whitespace-pre-line">{{ item.comment }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
