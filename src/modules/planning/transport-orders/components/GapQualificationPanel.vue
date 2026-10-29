<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import httpClient from '@/core/api/httpClient'
import { formatNumber } from '@/utils/format'
import type { TransportOrderLineApi } from '../types/transportOrder.types'

/**
 * The gaps the declaration revealed, qualified by the delivery manager (TRS03-US17): a gain or a
 * loss, a comment, and whether the driver is accountable; nothing follows until it is done.
 */
const props = defineProps<{
  orderNo: string
  lines: TransportOrderLineApi[]
  canQualify: boolean
}>()
const emit = defineEmits<{ changed: [] }>()
const { t } = useI18n()

const editing = ref<number | null>(null)
const kind = ref<'gain' | 'loss'>('loss')
const comment = ref('')
const imputable = ref<boolean | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)

function start(line: TransportOrderLineApi) {
  editing.value = line.lineNo
  kind.value = (line.quantityGap ?? 0) > 0 ? 'gain' : 'loss'
  comment.value = ''
  imputable.value = null
}
async function save(line: TransportOrderLineApi) {
  busy.value = true
  error.value = null
  try {
    await httpClient.post(
      `/planning/transport-orders/${encodeURIComponent(props.orderNo)}/lines/${line.lineNo}/qualify`,
      { kind: kind.value, comment: comment.value, imputableToDriver: imputable.value }
    )
    editing.value = null
    emit('changed')
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.transportOrders.saveError'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="xl:col-span-2 min-w-0 space-y-2 text-sm">
    <FormAlerts :error="error" @clear:error="error = null" />
    <div
      v-for="line in lines"
      :key="line.lineNo"
      class="rounded border border-border px-3 py-2 space-y-1"
    >
      <p class="font-medium">
        {{ line.recipientName }} · {{ line.productName }} ·
        <span :class="(line.quantityGap ?? 0) < 0 ? 'text-destructive' : 'text-success'">
          {{ (line.quantityGap ?? 0) > 0 ? '+' : '' }}{{ formatNumber(line.quantityGap, 1) }}
          {{ line.unit }}
        </span>
      </p>
      <p v-if="line.gapQualification" class="text-xs text-muted-foreground">
        {{ t(`planning.transportOrders.gaps.kind.${line.gapQualification}`) }} ·
        {{
          line.gapImputableToDriver
            ? t('planning.transportOrders.gaps.imputable')
            : t('planning.transportOrders.gaps.notImputable')
        }}
        <template v-if="line.gapComment"> · {{ line.gapComment }}</template>
      </p>
      <template v-else-if="canQualify">
        <div v-if="editing === line.lineNo" class="space-y-2">
          <div class="flex flex-wrap gap-3">
            <label class="inline-flex items-center gap-1.5">
              <input v-model="kind" type="radio" value="loss" class="accent-primary" />
              {{ t('planning.transportOrders.gaps.kind.loss') }}
            </label>
            <label class="inline-flex items-center gap-1.5">
              <input v-model="kind" type="radio" value="gain" class="accent-primary" />
              {{ t('planning.transportOrders.gaps.kind.gain') }}
            </label>
          </div>
          <div class="flex flex-wrap gap-3">
            <label class="inline-flex items-center gap-1.5">
              <input v-model="imputable" type="radio" :value="true" class="accent-primary" />
              {{ t('planning.transportOrders.gaps.imputable') }}
            </label>
            <label class="inline-flex items-center gap-1.5">
              <input v-model="imputable" type="radio" :value="false" class="accent-primary" />
              {{ t('planning.transportOrders.gaps.notImputable') }}
            </label>
          </div>
          <FormInput
            v-model="comment"
            :maxlength="300"
            :placeholder="t('planning.transportOrders.gaps.comment')"
          />
          <div class="flex gap-2">
            <button
              type="button"
              class="cursor-pointer px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm disabled:opacity-60"
              :disabled="busy || !comment.trim() || imputable === null"
              @click="save(line)"
            >
              {{ t('common.save') }}
            </button>
            <button
              type="button"
              class="cursor-pointer px-3 py-1.5 rounded border border-border text-sm hover:bg-accent"
              @click="editing = null"
            >
              {{ t('common.cancel') }}
            </button>
          </div>
        </div>
        <button
          v-else
          type="button"
          class="cursor-pointer px-3 py-1.5 rounded border border-border text-sm hover:bg-accent"
          @click="start(line)"
        >
          {{ t('planning.transportOrders.gaps.qualify') }}
        </button>
      </template>
      <p v-else class="text-xs text-warning">{{ t('planning.transportOrders.gaps.toQualify') }}</p>
    </div>
  </div>
</template>
