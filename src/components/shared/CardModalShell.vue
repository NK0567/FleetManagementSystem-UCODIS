<script setup lang="ts">
/**
 * Coquille générique de fiche en superposition, reprise telle quelle des
 * autres projets bâtis sur le socle FMS : la fiche recouvre la page, la barre sombre reste
 * visible, le contenu est centré.
 *
 * Fournit : overlay téléporté dans #below-topbar, bannière, navigateur de N°
 * redimensionnable à gauche, barre de titre (Edit/Save/Cancel/＋/⋮), barre
 * d'actions (slot), zone de formulaire (slot), navigation prev/next, gestion
 * Escape + confirmation si modifications non enregistrées.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  ArrowLeft, Check, SquarePen, LoaderCircle, X, Plus, EllipsisVertical,
  Maximize2, Minimize2, ChevronLeft, ChevronRight, CircleAlert,
} from '@lucide/vue'
import ConfirmDialog from './ConfirmDialog.vue'

const props = withDefaults(
  defineProps<{
    pageTitle: string
    pageNumber?: string
    bannerLabel: string
    isLoading?: boolean
    errorMsg?: string | null
    hasData?: boolean
    isEditMode: boolean
    isSaving?: boolean
    actionsDisabled?: boolean
    saveError?: string | null
    saveSuccess?: boolean
    saveSuccessMessage?: string
    sidebarItems: { no: string; label?: string }[]
    currentNo: string | null
    hasPrev: boolean
    hasNext: boolean
    showEdit?: boolean
    showTitleNewButton?: boolean
    showTitleOverflowMenu?: boolean
    hideActionBar?: boolean
    statusLabel?: string
    hasUnsavedChanges?: boolean
  }>(),
  {
    isLoading: false,
    errorMsg: null,
    hasData: true,
    isSaving: false,
    actionsDisabled: false,
    saveError: null,
    saveSuccess: false,
    showEdit: true,
    showTitleNewButton: true,
    showTitleOverflowMenu: false,
    hideActionBar: false,
    hasUnsavedChanges: false,
  },
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

const showNumberAsPrimary = computed(
  () => !!props.pageNumber && props.pageTitle.startsWith(props.pageNumber),
)
const titleSuffix = computed(() =>
  showNumberAsPrimary.value ? props.pageTitle.slice(props.pageNumber!.length) : '',
)

function attemptClose() {
  if (!props.hasUnsavedChanges) { emit('close'); return }
  showUnsavedDiscardDialog.value = true
}
function confirmLeaveWithoutSaving() { showUnsavedDiscardDialog.value = false; emit('close') }
function cancelLeaveWithoutSaving() { showUnsavedDiscardDialog.value = false }

const isEnlarged = ref(true)
const toggleEnlarge = () => { isEnlarged.value = !isEnlarged.value }

// Sidebar N° redimensionnable
const SIDEBAR_MIN = 80
const SIDEBAR_MAX = 400
const sidebarWidth = ref(112)
let resizeStartX = 0
let resizeStartW = 0
const onResizeStart = (e: MouseEvent) => {
  resizeStartX = e.clientX
  resizeStartW = sidebarWidth.value
  const onMove = (e2: MouseEvent) => {
    const delta = e2.clientX - resizeStartX
    sidebarWidth.value = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, resizeStartW + delta))
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

const onKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return
  if (showUnsavedDiscardDialog.value) { cancelLeaveWithoutSaving(); return }
  attemptClose()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="#below-topbar" defer>
    <div class="absolute inset-0 z-50 flex">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-md" @click="attemptClose"></div>

      <div
        class="static z-10 flex flex-col h-full w-full bg-card overflow-x-visible overflow-y-hidden transition-[margin] duration-200"
        :class="isEnlarged ? 'lg:mx-12' : 'lg:mx-40'"
      >
        <button
          v-if="hasNext"
          @click="emit('go-next')"
          class="cursor-pointer absolute top-[53%] -translate-y-1/2 z-20 w-9 h-9 bg-card border border-border rounded-full shadow-md flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition right-0 xl:right-6"
          title="Suivant"
        >
          <ChevronRight class="w-5 h-5" />
        </button>

        <!-- Bannière -->
        <div class="bg-primary text-primary-foreground px-6 py-2 flex items-center justify-between text-sm shrink-0">
          <div class="flex items-center gap-2">
            <button @click="attemptClose" class="cursor-pointer p-1 hover:bg-white/20 rounded transition" title="Retour à la liste">
              <ArrowLeft class="w-5 h-5" />
            </button>
            <span>{{ bannerLabel }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="statusLabel" class="flex items-center gap-1 text-yellow-200">
              <SquarePen class="w-4 h-4" /> {{ statusLabel }}
            </span>
            <span v-else-if="isEditMode" class="flex items-center gap-1 text-yellow-200">
              <SquarePen class="w-4 h-4" /> Mode édition
            </span>
            <span v-else class="flex items-center gap-1">
              <Check class="w-4 h-4" /> Enregistré
            </span>
            <button type="button" class="cursor-pointer p-1 hover:bg-white/20 rounded transition" :title="isEnlarged ? 'Réduire' : 'Agrandir'" @click="toggleEnlarge">
              <Minimize2 v-if="isEnlarged" class="w-4 h-4" />
              <Maximize2 v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Chargement -->
        <div v-if="isLoading" class="flex-1 flex items-center justify-center text-muted-foreground">
          <LoaderCircle class="w-6 h-6 animate-spin" />
        </div>

        <!-- Erreur -->
        <div v-else-if="errorMsg" class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <p class="text-destructive text-lg mb-4">{{ errorMsg }}</p>
            <button @click="attemptClose" class="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition">Retour à la liste</button>
          </div>
        </div>

        <!-- Contenu -->
        <template v-else-if="hasData">
          <div class="flex flex-1 overflow-x-visible overflow-y-hidden min-h-0 relative">
            <!-- Navigateur de N° -->
            <div class="shrink-0 flex flex-col bg-background overflow-y-auto" :style="{ width: `${sidebarWidth}px` }" aria-label="Liste des numéros">
              <div class="py-2">
                <p class="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">N°</p>
                <button
                  v-for="item in sidebarItems"
                  :key="item.no"
                  :title="item.label ?? item.no"
                  @click="emit('select-sidebar', item.no)"
                  :class="[
                    'cursor-pointer block w-full text-left px-3 py-1.5 text-sm transition truncate',
                    item.no === currentNo ? 'bg-primary/10 text-primary font-semibold' : 'text-primary hover:bg-primary/5 hover:underline',
                  ]"
                >{{ item.no }}</button>
              </div>
            </div>

            <!-- Poignée de redimensionnement -->
            <div
              role="separator"
              aria-label="Redimensionner la liste"
              class="shrink-0 w-1 cursor-col-resize border-r border-border bg-border/50 hover:bg-primary/30 transition-colors"
              @mousedown="onResizeStart"
            />

            <!-- Fiche -->
            <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
              <!-- Barre de titre -->
              <div class="bg-card border-b border-border px-6 py-2 shrink-0">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <h1 class="text-2xl font-semibold text-card-foreground">
                      <template v-if="showNumberAsPrimary">
                        <span class="text-primary">{{ pageNumber }}</span><span>{{ titleSuffix }}</span>
                      </template>
                      <template v-else>{{ pageTitle }}</template>
                    </h1>
                    <slot name="title-badges" />
                  </div>
                  <div class="flex items-center gap-2">
                    <template v-if="isEditMode">
                      <button
                        @click="emit('save')"
                        :disabled="isSaving || actionsDisabled"
                        class="cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <LoaderCircle v-if="isSaving" class="animate-spin w-4 h-4" />
                        <Check v-else class="w-4 h-4" />
                        {{ isSaving ? 'Enregistrement…' : 'Enregistrer' }}
                      </button>
                      <button
                        @click="emit('cancel-edit')"
                        :disabled="isSaving || actionsDisabled"
                        class="cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-card-foreground border border-border rounded hover:bg-background transition disabled:opacity-50"
                      >
                        <X class="w-4 h-4" /> Annuler
                      </button>
                    </template>
                    <template v-else>
                      <button
                        v-if="showEdit"
                        @click="emit('enter-edit')"
                        :disabled="isLoading || actionsDisabled"
                        class="cursor-pointer p-2 text-primary hover:bg-background rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Modifier"
                      >
                        <SquarePen class="w-5 h-5" />
                      </button>
                      <button
                        v-if="showTitleNewButton"
                        :disabled="isLoading || actionsDisabled"
                        class="cursor-pointer p-2 text-primary hover:bg-background rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Créer"
                        @click="emit('create')"
                      >
                        <Plus class="w-5 h-5" />
                      </button>
                      <template v-if="showTitleOverflowMenu">
                        <div class="border-l border-border h-6 mx-1"></div>
                        <button type="button" class="cursor-pointer p-2 text-primary hover:bg-background rounded transition" title="Plus d'options">
                          <EllipsisVertical class="w-5 h-5" />
                        </button>
                      </template>
                    </template>
                  </div>
                </div>

                <!-- Erreur / succès -->
                <div v-if="saveError" class="mt-3 px-4 py-2 bg-danger border border-danger/30 rounded text-sm text-white flex items-start gap-2">
                  <CircleAlert class="w-4 h-4 shrink-0 mt-0.5" />
                  <span class="flex-1 min-w-0 break-words">{{ saveError }}</span>
                  <button type="button" class="shrink-0 p-1 rounded hover:bg-white/15" title="Fermer" @click="emit('clear-save-error')">
                    <X class="w-4 h-4" />
                  </button>
                </div>
                <div v-if="saveSuccess" class="mt-3 px-4 py-2 bg-success-bg border border-success/30 rounded text-sm text-success flex items-center gap-2">
                  <Check class="w-4 h-4 shrink-0" /> {{ saveSuccessMessage ?? 'Enregistré avec succès' }}
                </div>
              </div>

              <!-- Barre d'actions -->
              <div v-if="!hideActionBar" class="bg-card border-b border-border px-6 py-2 flex items-center gap-2 flex-wrap shrink-0">
                <slot name="action-buttons" />
              </div>

              <!-- Formulaire -->
              <div class="flex-1 overflow-auto px-2">
                <slot name="form" />
              </div>
            </div>

            <!-- Nav précédent -->
            <button
              v-if="hasPrev"
              @click="emit('go-prev')"
              class="cursor-pointer absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-9 h-9 bg-card border border-border rounded-full shadow-md flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition"
              :style="{ left: `${sidebarWidth}px` }"
              title="Précédent"
            >
              <ChevronLeft class="w-5 h-5" />
            </button>
          </div>
        </template>
      </div>
    </div>

    <ConfirmDialog
      :open="showUnsavedDiscardDialog"
      title="Modifications non enregistrées"
      message="Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter sans enregistrer ?"
      confirm-label="Quitter sans enregistrer"
      cancel-label="Rester"
      destructive
      @confirm="confirmLeaveWithoutSaving"
      @cancel="cancelLeaveWithoutSaving"
    />
  </Teleport>
</template>
