<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleAlert, CircleCheck, Save } from '@lucide/vue'
import type { FileMeta } from '@/types/file.types'
import DocumentaryDossierList from '@/modules/planning/closing/components/DocumentaryDossierList.vue'
import { EMPTY_CELL, formatDateTime, formatNumber } from '@/utils/format'
import type { DebriefingInput, TransportOrderClosingApi } from '../types/transportOrder.types'

const props = defineProps<{
  closing: TransportOrderClosingApi
  editable?: boolean
  busy?: boolean
}>()
const emit = defineEmits<{
  attach: [kind: string, fileNo: string]
  debrief: [debriefing: DebriefingInput]
}>()

const { t, te } = useI18n()
/* The known kinds have a label; a kind added in the settings shows its code. */
const kindLabel = (kind: string) =>
  te(`planning.transportOrders.closing.kinds.${kind}`)
    ? t(`planning.transportOrders.closing.kinds.${kind}`)
    : kind

const filedKinds = computed(() => new Set(props.closing.documents.map((item) => item.kind)))
const missingKinds = computed(() =>
  props.closing.requiredDocuments.filter((kind) => !filedKinds.value.has(kind))
)

const kind = ref('')
watch(
  missingKinds,
  (missing) => {
    kind.value = missing[0] ?? ''
  },
  { immediate: true }
)
const kindValid = computed(() => /^[a-z0-9_]{1,40}$/.test(kind.value.trim()))

function onUploaded(file: FileMeta) {
  emit('attach', kind.value.trim(), file.no)
}

const debriefing = reactive<DebriefingInput>({
  voucherNo: '',
  loadedAt: '',
  unloadedAt: '',
  observations: ''
})
watch(
  () => props.closing.debriefing,
  (saved) => {
    debriefing.voucherNo = saved?.voucherNo ?? ''
    debriefing.loadedAt = saved?.loadedAt.slice(0, 16) ?? ''
    debriefing.unloadedAt = saved?.unloadedAt.slice(0, 16) ?? ''
    debriefing.observations = saved?.observations ?? ''
  },
  { immediate: true }
)

/* The fiche shows the compartments as saved; before saving, as read from the loading. */
const compartments = computed(
  () => props.closing.debriefing?.compartments ?? props.closing.derived.compartments
)
const compartmentLabel = (no: number) =>
  no
    ? t('planning.transportOrders.closing.compartmentNo', { no })
    : t('planning.transportOrders.closing.oneSpace')
const gapLabel = (qualification: 'gain' | 'loss' | null) =>
  qualification ? t(`planning.dossier.gap.${qualification}`) : t('planning.dossier.gap.none')

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'
</script>

