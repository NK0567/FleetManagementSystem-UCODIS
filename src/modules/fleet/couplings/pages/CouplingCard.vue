<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarCheck } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import { todayIso } from '@/utils/date'
import CouplingForm from '../components/CouplingForm.vue'
import { couplingService } from '../services/couplingService'
import { useCouplingStore } from '../stores/couplingStore'

const props = defineProps<{
  couplingNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useCouplingStore()
const { canUpdate, canInsert } = usePermissions('COUPLING')
/** A period is never edited: it is created, then ended. */
const canEdit = computed(() => false)
const formRef = ref<InstanceType<typeof CouplingForm> | null>(null)

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
  no: () => props.couplingNo,
  store,
  form: formRef,
  update: couplingService.update,
  canUpdate: canEdit,
  label: (record) => record.tractorPlate,
  saveErrorFallback: t('fleet.couplings.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.tractorPlate}` : t('fleet.couplings.card')
)

const showEndDialog = ref(false)
const endDate = ref(todayIso())
const ending = ref(false)

function openEndDialog() {
  endDate.value = todayIso()
  showEndDialog.value = true
}

async function confirmEnd() {
  const no = item.value?.no
  if (!no || !endDate.value) return
  ending.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await couplingService.end(no, endDate.value))
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    showEndDialog.value = false
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.couplings.endError'))
    showEndDialog.value = false
  } finally {
    ending.value = false
  }
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.couplings.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving || ending"
    :actions-disabled="isLoading || isSaving || ending"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.couplings.saveSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="false"
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
      <PeriodStatePill v-if="item" :state="item.state" />
    </template>
    <template v-if="canUpdate && item?.state === 'active'" #action-buttons>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="ending"
        @click="openEndDialog"
      >
        <CalendarCheck class="w-5 h-5 text-primary" /> {{ t('fleet.couplings.action.end') }}
      </button>
    </template>
    <template #form>
      <div class="min-h-0 flex flex-col h-full">
        <div class="sticky top-0 z-20 shrink-0 pt-1 px-6">
          <LoadingBar
            v-if="isLoading || isSaving"
            :height="2"
            bar-color="var(--color-primary)"
            track-color="rgba(0,0,0,0.2)"
          />
        </div>
        <div
          class="flex-1 min-h-0 overflow-y-auto transition-opacity duration-200"
          :class="isSaving ? 'opacity-60 pointer-events-none select-none' : ''"
        >
          <CouplingForm
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
    :open="showEndDialog"
    :title="t('fleet.couplings.action.end')"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="!endDate"
    :loading="ending"
    panel-class="max-w-md"
    @confirm="confirmEnd"
    @cancel="showEndDialog = false"
  >
    <div class="space-y-3">
      <p class="text-sm text-muted-foreground">{{ t('fleet.couplings.endHint') }}</p>
      <BaseFormField :label="t('fleet.couplings.form.endDate')" required>
        <DateFormInput v-model="endDate" />
      </BaseFormField>
    </div>
  </ConfirmDialog>
</template>
