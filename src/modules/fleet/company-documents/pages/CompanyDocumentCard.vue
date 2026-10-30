<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleCheck, CircleX, FilePlus } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import { useUserStore } from '@/stores/user'
import CompanyDocumentForm from '../components/CompanyDocumentForm.vue'
import { decisionBlock, MIN_REJECTION_REASON_LENGTH } from '../domain/companyDocument'
import { companyDocumentService } from '../services/companyDocumentService'
import { useCompanyDocumentStore } from '../stores/companyDocumentStore'

const props = defineProps<{
  companyDocumentNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useCompanyDocumentStore()
const userStore = useUserStore()
const { canUpdate, canInsert, canExecute } = usePermissions('COMPANYDOCUMENT')
/** A document under review can still be corrected; a decision freezes it. */
const canEdit = computed(() => canUpdate.value && store.currentItem?.status === 'pending')
const formRef = ref<InstanceType<typeof CompanyDocumentForm> | null>(null)

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
  no: () => props.companyDocumentNo,
  store,
  form: formRef,
  update: companyDocumentService.update,
  canUpdate: canEdit,
  label: (record) => record.name,
  saveErrorFallback: t('fleet.companyDocuments.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.name}` : t('fleet.companyDocuments.card')
)

const block = computed(() =>
  item.value ? decisionBlock(item.value, userStore.user?.code ?? '') : 'notPending'
)
const showDecision = computed(
  () => canExecute.value && !isEditMode.value && block.value !== 'notPending'
)

const deciding = ref(false)
const rejecting = ref(false)

async function run(action: () => Promise<Parameters<typeof store.setCurrentItem>[0]>) {
  deciding.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.companyDocuments.actionError'))
  } finally {
    deciding.value = false
  }
}

function approve() {
  if (item.value) void run(() => companyDocumentService.approve(item.value!.no))
}

async function reject(reason: string) {
  rejecting.value = false
  if (item.value) await run(() => companyDocumentService.reject(item.value!.no, reason))
}

const showNewVersion = ref(false)
const newVersion = computed(() =>
  item.value
    ? {
        name: item.value.name,
        documentTypeNo: item.value.documentTypeNo,
        orgUnitNo: item.value.orgUnitNo,
        keywords: [...item.value.keywords],
        supersedesNo: item.value.no
      }
    : {}
)

async function onVersionCreated(document: { no: string }) {
  showNewVersion.value = false
  await store.fetchItems(store.pagination.page, store.pagination.limit)
  goTo(document.no)
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.companyDocuments.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving || deciding"
    :actions-disabled="isLoading || isSaving || deciding"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.companyDocuments.saveSuccess')"
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
      <CompanyDocumentStatusPill v-if="item" :status="item.status" />
      <DocumentStatePill v-if="item?.state" :state="item.state" />
    </template>
    <template v-if="item && !isFormDirty" #action-buttons>
      <template v-if="showDecision">
        <button
          type="button"
          class="cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="block === 'ownDocument' || deciding"
          :title="block === 'ownDocument' ? t('fleet.companyDocuments.ownDocumentHint') : undefined"
          @click="approve"
        >
          <CircleCheck class="w-4 h-4" />
          {{ t('fleet.companyDocuments.action.approve') }}
        </button>
        <button
          type="button"
          class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="block === 'ownDocument' || deciding"
          :title="block === 'ownDocument' ? t('fleet.companyDocuments.ownDocumentHint') : undefined"
          @click="rejecting = true"
        >
          <CircleX class="w-5 h-5 text-primary" /> {{ t('fleet.companyDocuments.action.reject') }}
        </button>
      </template>
      <button
        v-if="canInsert && item.current"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        @click="showNewVersion = true"
      >
        <FilePlus class="w-5 h-5 text-primary" />
        {{ t('fleet.companyDocuments.action.newVersion') }}
      </button>
    </template>
    <template #form>
      <div class="min-h-0 flex flex-col h-full">
        <div class="sticky top-0 z-20 shrink-0 pt-1 px-6">
          <LoadingBar
            v-if="isLoading || isSaving || deciding"
            :height="2"
            bar-color="var(--color-primary)"
            track-color="rgba(0,0,0,0.2)"
          />
        </div>
        <div
          class="flex-1 min-h-0 overflow-y-auto transition-opacity duration-200"
          :class="isSaving ? 'opacity-60 pointer-events-none select-none' : ''"
        >
          <CompanyDocumentForm
            ref="formRef"
            :initial-data="item ?? {}"
            :disabled="!isEditMode || isSaving"
            :validation-errors="validationErrors"
          />
        </div>
      </div>
    </template>
  </CardModalShell>

  <CompanyDocumentCreateModal
    v-if="showNewVersion"
    :initial-data="newVersion"
    @close="showNewVersion = false"
    @created="onVersionCreated"
  />

  <ReasonDialog
    :open="rejecting"
    :title="t('fleet.companyDocuments.action.reject')"
    :label="t('fleet.companyDocuments.form.decisionReason')"
    :confirm-label="t('fleet.companyDocuments.action.reject')"
    :min-length="MIN_REJECTION_REASON_LENGTH"
    destructive
    :loading="deciding"
    @confirm="reject"
    @cancel="rejecting = false"
  />
</template>
