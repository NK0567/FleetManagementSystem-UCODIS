<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleStop } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import DowntimeForm from '../components/DowntimeForm.vue'
import { downtimeService } from '../services/downtimeService'
import { useDowntimeStore } from '../stores/downtimeStore'

const props = defineProps<{
  downtimeNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useDowntimeStore()
const { canUpdate, canInsert } = usePermissions('DOWNTIME')
const formRef = ref<InstanceType<typeof DowntimeForm> | null>(null)

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
  no: () => props.downtimeNo,
  store,
  form: formRef,
  update: downtimeService.update,
  canUpdate,
  label: (record) => record.vehiclePlate,
  saveErrorFallback: t('maintenance.downtimes.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.vehiclePlate}` : t('maintenance.downtimes.card')
)

const showActions = computed(
  () =>
    canUpdate.value &&
    item.value?.status === 'open' &&
    item.value.origin === 'manual' &&
    !isEditMode.value &&
    !isFormDirty.value
)
const ending = ref(false)
const working = ref(false)

async function end(comment: string) {
  ending.value = false
  const no = item.value?.no
  if (!no) return
  working.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await downtimeService.end(no, comment))
    await store.fetchItems(store.pagination.page, store.pagination.limit)
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('maintenance.downtimes.actionError'))
  } finally {
    working.value = false
  }
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('maintenance.downtimes.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('maintenance.downtimes.saveSuccess')"
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
    <template #title-badges>
      <DowntimeStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="showActions" #action-buttons>
      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="working"
        @click="ending = true"
      >
        <CircleStop class="w-5 h-5 text-primary" /> {{ t('maintenance.downtimes.action.end') }}
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
          <DowntimeForm
            ref="formRef"
            :initial-data="item ?? {}"
            :disabled="!isEditMode || isSaving"
            :validation-errors="validationErrors"
          />
        </div>
      </div>
    </template>
  </CardModalShell>

  <ReasonDialog
    :open="ending"
    :title="t('maintenance.downtimes.action.end')"
    :label="t('maintenance.downtimes.form.endComment')"
    :confirm-label="t('maintenance.downtimes.action.end')"
    :loading="working"
    @confirm="end"
    @cancel="ending = false"
  />
</template>
