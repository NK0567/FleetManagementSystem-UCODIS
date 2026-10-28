<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Copy } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import MaintenancePlanForm from '../components/MaintenancePlanForm.vue'
import { maintenancePlanService } from '../services/maintenancePlanService'
import { useMaintenancePlanStore } from '../stores/maintenancePlanStore'

const props = defineProps<{
  maintenancePlanNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useMaintenancePlanStore()
const { canUpdate, canInsert } = usePermissions('MAINTENANCEPLAN')
const formRef = ref<InstanceType<typeof MaintenancePlanForm> | null>(null)

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
  no: () => props.maintenancePlanNo,
  store,
  form: formRef,
  update: maintenancePlanService.update,
  canUpdate,
  label: (record) => record.name,
  saveErrorFallback: t('maintenance.maintenancePlans.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.name}` : t('maintenance.maintenancePlans.card')
)

const duplicating = ref(false)
const copyName = ref('')
const acting = ref(false)

function openDuplicate() {
  copyName.value = ''
  duplicating.value = true
}

async function duplicate() {
  const no = item.value?.no
  if (!no || !copyName.value.trim()) return
  acting.value = true
  saveError.value = null
  try {
    const copy = await maintenancePlanService.duplicate(no, copyName.value.trim())
    duplicating.value = false
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    goTo(copy.no)
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('maintenance.maintenancePlans.saveError'))
  } finally {
    acting.value = false
  }
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('maintenance.maintenancePlans.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('maintenance.maintenancePlans.saveSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="canUpdate"
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
    <template v-if="canInsert && item && !isEditMode && !isFormDirty" #action-buttons>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="acting"
        @click="openDuplicate"
      >
        <Copy class="w-5 h-5 text-primary" />
        {{ t('maintenance.maintenancePlans.action.duplicate') }}
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
          <MaintenancePlanForm
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
    :open="duplicating"
    :title="t('maintenance.maintenancePlans.action.duplicate')"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="!copyName.trim()"
    :loading="acting"
    panel-class="max-w-md"
    @confirm="duplicate"
    @cancel="duplicating = false"
  >
    <p class="text-sm text-muted-foreground mb-3">
      {{ t('maintenance.maintenancePlans.duplicateHint') }}
    </p>
    <BaseFormField :label="t('maintenance.maintenancePlans.form.name')" required>
      <FormInput v-model="copyName" :maxlength="120" />
    </BaseFormField>
  </ConfirmDialog>
</template>
