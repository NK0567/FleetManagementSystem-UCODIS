<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  Maximize2,
  Minimize2,
  PenLine,
  Plus,
  X
} from '@lucide/vue'
import LoadingSpinner from './LoadingSpinner.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    pageTitle: string
    /** Shown in the primary color when the title starts with it. */
    pageNumber?: string
    bannerLabel: string
    isLoading: boolean
    errorMsg: string | null
    hasData: boolean
    isEditMode: boolean
    isSaving: boolean
    actionsDisabled?: boolean
    saveError: string | null
    saveSuccess: boolean
    saveSuccessMessage?: string
    sidebarItems: { no: string; label?: string }[]
    currentNo: string | null
    hasPrev: boolean
    hasNext: boolean
    showEdit?: boolean
    showTitleNewButton?: boolean
    hideTitleBar?: boolean
    hideActionBar?: boolean
    statusLabel?: string
    /** Closing asks for confirmation while this is true. */
    hasUnsavedChanges?: boolean
    /** Hides Save in edit mode, e.g. until the form is dirty. */
    canSave?: boolean
  }>(),
  {
    pageNumber: undefined,
    actionsDisabled: false,
    saveSuccessMessage: undefined,
    showEdit: true,
    showTitleNewButton: true,
    hideTitleBar: false,
    hideActionBar: false,
    statusLabel: undefined,
    hasUnsavedChanges: false,
    canSave: true
  }
)

const emit = defineEmits<{
  close: []
  save: []
  'enter-edit': []
  'cancel-edit': []
  'go-prev': []
  'go-next': []
  'select-sidebar': [no: string]
  create: []
  'clear-save-error': []
}>()

const showUnsavedDiscardDialog = ref(false)
const isEnlarged = ref(true)

const titleSuffix = computed(() =>
  props.pageNumber && props.pageTitle.startsWith(props.pageNumber)
    ? props.pageTitle.slice(props.pageNumber.length)
    : null
)

function attemptClose() {
  if (props.hasUnsavedChanges) showUnsavedDiscardDialog.value = true
  else emit('close')
}

function confirmLeaveWithoutSaving() {
  showUnsavedDiscardDialog.value = false
  emit('close')
}

const SIDEBAR_MIN = 80
const SIDEBAR_MAX = 400
const SIDEBAR_DEFAULT = 112
const sidebarWidth = ref(SIDEBAR_DEFAULT)

