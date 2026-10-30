<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Scale } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import FuelRefillForm from '../components/FuelRefillForm.vue'
import { fuelRefillService } from '../services/fuelRefillService'
import { useFuelRefillStore } from '../stores/fuelRefillStore'

const props = defineProps<{
  fuelRefillNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useFuelRefillStore()
const { canUpdate, canInsert } = usePermissions('FUELREFILL')
/** A qualified refill is settled: it no longer changes. */
const canEdit = computed(() => canUpdate.value && !store.currentItem?.qualification)
const formRef = ref<InstanceType<typeof FuelRefillForm> | null>(null)

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
  no: () => props.fuelRefillNo,
  store,
  form: formRef,
  update: fuelRefillService.update,
  canUpdate: canEdit,
  label: (record) => record.vehiclePlate,
  saveErrorFallback: t('fleet.fuelRefills.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.vehiclePlate}` : t('fleet.fuelRefills.card')
)

const showQualify = ref(false)
const causeNo = ref<string | null>(null)
const comment = ref('')
const qualifying = ref(false)

function openQualify() {
  causeNo.value = null
  comment.value = ''
  showQualify.value = true
}

async function confirmQualify() {
  const no = item.value?.no
  if (!no || !causeNo.value || !comment.value.trim()) return
  qualifying.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await fuelRefillService.qualify(no, causeNo.value, comment.value))
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    showQualify.value = false
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.fuelRefills.actionError'))
  } finally {
    qualifying.value = false
  }
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.fuelRefills.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.fuelRefills.saveSuccess')"
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
      <RefillStatusPill v-if="item" :status="item.status" />
    </template>
    <template
      v-if="canUpdate && item?.status === 'anomaly' && !isEditMode && !isFormDirty"
      #action-buttons
    >
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        @click="openQualify"
      >
        <Scale class="w-4 h-4" /> {{ t('fleet.fuelRefills.action.qualify') }}
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
          <FuelRefillForm
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
    :open="showQualify"
    :title="t('fleet.fuelRefills.action.qualify')"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="!causeNo || !comment.trim()"
    :loading="qualifying"
    panel-class="max-w-md"
    @confirm="confirmQualify"
    @cancel="showQualify = false"
  >
    <div class="space-y-3">
      <BaseFormField :label="t('fleet.fuelRefills.form.cause')" required>
        <ReferenceLookup
          v-model="causeNo"
          reference-key="fuelGapCauses"
          :modal-title="t('fleet.fuelRefills.form.cause')"
        />
      </BaseFormField>
      <BaseFormField :label="t('fleet.fuelRefills.form.comment')" required>
        <FormTextarea v-model="comment" :rows="3" :maxlength="300" />
      </BaseFormField>
    </div>
  </ConfirmDialog>
</template>
