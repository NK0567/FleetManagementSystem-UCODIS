<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleCheck, ShieldAlert } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import TelematicsEventForm from '../components/TelematicsEventForm.vue'
import { telematicsEventService } from '../services/telematicsEventService'
import { useTelematicsEventStore } from '../stores/telematicsEventStore'

const props = defineProps<{
  telematicsEventNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useTelematicsEventStore()
const { canUpdate, canInsert } = usePermissions('TELEMATICS')
const formRef = ref<InstanceType<typeof TelematicsEventForm> | null>(null)

// Events come from the units: they are handled, never edited.
const {
  item,
  isLoading,
  errorMsg,
  isEditMode,
  isSaving,
  saveError,
  saveSuccess,
  validationErrors,
  hasPrev,
  hasNext,
  sidebarItems,
  goTo,
  goToPrev,
  goToNext
} = useEntityCard({
  no: () => props.telematicsEventNo,
  store,
  form: formRef,
  update: telematicsEventService.update,
  canUpdate: computed(() => false),
  label: (record) => record.eventTypeName,
  saveErrorFallback: t('fleet.telematicsEvents.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value
    ? `${item.value.no} · ${item.value.eventTypeName} · ${item.value.vehiclePlate}`
    : t('fleet.telematicsEvents.card')
)

const showActions = computed(() => canUpdate.value && item.value?.status === 'new')
const acknowledging = ref(false)
const working = ref(false)

async function run(action: () => ReturnType<typeof telematicsEventService.acknowledge>) {
  working.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.telematicsEvents.actionError'))
  } finally {
    working.value = false
  }
}

async function acknowledge(comment: string) {
  acknowledging.value = false
  const no = item.value?.no
  if (no) await run(() => telematicsEventService.acknowledge(no, comment))
}

async function openInfraction() {
  const no = item.value?.no
  if (no) await run(() => telematicsEventService.openInfraction(no))
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.telematicsEvents.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.telematicsEvents.saveSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="false"
    :show-title-new-button="canInsert"
    :has-unsaved-changes="false"
    :can-save="false"
    @close="emit('close')"
    @go-prev="goToPrev"
    @go-next="goToNext"
    @select-sidebar="goTo"
    @create="emit('create')"
    @clear-save-error="saveError = null"
  >
    <template #title-badges>
      <TelematicsEventStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="item" #action-buttons>
      <button
        v-if="showActions"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="working"
        @click="acknowledging = true"
      >
        <CircleCheck class="w-4 h-4" />
        {{ t('fleet.telematicsEvents.action.acknowledge') }}
      </button>
      <button
        v-if="showActions && item?.infractionTypeNo"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="working"
        @click="openInfraction"
      >
        <ShieldAlert class="w-5 h-5 text-primary" />
        {{ t('fleet.telematicsEvents.action.openInfraction') }}
      </button>
      <SourceWorkOrder
        origin="telematics"
        :origin-no="item.no"
        :work-order-no="item.workOrderNo"
        :eligible="item.family === 'fault'"
      />
    </template>
    <template #form>
      <div class="min-h-0 flex flex-col h-full">
        <div class="sticky top-0 z-20 shrink-0 pt-1 px-6">
          <LoadingBar
            v-if="isLoading || working"
            :height="2"
            bar-color="var(--color-primary)"
            track-color="rgba(0,0,0,0.2)"
          />
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto">
          <TelematicsEventForm
            ref="formRef"
            :initial-data="item ?? {}"
            disabled
            :validation-errors="validationErrors"
          />
        </div>
      </div>
    </template>
  </CardModalShell>

  <ReasonDialog
    :open="acknowledging"
    :title="t('fleet.telematicsEvents.action.acknowledge')"
    :label="t('fleet.telematicsEvents.form.acknowledgementComment')"
    :confirm-label="t('fleet.telematicsEvents.action.acknowledge')"
    :loading="working"
    @confirm="acknowledge"
    @cancel="acknowledging = false"
  />
</template>