function onResizeStart(start: MouseEvent) {
  const startX = start.clientX
  const startWidth = sidebarWidth.value
  const onMove = (move: MouseEvent) => {
    sidebarWidth.value = Math.min(
      SIDEBAR_MAX,
      Math.max(SIDEBAR_MIN, startWidth + move.clientX - startX)
    )
  }
  const onEnd = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onEnd)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onEnd)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (showUnsavedDiscardDialog.value) showUnsavedDiscardDialog.value = false
  else attemptClose()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="#below-topbar" defer>
    <div class="absolute inset-0 flex z-50">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-md" @click="attemptClose"></div>

      <div
        class="static z-10 flex flex-col h-full bg-white overflow-x-visible overflow-y-hidden transition-[margin] duration-200 mx-0"
        :class="isEnlarged ? 'w-full lg:mx-16' : 'w-full lg:mx-48'"
      >
        <button
          v-if="hasNext"
          type="button"
          class="absolute top-[53%] -translate-y-1/2 z-20 w-10 h-10 bg-gray-300 border border-border rounded-full shadow-md flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-[right,background-color] duration-200"
          :class="isEnlarged ? 'xl:right-10 right-0' : 'xl:right-42 right-0'"
          :title="t('common.next')"
          @click="emit('go-next')"
        >
          <ChevronRight class="w-5 h-5" />
        </button>

        <div
          class="bg-primary text-primary-foreground px-6 py-2 flex items-center justify-between text-sm shrink-0"
        >
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="p-1 hover:bg-white/20 rounded transition"
              :title="t('common.backToList')"
              @click="attemptClose"
            >
              <ArrowLeft class="w-5 h-5" />
            </button>
            <span>{{ bannerLabel }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="statusLabel || isEditMode" class="flex items-center gap-1 text-yellow-200">
              <PenLine class="w-4 h-4" />
              {{ statusLabel ?? t('common.editMode') }}
            </span>
            <span v-else class="flex items-center gap-1">
              <Check class="w-4 h-4" />
              {{ t('common.saved') }}
            </span>
            <button
              type="button"
              class="p-1 hover:bg-white/20 rounded transition"
              :title="isEnlarged ? t('common.reduce') : t('common.enlarge')"
              @click="isEnlarged = !isEnlarged"
            >
              <Minimize2 v-if="isEnlarged" class="w-4 h-4" />
              <Maximize2 v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="isLoading" class="flex-1 flex items-center justify-center">
          <LoadingSpinner :text="t('common.loading')" :size="24" />
        </div>

        <div v-else-if="errorMsg" class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <p class="text-destructive text-lg mb-4">{{ errorMsg }}</p>
            <button
              type="button"
              class="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition"
              @click="attemptClose"
            >
              {{ t('common.backToList') }}
            </button>
          </div>
        </div>

        <template v-else-if="hasData">
          <div class="flex flex-1 overflow-x-visible overflow-y-hidden min-h-0 relative">
            <nav
              class="shrink-0 flex flex-col bg-muted/40 overflow-y-auto"
              :style="{ width: `${sidebarWidth}px` }"
              :aria-label="t('common.card.recordList')"
            >
              <div class="py-2">
                <p class="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">
                  {{ t('common.card.numberShort') }}
                </p>
                <button
                  v-for="item in sidebarItems"
                  :key="item.no"
                  type="button"
                  :title="item.label ?? item.no"
                  class="block w-full text-left px-3 py-1.5 text-sm transition truncate"
                  :class="
                    item.no === currentNo
                      ? 'bg-accent text-primary font-semibold'
                      : 'text-primary hover:bg-accent hover:underline'
                  "
                  @click="emit('select-sidebar', item.no)"
                >
                  {{ item.no }}
                </button>
              </div>
            </nav>

            <div
              role="separator"
              :aria-label="t('common.card.resizeList')"
              class="shrink-0 w-1 cursor-col-resize border-r border-border bg-border/50 hover:bg-primary/30 transition-colors flex items-stretch"
              @mousedown="onResizeStart"
            />

            <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div v-if="!hideTitleBar" class="bg-card border-b border-border px-6 py-1 shrink-0">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <h1 class="text-2xl font-semibold text-card-foreground">
                      <template v-if="titleSuffix !== null">
                        <span class="text-primary">{{ pageNumber }}</span
                        ><span>{{ titleSuffix }}</span>
                      </template>
                      <template v-else>{{ pageTitle }}</template>
                    </h1>
                    <slot name="title-badges" />
                  </div>
                  <div class="flex items-center gap-2">
                    <template v-if="isEditMode">
                      <button
                        v-if="canSave"
                        type="button"
                        :disabled="isSaving || actionsDisabled"
                        class="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-primary rounded hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        @click="emit('save')"
                      >
                        <LoaderCircle v-if="isSaving" class="animate-spin w-4 h-4" />
                        <Check v-else class="w-4 h-4" />
                        {{ isSaving ? t('common.saving') : t('common.save') }}
                      </button>
                      <button
                        type="button"
                        :disabled="isSaving || actionsDisabled"
                        class="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-card-foreground border border-border rounded hover:bg-accent transition disabled:opacity-50"
                        @click="emit('cancel-edit')"
                      >
                        <X class="w-4 h-4" />
                        {{ t('common.cancel') }}
                      </button>
                    </template>
                    <template v-else>
                      <button
                        v-if="showEdit"
                        type="button"
                        :disabled="isLoading || actionsDisabled"
                        class="p-2 text-primary hover:bg-accent rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                        :title="t('common.edit')"
                        @click="emit('enter-edit')"
                      >
                        <PenLine class="w-5 h-5" />
                      </button>
                      <button
                        v-if="showTitleNewButton"
                        type="button"
                        :disabled="isLoading || actionsDisabled"
                        class="p-2 text-primary hover:bg-accent rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                        :title="t('common.create')"
                        @click="emit('create')"
                      >
                        <Plus class="w-5 h-5" />
                      </button>
                    </template>
                  </div>
                </div>

                <div
                  v-if="saveError"
                  class="mt-3 px-4 py-2 bg-destructive border border-destructive/30 rounded text-sm text-white flex items-start gap-2"
                >
                  <CircleAlert class="w-4 h-4 shrink-0 mt-0.5" />
                  <span class="flex-1 min-w-0 wrap-break-word">{{ saveError }}</span>
                  <button
                    type="button"
                    class="shrink-0 p-1 rounded hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    :title="t('common.close')"
                    :aria-label="t('common.close')"
                    @click="emit('clear-save-error')"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </div>
                <div
                  v-if="saveSuccess"
                  class="mt-3 px-4 py-2 bg-green-50 border border-green-200 rounded text-sm text-green-700 flex items-center gap-2"
                >
                  <Check class="w-4 h-4 shrink-0" />
                  {{ saveSuccessMessage ?? t('common.savedSuccess') }}
                </div>
              </div>

              <div
                v-if="!hideActionBar && $slots['action-buttons']"
                class="bg-card border-b border-border px-6 py-2 flex items-center gap-2 flex-wrap shrink-0"
              >
                <slot name="action-buttons" />
              </div>

              <div class="flex-1 min-h-0 overflow-hidden px-2 flex flex-col">
                <slot name="form" />
              </div>
            </div>

            <button
              v-if="hasPrev"
              type="button"
              class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-10 h-10 bg-gray-300 border border-border rounded-full shadow-md flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition"
              :style="{ left: `${sidebarWidth}px` }"
              :title="t('common.previous')"
              @click="emit('go-prev')"
            >
              <ChevronLeft class="w-5 h-5" />
            </button>
          </div>
        </template>
      </div>
    </div>

    <ConfirmDialog
      :open="showUnsavedDiscardDialog"
      :title="t('common.unsavedChangesTitle')"
      :message="t('common.unsavedChangesMessage')"
      :confirm-label="t('common.unsavedChangesDiscard')"
      :cancel-label="t('common.unsavedChangesStay')"
      @confirm="confirmLeaveWithoutSaving"
      @cancel="showUnsavedDiscardDialog = false"
    />
  </Teleport>
</template>

<style scoped>
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--color-muted);
}
::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-muted-foreground);
}
</style>
