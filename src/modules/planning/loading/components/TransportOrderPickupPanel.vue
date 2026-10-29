<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Mail, PackageCheck, Printer } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import { printElement } from '@/utils/printElement'
import { pickupApi } from '../api/pickupApi'
import type { PickupEntryInput, PickupNoteApi } from '../types/pickup.types'
import PickupConfirmDialog from './PickupConfirmDialog.vue'
import PickupNoteView from './PickupNoteView.vue'

/**
 * The pickup note on the order card: read by the planner, sent to the site and confirmed by
 * the delivery manager or the site (TRS03-US03, US04).
 */
const props = defineProps<{ orderNo: string; orderStatus: string }>()
const emit = defineEmits<{ changed: [] }>()
const { t } = useI18n()
const { canRead, canUpdate } = usePermissions('LOADING')

const note = ref<PickupNoteApi | null>(null)
const error = ref<string | null>(null)
const busy = ref(false)
const sending = ref(false)
const email = ref('')
const confirming = ref<PickupNoteApi | null>(null)
const view = ref<InstanceType<typeof PickupNoteView> | null>(null)

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60'

async function load() {
  note.value = null
  if (
    !canRead.value ||
    !['planned', 'confirmed', 'ready', 'in_progress', 'completed'].includes(props.orderStatus)
  )
    return
  try {
    note.value = await pickupApi.note(props.orderNo)
  } catch {
    note.value = null
  }
}
watch(
  () => [props.orderNo, props.orderStatus],
  () => void load(),
  { immediate: true }
)

async function send() {
  busy.value = true
  error.value = null
  try {
    note.value = await pickupApi.send(props.orderNo, email.value.trim())
    sending.value = false
    emit('changed')
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.pickup.saveError'))
  } finally {
    busy.value = false
  }
}

async function confirm(documentRef: string, entries: PickupEntryInput[]) {
  busy.value = true
  error.value = null
  try {
    note.value = await pickupApi.confirm(props.orderNo, documentRef, entries)
    confirming.value = null
    emit('changed')
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.pickup.saveError'))
  } finally {
    busy.value = false
  }
}

function startSend() {
  email.value = note.value?.sentTo || note.value?.pickupSiteEmail || ''
  sending.value = true
}
function print() {
  printElement(view.value?.root ?? null, t('planning.pickup.title', { no: props.orderNo }))
}
defineExpose({ visible: () => !!note.value })
</script>

<template>
  <div v-if="note" class="xl:col-span-2 min-w-0 space-y-2">
    <FormAlerts v-if="!confirming" :error="error" @clear:error="error = null" />
    <div class="flex flex-wrap gap-2">
      <button type="button" :class="buttonClass" @click="print">
        <Printer class="w-4 h-4 text-primary" /> {{ t('planning.pickup.print') }}
      </button>
      <button
        v-if="canUpdate && note.status !== 'confirmed'"
        type="button"
        :class="buttonClass"
        :disabled="busy"
        @click="startSend"
      >
        <Mail class="w-4 h-4 text-primary" />
        {{ note.sentAt ? t('planning.pickup.resend') : t('planning.pickup.send') }}
      </button>
      <button
        v-if="canUpdate && note.status !== 'confirmed' && note.orderStatus === 'confirmed'"
        type="button"
        :class="buttonClass"
        :disabled="busy"
        @click="confirming = note"
      >
        <PackageCheck class="w-4 h-4 text-primary" /> {{ t('planning.pickup.confirm') }}
      </button>
    </div>
    <div v-if="sending" class="flex flex-wrap items-end gap-2 rounded border border-border p-2">
      <BaseFormField :label="t('planning.pickup.email')" required class="flex-1 min-w-56">
        <FormInput v-model="email" type="email" :maxlength="120" />
      </BaseFormField>
      <button
        type="button"
        class="cursor-pointer px-3 py-2 rounded bg-primary text-primary-foreground text-sm disabled:opacity-60"
        :disabled="busy || !email.trim()"
        @click="send"
      >
        {{ t('planning.pickup.sendNow') }}
      </button>
      <button
        type="button"
        class="cursor-pointer px-3 py-2 rounded border border-border text-sm hover:bg-accent"
        @click="sending = false"
      >
        {{ t('common.cancel') }}
      </button>
    </div>
    <PickupNoteView ref="view" :note="note" />
    <PickupConfirmDialog
      :note="confirming"
      :loading="busy"
      :error="error"
      @confirm="confirm"
      @cancel="((confirming = null), (error = null))"
    />
  </div>
</template>