<template>
  <div class="space-y-3 min-w-0">
    <div
      v-if="!closing.blocks.length"
      class="flex items-center gap-2 rounded border border-border bg-success-bg px-4 py-3 text-sm text-success"
    >
      <CircleCheck class="w-5 h-5 shrink-0" />
      {{ t('planning.transportOrders.closing.ready') }}
    </div>
    <div v-else class="rounded border border-border px-4 py-3 text-sm">
      <p class="text-xs font-semibold text-muted-foreground mb-2">
        {{ t('planning.transportOrders.closing.blocks') }}
      </p>
      <ul class="space-y-1.5">
        <li
          v-for="block in closing.blocks"
          :key="block"
          class="flex items-center gap-2 text-card-foreground"
        >
          <CircleAlert class="w-4 h-4 text-warning shrink-0" />
          {{ t(`planning.transportOrders.closing.block.${block}`) }}
        </li>
      </ul>
    </div>

    <dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
      <dt class="text-xs text-muted-foreground">
        {{ t('planning.transportOrders.closing.vehicle') }}
      </dt>
      <dd class="text-right font-medium text-card-foreground">
        {{ closing.derived.vehicle || EMPTY_CELL }}
        <template v-if="closing.derived.trailer"> · {{ closing.derived.trailer }}</template>
      </dd>
      <dt class="text-xs text-muted-foreground">
        {{ t('planning.transportOrders.closing.places') }}
      </dt>
      <dd class="text-right font-medium text-card-foreground">
        {{ closing.derived.places || EMPTY_CELL }}
      </dd>
      <dt class="text-xs text-muted-foreground">
        {{ t('planning.transportOrders.closing.gainLoss') }}
      </dt>
      <dd class="text-right font-medium text-card-foreground">
        <p v-for="gap in closing.derived.gaps" :key="gap.lineNo">
          {{ gap.productName }} · {{ formatNumber(gap.gap, 2) }} {{ gap.unit }} ·
          {{ gapLabel(gap.qualification) }}
          <template v-if="gap.imputableToDriver !== null">
            ·
            {{
              t(
                gap.imputableToDriver
                  ? 'planning.transportOrders.gaps.imputable'
                  : 'planning.transportOrders.gaps.notImputable'
              )
            }}
          </template>
        </p>
        <template v-if="!closing.derived.gaps.length">
          {{ t('planning.transportOrders.closing.noGap') }}
        </template>
      </dd>
      <dt class="text-xs text-muted-foreground">
        {{ t('planning.transportOrders.closing.compartments') }}
      </dt>
      <dd class="text-right font-medium text-card-foreground">
        <p v-for="item in compartments" :key="item.no">
          {{ compartmentLabel(item.no) }} · {{ item.productName || EMPTY_CELL }}
          <template v-if="item.quantity !== null">
            · {{ formatNumber(item.quantity, 2) }} {{ item.unit }}
          </template>
        </p>
      </dd>
    </dl>

    <DocumentaryDossierList :dossier="closing.dossier" />
  </div>

  <div class="space-y-3 min-w-0">
    <div>
      <div class="flex items-center justify-between gap-2 mb-2">
        <p class="text-sm font-semibold text-card-foreground">
          {{ t('planning.transportOrders.closing.documents') }}
        </p>
        <div v-if="closing.requiredDocuments.length" class="flex flex-wrap gap-1 justify-end">
          <StatusPill
            v-for="required in closing.requiredDocuments"
            :key="required"
            :label="kindLabel(required)"
            :tone="filedKinds.has(required) ? 'success' : 'warning'"
          />
        </div>
      </div>
      <p v-if="!closing.documents.length" class="text-sm text-muted-foreground">
        {{ t('planning.transportOrders.closing.noDocuments') }}
      </p>
      <div v-else class="space-y-2">
        <BaseFormField
          v-for="document in closing.documents"
          :key="document.kind"
          :label="kindLabel(document.kind)"
        >
          <FileAttachmentField :file="document.file" disabled />
        </BaseFormField>
      </div>
    </div>

    <div v-if="editable" class="rounded border border-border p-3 space-y-3">
      <BaseFormField :label="t('planning.transportOrders.closing.kind')" required>
        <FormInput v-model="kind" :maxlength="40" :invalid="!!kind && !kindValid" />
        <p class="text-xs text-muted-foreground mt-1">
          {{ t('planning.transportOrders.closing.kindHint') }}
        </p>
      </BaseFormField>
      <FileAttachmentField :file="null" :disabled="busy || !kindValid" @uploaded="onUploaded" />
    </div>

    <div>
      <p class="text-sm font-semibold text-card-foreground mb-2">
        {{ t('planning.transportOrders.closing.debriefing') }}
      </p>
      <p v-if="closing.debriefing" class="text-xs text-muted-foreground mb-2">
        {{
          t('planning.transportOrders.closing.savedBy', {
            at: formatDateTime(closing.debriefing.savedAt),
            by: closing.debriefing.savedBy
          })
        }}
      </p>
      <div class="space-y-3">
        <BaseFormField :label="t('planning.transportOrders.closing.voucher')" required>
          <FormInput v-model="debriefing.voucherNo" :maxlength="40" :disabled="!editable" />
        </BaseFormField>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BaseFormField :label="t('planning.transportOrders.closing.loadedAt')">
            <FormInput v-model="debriefing.loadedAt" type="datetime-local" :disabled="!editable" />
          </BaseFormField>
          <BaseFormField :label="t('planning.transportOrders.closing.unloadedAt')">
            <FormInput
              v-model="debriefing.unloadedAt"
              type="datetime-local"
              :disabled="!editable"
            />
          </BaseFormField>
        </div>
        <BaseFormField :label="t('planning.transportOrders.closing.observations')">
          <FormTextarea
            v-model="debriefing.observations"
            :rows="2"
            :maxlength="500"
            :disabled="!editable"
          />
        </BaseFormField>
        <div v-if="editable" class="flex justify-end">
          <button
            type="button"
            :class="buttonClass"
            :disabled="busy || !debriefing.voucherNo.trim()"
            @click="emit('debrief', { ...debriefing })"
          >
            <Save class="w-5 h-5 text-primary" />
            {{ t('planning.transportOrders.action.debriefing') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
