<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Ban, CircleCheck } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import FuelCardForm from '../components/FuelCardForm.vue'
import { fuelCardService } from '../services/fuelCardService'
import { useFuelCardStore } from '../stores/fuelCardStore'

const props = defineProps<{
  fuelCardNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useFuelCardStore()
const { canUpdate, canInsert } = usePermissions('FUELCARD')
const formRef = ref<InstanceType<typeof FuelCardForm> | null>(null)

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
  no: () => props.fuelCardNo,
  store,
  form: formRef,
  update: fuelCardService.update,
  canUpdate,
  label: (record) => record.number,
  saveErrorFallback: t('fleet.fuelCards.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.number}` : t('fleet.fuelCards.card')
)

const showActions = computed(
  () => canUpdate.value && !!item.value && !isEditMode.value && !isFormDirty.value
)
const blocking = ref(false)
const unblocking = ref(false)
const working = ref(false)

async function run(action: () => ReturnType<typeof fuelCardService.block>) {
  working.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.fuelCards.actionError'))
  } finally {
    working.value = false
  }
}

async function block(reason: string) {
  blocking.value = false
  const no = item.value?.no
  if (no) await run(() => fuelCardService.block(no, reason))
}

async function unblock(comment: string) {
  unblocking.value = false
  const no = item.value?.no
  if (no) await run(() => fuelCardService.unblock(no, comment))
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.fuelCards.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.fuelCards.saveSuccess')"
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
      <CardStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="showActions" #action-buttons>
      <button
        v-if="item?.status === 'active'"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="working"
        @click="blocking = true"
      >
        <Ban class="w-5 h-5 text-primary" /> {{ t('fleet.fuelCards.action.block') }}
      </button>
      <button
        v-if="item?.status === 'blocked'"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="working"
        @click="unblocking = true"
      >
        <CircleCheck class="w-5 h-5 text-primary" /> {{ t('fleet.fuelCards.action.unblock') }}
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
          <FuelCardForm
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
    :open="blocking"
    :title="t('fleet.fuelCards.action.block')"
    :label="t('fleet.fuelCards.form.blockReason')"
    :confirm-label="t('fleet.fuelCards.action.block')"
    destructive
    :loading="working"
    @confirm="block"
    @cancel="blocking = false"
  />

  <ReasonDialog
    :open="unblocking"
    :title="t('fleet.fuelCards.action.unblock')"
    :label="t('fleet.fuelCards.form.unblockComment')"
    :confirm-label="t('fleet.fuelCards.action.unblock')"
    :loading="working"
    @confirm="unblock"
    @cancel="unblocking = false"
  />
</template>
