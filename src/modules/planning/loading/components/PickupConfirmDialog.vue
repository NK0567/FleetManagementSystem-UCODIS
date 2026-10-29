<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatNumber } from '@/utils/format'
import type { PickupEntryInput, PickupNoteApi } from '../types/pickup.types'

/**
 * Confirming the pickup (TRS03-US04): the reference of the document handed over by the site
 * (the BSL for fuel) and, compartment by compartment, the loaded quantity and, for fuel, the
 * temperature, the density and the volume at 15 °C.
 */
const props = defineProps<{
  note: PickupNoteApi | null
  loading?: boolean
  error?: string | null
}>()
const emit = defineEmits<{
  confirm: [documentRef: string, entries: PickupEntryInput[]]
  cancel: []
}>()
const { t } = useI18n()

type Row = PickupEntryInput & {
  key: string
  label: string
  unit: string
  isFuel: boolean
  expected: number
}
const documentRef = ref('')
const rows = ref<Row[]>([])

watch(
  () => props.note,
  (note) => {
    documentRef.value = note?.documentRef ?? ''
    rows.value = (note?.compartments ?? []).flatMap((compartment) =>
      compartment.entries.map((entry) => ({
        key: `${compartment.no}-${entry.lineNo}`,
        label: `${compartment.no ? t('planning.pickup.compartmentNo', { no: compartment.no }) : t('planning.pickup.oneSpace')} · ${entry.recipientName} · ${entry.productName}`,
        unit: entry.unit,
        isFuel: entry.isFuel,
        expected: entry.expectedQuantity,
        compartmentNo: compartment.no,
        lineNo: entry.lineNo,
        loadedQuantity: entry.loadedQuantity ?? entry.expectedQuantity,
        temperatureC: entry.temperatureC,
        density: entry.density,
        volume15L: entry.volume15L
      }))
    )
  },
  { immediate: true }
)

/* The number fields may hand back text: read them as numbers. */
const num = (value: unknown) =>
  value === '' || value === null || value === undefined ? NaN : Number(value)
const filled = (value: unknown) => Number.isFinite(num(value))
const valid = computed(
  () =>
    !!documentRef.value.trim() &&
    rows.value.every(
      (row) =>
        filled(row.loadedQuantity) &&
        num(row.loadedQuantity) >= 0 &&
        (!row.isFuel || (filled(row.temperatureC) && filled(row.density) && filled(row.volume15L)))
    )
)

function confirm() {
  emit(
    'confirm',
    documentRef.value.trim(),
    rows.value.map((row) => ({
      compartmentNo: row.compartmentNo,
      lineNo: row.lineNo,
      loadedQuantity: Number(row.loadedQuantity),
      temperatureC: row.isFuel ? Number(row.temperatureC) : null,
      density: row.isFuel ? Number(row.density) : null,
      volume15L: row.isFuel ? Number(row.volume15L) : null
    }))
  )
}
</script>

<template>
  <ConfirmDialog
    :open="!!note"
    :title="t('planning.pickup.confirmTitle', { no: note?.orderNo ?? '' })"
    :confirm-label="t('planning.pickup.confirm')"
    :confirm-disabled="!valid"
    :loading="loading"
    panel-class="max-w-2xl"
    @confirm="confirm"
    @cancel="emit('cancel')"
  >
    <div class="space-y-3">
      <FormAlerts :error="error ?? null" />
      <BaseFormField :label="t('planning.pickup.documentRef')" required>
        <FormInput v-model="documentRef" :maxlength="40" />
        <p class="text-xs text-muted-foreground mt-1">{{ t('planning.pickup.documentRefHint') }}</p>
      </BaseFormField>
      <div v-for="row in rows" :key="row.key" class="rounded border border-border p-2 space-y-2">
        <p class="text-sm font-medium text-card-foreground">{{ row.label }}</p>
        <div class="grid gap-2" :class="row.isFuel ? 'sm:grid-cols-4' : 'sm:grid-cols-2'">
          <BaseFormField :label="t('planning.pickup.loadedQuantity', { unit: row.unit })" required>
            <FormInput v-model="row.loadedQuantity" type="number" :min="0" />
            <p class="text-xs text-muted-foreground mt-1">
              {{ t('planning.pickup.expectedHint', { quantity: formatNumber(row.expected) }) }}
            </p>
          </BaseFormField>
          <template v-if="row.isFuel">
            <BaseFormField :label="t('planning.pickup.temperature')" required>
              <FormInput v-model="row.temperatureC" type="number" />
            </BaseFormField>
            <BaseFormField :label="t('planning.pickup.density')" required>
              <FormInput v-model="row.density" type="number" />
            </BaseFormField>
            <BaseFormField :label="t('planning.pickup.volume15')" required>
              <FormInput v-model="row.volume15L" type="number" :min="0" />
            </BaseFormField>
          </template>
        </div>
      </div>
    </div>
  </ConfirmDialog>
</template>
