<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Lock, PenLine } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { isEditable } from '../domain/tripDebrief'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import TripDebriefForm from '../components/TripDebriefForm.vue'
import { tripDebriefService } from '../services/tripDebriefService'
import { useTripDebriefStore } from '../stores/tripDebriefStore'

const props = defineProps<{
  itemNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useTripDebriefStore()
const { canUpdate, canInsert } = usePermissions('TRIPDEBRIEF')
const canEdit = computed(
  () => canUpdate.value && !!store.currentItem && isEditable(store.currentItem.status)
)
const formRef = ref<InstanceType<typeof TripDebriefForm> | null>(null)

const {
  item,
  isLoading,
  errorMsg,
  isEditMode,
  isSaving,
  saveError,
  saveSuccess,
  validationErrors,
  isFormDirty,
  hasPrev,
  hasNext,
  sidebarItems,
  enterEditMode,
  cancelEdit,
  saveItem,
  goTo,
  goToPrev,
  goToNext
} = useEntityCard({
  no: () => props.itemNo,
  store,
  form: formRef,
  update: tripDebriefService.update,
  canUpdate: canEdit,
  label: (record) => record.voucherNo,
  saveErrorFallback: t('fleet.tripDebriefs.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.employeeName}` : t('fleet.tripDebriefs.card')
)
const showActions = computed(
  () => canEdit.value && !!item.value && !isEditMode.value && !isFormDirty.value
)
const working = ref(false)

async function run(action: () => ReturnType<typeof tripDebriefService.close>) {
  working.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.tripDebriefs.actionError'))
    return false
  } finally {
    working.value = false
  }
}

function sign(party: 'driver' | 'manager') {
  const no = item.value?.no
  if (no) void run(() => tripDebriefService.sign(no, party))
}

const confirmClose = ref(false)

async function closeDebrief() {
  const no = item.value?.no
  if (no && (await run(() => tripDebriefService.close(no)))) confirmClose.value = false
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.tripDebriefs.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving || working"
    :actions-disabled="isLoading || isSaving || working"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.tripDebriefs.saveSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="canEdit"
    :show-title-new-button="canInsert"
    :has-unsaved-changes="isFormDirty"
    :can-save="isFormDirty"
    @close="emit('close')"
    @save="saveItem"
    @enter-edit="enterEditMode"
    @cancel-edit="cancelEdit"
    @go-prev="goToPrev"
    @go-next="goToNext"
    @select-sidebar="goTo"
    @create="emit('create')"
    @clear-save-error="saveError = null"
  >
    <template #title-badges>
      <TripDebriefStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="showActions" #action-buttons>
      <button
        v-if="!item?.driverSignedOn"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition"
        @click="sign('driver')"
      >
        <PenLine class="w-4 h-4 text-primary" /> {{ t('fleet.tripDebriefs.action.signDriver') }}
      </button>
      <button
        v-if="!item?.managerSignedOn"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition"
        @click="sign('manager')"
      >
        <PenLine class="w-4 h-4 text-primary" /> {{ t('fleet.tripDebriefs.action.signManager') }}
      </button>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="item?.status !== 'signed'"
        :title="item?.status !== 'signed' ? t('fleet.tripDebriefs.signFirst') : undefined"
        @click="confirmClose = true"
      >
        <Lock class="w-4 h-4" /> {{ t('fleet.tripDebriefs.action.close') }}
      </button>
    </template>
    <template #form>
      <div class="min-h-0 flex flex-col h-full">
        <div class="sticky top-0 z-20 shrink-0 pt-1 px-6">
          <LoadingBar
            v-if="isLoading || isSaving || working"
            :height="2"
            bar-color="var(--color-primary)"
            track-color="rgba(0,0,0,0.2)"
          />
        </div>
        <div
          class="flex-1 min-h-0 overflow-y-auto transition-opacity duration-200"
          :class="isSaving ? 'opacity-60 pointer-events-none select-none' : ''"
        >
          <TripDebriefForm
            ref="formRef"
            :initial-data="item ?? {}"
            :disabled="!isEditMode || isSaving"
            :validation-errors="validationErrors"
          />
        </div>
      </div>
    </template>
  </CardModalShell>

  <ConfirmDialog
    :open="confirmClose"
    :title="t('fleet.tripDebriefs.action.close')"
    :message="t('fleet.tripDebriefs.closeConfirm')"
    :confirm-label="t('common.confirm')"
    :loading="working"
    @confirm="closeDebrief"
    @cancel="confirmClose = false"
  />
</template>
