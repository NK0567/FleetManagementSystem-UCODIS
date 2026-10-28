<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileWarning, RefreshCw } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import DocumentForm from '../components/DocumentForm.vue'
import type { DeclaredStatus } from '../domain/document'
import { documentService } from '../services/documentService'
import { useDocumentStore } from '../stores/documentStore'

const props = defineProps<{
  documentNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useDocumentStore()
const { canUpdate, canInsert } = usePermissions('DOCUMENT')
/** Only the current version, neither cancelled nor lost, still changes. */
const canEdit = computed(
  () => canUpdate.value && !!store.currentItem?.current && !store.currentItem.declaredStatus
)
const formRef = ref<InstanceType<typeof DocumentForm> | null>(null)

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
  no: () => props.documentNo,
  store,
  form: formRef,
  update: documentService.update,
  canUpdate: canEdit,
  label: (record) => record.documentTypeName,
  saveErrorFallback: t('fleet.documents.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.documentTypeName}` : t('fleet.documents.card')
)

const showRenew = ref(false)
const renewal = computed(() =>
  item.value
    ? {
        target: item.value.target,
        subjectNo: item.value.subjectNo,
        documentTypeNo: item.value.documentTypeNo
      }
    : {}
)

async function onRenewed(document: { no: string }) {
  showRenew.value = false
  await store.fetchItems(store.pagination.page, store.pagination.limit)
  goTo(document.no)
}

const showDeclare = ref(false)
const declaredStatus = ref<DeclaredStatus>('lost')
const declaredReason = ref('')
const declaring = ref(false)

async function confirmDeclare() {
  const no = item.value?.no
  if (!no || !declaredReason.value.trim()) return
  declaring.value = true
  saveError.value = null
  try {
    store.setCurrentItem(
      await documentService.declare(no, declaredStatus.value, declaredReason.value)
    )
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    showDeclare.value = false
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.documents.actionError'))
  } finally {
    declaring.value = false
  }
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.documents.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.documents.saveSuccess')"
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
      <DocumentStatePill v-if="item" :state="item.state" />
    </template>
    <template v-if="item?.current && !isFormDirty" #action-buttons>
      <button
        v-if="canInsert"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        @click="showRenew = true"
      >
        <RefreshCw class="w-5 h-5 text-primary" /> {{ t('fleet.documents.action.renew') }}
      </button>
      <button
        v-if="canEdit"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        @click="((declaredReason = ''), (showDeclare = true))"
      >
        <FileWarning class="w-5 h-5 text-primary" /> {{ t('fleet.documents.action.declare') }}
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
          <DocumentForm
            ref="formRef"
            :initial-data="item ?? {}"
            :disabled="!isEditMode || isSaving"
            :validation-errors="validationErrors"
          />
        </div>
      </div>
    </template>
  </CardModalShell>

  <DocumentCreateModal
    v-if="showRenew"
    :initial-data="renewal"
    @close="showRenew = false"
    @created="onRenewed"
  />

  <ConfirmDialog
    :open="showDeclare"
    :title="t('fleet.documents.action.declare')"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="!declaredReason.trim()"
    :loading="declaring"
    destructive
    panel-class="max-w-md"
    @confirm="confirmDeclare"
    @cancel="showDeclare = false"
  >
    <div class="space-y-3">
      <p class="text-sm text-muted-foreground">{{ t('fleet.documents.declareHint') }}</p>
      <BaseFormField :label="t('fleet.documents.form.declaredStatus')" required>
        <OptionsSelect
          :model-value="declaredStatus"
          options-key="documentState"
          :hidden-values="['valid', 'expiring', 'expired']"
          @update:model-value="declaredStatus = String($event) as DeclaredStatus"
        />
      </BaseFormField>
      <BaseFormField :label="t('fleet.documents.form.declaredReason')" required>
        <FormTextarea v-model="declaredReason" :rows="3" :maxlength="300" />
      </BaseFormField>
    </div>
  </ConfirmDialog>
</template>
