<script setup lang="ts" generic="T extends Record<string, any>">
/**
 * ListPageLayout · contenu de page liste partagé. Repris tel quel des
 * autres projets bâtis sur le socle FMS pour que les trois applications se manipulent
 * de la même façon.
 *
 * Toolbar style frontdesk : `sous-liste | recherche (collapsible) | actions
 * contextuelles | filtre/aperçu/colonnes`, séparée par des traits verticaux.
 * - sélection de ligne (clic) ; **double-clic → `open-card`** ;
 * - actions contextuelles via `#row-actions` (visible si une ligne est sélectionnée) ;
 * - **aperçu rapide** via le toggle « i » → panneau `#details-panel` à droite ;
 * - colonnes : masquer / **épingler (sticky)** / **réordonner par glisser** ;
 * - tri, pagination, dropdown de sous-listes.
 *
 * La VUE fournit `items` (page déjà filtrée/triée/paginée) + le contenu via slots.
 */
import { computed, ref, watch, nextTick, useSlots, onMounted, onBeforeUnmount, type Component } from 'vue'
import {
  Search, Funnel, Columns3, Info, X, GripVertical, Pin, PinOff, ChevronDown,
  ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, Inbox,
} from '@lucide/vue'
import * as L from '../../lib/listClasses'

export interface ListColumn {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  hideable?: boolean
  pinnable?: boolean
  width?: number | string
}

const DEFAULT_COL_W = 160

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    columns: ListColumn[]
    items: T[]
    rowKey?: string
    total?: number
    totalText?: string
    pageSizeOptions?: number[]
    showSearch?: boolean
    searchPlaceholder?: string
    loading?: boolean
    hidePagination?: boolean
    scopeLabel?: string
    scopeOptions?: { value: string; label: string }[]
    /** Modes d'affichage (liste / hiérarchique / organigramme…) → boutons de bascule dans la toolbar */
    viewModes?: { value: string; label: string; icon: Component }[]
    /** Valeur du mode "liste" (table intégrée). Les autres modes utilisent le slot #custom-view */
    listMode?: string
  }>(),
  {
    rowKey: 'id',
    total: 0,
    pageSizeOptions: () => [10, 25, 50],
    showSearch: true,
    searchPlaceholder: 'Rechercher…',
    loading: false,
    hidePagination: false,
    scopeOptions: () => [],
    viewModes: () => [],
    listMode: 'list',
  },
)

const emit = defineEmits<{
  'reset-filters': []
  /** Double-clic sur une ligne → ouverture de la fiche */
  'open-card': [item: T]
  /** Ligne sélectionnée (ou null) */
  select: [item: T | null]
}>()

const slots = useSlots()

/* ── v-model partagés avec la vue ───────────────────────────── */
const searchQuery = defineModel<string>('searchQuery', { default: '' })
const sortKey = defineModel<string>('sortKey', { default: '' })
const sortDir = defineModel<'asc' | 'desc'>('sortDir', { default: 'asc' })
const page = defineModel<number>('page', { default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 10 })
const scope = defineModel<string>('scope', { default: '' })
const viewMode = defineModel<string>('viewMode', { default: 'list' })

/* ── Modes d'affichage ──────────────────────────────────────── */
const hasViewModes = computed(() => props.viewModes.length > 0)
const isListMode = computed(() => !hasViewModes.value || viewMode.value === props.listMode)

/* ── Slots disponibles ──────────────────────────────────────── */
const hasFilters = computed(() => !!slots.filters)
const hasRowActions = computed(() => !!slots['row-actions'])
const hasDetailsPanel = computed(() => !!slots['details-panel'])

/* ── Panneaux toolbar ───────────────────────────────────────── */
const showFilters = ref(false)
const showColumns = ref(false)
const showScope = ref(false)
const showDetailsPanel = ref(false)
const searchExpanded = ref(false)
const colsBtnRef = ref<HTMLElement | null>(null)
const colsDropRef = ref<HTMLElement | null>(null)
const scopeWrapRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const hasScopeDropdown = computed(() => props.scopeOptions.length > 0)
const currentScopeLabel = computed(
  () => props.scopeOptions.find(o => o.value === scope.value)?.label ?? props.scopeOptions[0]?.label ?? '',
)
function selectScope(value: string) { scope.value = value; showScope.value = false }

function toggleSearch() {
  searchExpanded.value = !searchExpanded.value
  if (searchExpanded.value) nextTick(() => searchInputRef.value?.focus())
  else searchQuery.value = ''
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (showColumns.value && colsDropRef.value && !colsDropRef.value.contains(target) && colsBtnRef.value && !colsBtnRef.value.contains(target)) {
    showColumns.value = false
  }
  if (showScope.value && scopeWrapRef.value && !scopeWrapRef.value.contains(target)) {
    showScope.value = false
  }
}
onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))

/* ── État d'affichage des colonnes (ordre / masquées / épinglées) ── */
const order = ref<string[]>(props.columns.map(c => c.key))
const hidden = ref<Set<string>>(new Set())
const pinned = ref<Set<string>>(new Set())

watch(
  () => props.columns.map(c => c.key).join('|'),
  (keysStr) => {
    const keys = keysStr ? keysStr.split('|') : []
    order.value = keys
    hidden.value = new Set([...hidden.value].filter(k => keys.includes(k)))
    pinned.value = new Set([...pinned.value].filter(k => keys.includes(k)))
  },
)

const colByKey = computed(() => new Map(props.columns.map(c => [c.key, c])))
const orderedColumns = computed(() =>
  order.value.map(k => colByKey.value.get(k)).filter((c): c is ListColumn => !!c),
)
const visibleOrdered = computed(() => orderedColumns.value.filter(c => !hidden.value.has(c.key)))
const renderColumns = computed(() => [
  ...visibleOrdered.value.filter(c => pinned.value.has(c.key)),
  ...visibleOrdered.value.filter(c => !pinned.value.has(c.key)),
])
const stickyCount = computed(() => visibleOrdered.value.filter(c => pinned.value.has(c.key)).length)

function colWidth(col: ListColumn): number {
  const w = col.width
  if (w == null) return DEFAULT_COL_W
  if (typeof w === 'number') return w
  const m = String(w).match(/(\d+)/)
  return m ? Number(m[1]) : DEFAULT_COL_W
}
const stickyLeftOffsets = computed(() => {
  const offs: number[] = []
  let acc = 0
  for (let i = 0; i < stickyCount.value; i++) { offs.push(acc); acc += colWidth(renderColumns.value[i]!) }
  return offs
})

function isHideable(col: ListColumn): boolean { return col.hideable !== false }
function isPinnable(col: ListColumn): boolean { return col.pinnable !== false }
function toggleColumn(key: string) {
  const next = new Set(hidden.value)
  if (next.has(key)) next.delete(key); else next.add(key)
  hidden.value = next
}
function togglePin(key: string) {
  const next = new Set(pinned.value)
  if (next.has(key)) next.delete(key); else next.add(key)
  pinned.value = next
}
function resetColumns() {
  order.value = props.columns.map(c => c.key)
  hidden.value = new Set()
  pinned.value = new Set()
}

/* ── Réordonnancement par glisser (clé→clé) ─────────────────── */
const dragKey = ref<string | null>(null)
const dragOverKey = ref<string | null>(null)
function onDragStart(key: string) { dragKey.value = key }
function onDragOver(e: DragEvent, key: string) { e.preventDefault(); dragOverKey.value = key }
function onDragEnd() { dragKey.value = null; dragOverKey.value = null }
function onDrop(targetKey: string) {
  const from = dragKey.value
  onDragEnd()
  if (!from || from === targetKey) return
  const o = [...order.value]
  const fi = o.indexOf(from)
  const ti = o.indexOf(targetKey)
  if (fi < 0 || ti < 0) return
  o.splice(ti, 0, o.splice(fi, 1)[0]!)
  order.value = o
}

/* ── Tri ────────────────────────────────────────────────────── */
function toggleSort(col: ListColumn) {
  if (!col.sortable) return
  if (sortKey.value === col.key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = col.key; sortDir.value = 'asc' }
}
function sortIcon(key: string): Component {
  if (sortKey.value !== key) return ArrowUpDown
  return sortDir.value === 'asc' ? ArrowUp : ArrowDown
}

/* ── Cellules ───────────────────────────────────────────────── */
function hasCellSlot(key: string): boolean { return !!slots[`cell-${key}`] }
function cellAlign(col: ListColumn): string {
  if (col.align === 'right') return 'text-right'
  if (col.align === 'center') return 'text-center'
  return ''
}

/* ── Sélection de ligne ─────────────────────────────────────── */
/**
 * Identifiant de ligne. Une ligne dont la clé vaut undefined rend toutes
 * les lignes indistinguables : la sélection s'applique alors au tableau
 * entier et l'aperçu affiche toujours la première ligne. Le défaut est
 * silencieux à l'exécution, il est donc signalé en développement.
 */
function rowId(item: T): string | number {
  const v = item[props.rowKey] as string | number | undefined
  if (import.meta.env.DEV && v == null) {
    console.warn(
      `[ListPageLayout] Les lignes n'ont pas de propriété « ${props.rowKey} ». `
      + `Passez row-key avec le nom d'un champ unique, sinon la sélection `
      + `portera sur toutes les lignes à la fois.`,
    )
  }
  return v as string | number
}
const selectedKey = ref<string | number | null>(null)
const selectedItem = computed<T | null>(() =>
  selectedKey.value == null
    ? null
    : props.items.find(i => rowId(i) === selectedKey.value) ?? null)
function isSelected(item: T): boolean {
  const k = rowId(item)
  return k != null && selectedKey.value === k
}
function selectRow(item: T) {
  selectedKey.value = rowId(item)
  emit('select', item)
  // Auto-ouvrir le panneau d'aperçu dès qu'une ligne est sélectionnée
  if (hasDetailsPanel.value) showDetailsPanel.value = true
}
function openCard(item: T) { emit('open-card', item) }

// Réinitialiser la sélection si la ligne disparaît (changement de page/filtre)
watch(() => props.items, (items) => {
  if (selectedKey.value != null && !items.some(i => rowId(i) === selectedKey.value)) {
    selectedKey.value = null
    emit('select', null)
  }
})

/* ── Pagination ─────────────────────────────────────────────── */
const totalPages = computed(() => Math.max(1, Math.ceil((props.total || 0) / pageSize.value)))
const totalText = computed(() => props.totalText ?? `${props.total} élément(s)`)
function goToPage(p: number) { page.value = Math.min(Math.max(1, p), totalPages.value) }

/* ── Ombre sticky au défilement horizontal ──────────────────── */
const scrolledX = ref(false)
function onTableScroll(e: Event) { scrolledX.value = (e.currentTarget as HTMLElement).scrollLeft > 0 }

function stickyStyle(index: number): Record<string, string> | undefined {
  if (index >= stickyCount.value) return undefined
  return { position: 'sticky', left: `${stickyLeftOffsets.value[index] ?? 0}px`, zIndex: '3' }
}

const sep = 'w-px h-5 bg-border shrink-0'
</script>

<template>
  <div class="px-7 py-6">

    <!-- En-tête de page -->
    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">{{ title }}</div>
        <div v-if="subtitle" :class="L.pageSub">{{ subtitle }}</div>
      </div>
      <slot name="header-actions" />
    </div>

    <!-- Contenu optionnel au-dessus de la table (ex. bandeau de KPIs) -->
    <slot name="above-table" />

    <!-- Carte tableau -->
    <div :class="L.tableCard">

      <!-- Toolbar -->
      <div :class="L.toolbar">
        <!-- Gauche : sous-liste | recherche | actions contextuelles -->
        <div class="flex items-center gap-2.5 min-w-0">
          <!-- Portée -->
          <div v-if="scopeLabel || hasScopeDropdown" class="text-[13px] font-medium text-foreground flex items-center gap-1 whitespace-nowrap">
            <span v-if="scopeLabel">{{ scopeLabel }}</span>
            <div v-if="hasScopeDropdown" ref="scopeWrapRef" class="relative">
              <button type="button" class="bg-transparent border-0 cursor-pointer text-[13px] font-semibold text-primary inline-flex items-center gap-[3px] p-0" :aria-expanded="showScope" @click="showScope = !showScope">
                {{ currentScopeLabel }} <ChevronDown class="w-3.5 h-3.5" />
              </button>
              <div v-show="showScope" class="absolute left-0 top-[calc(100%+4px)] z-[200] min-w-[180px] w-max bg-card border border-border rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12)] py-1 flex flex-col" role="listbox">
                <button
                  v-for="opt in scopeOptions" :key="opt.value" type="button" role="option" :aria-selected="scope === opt.value"
                  class="w-full text-left px-3 py-2 text-[13px] transition-colors hover:bg-background"
                  :class="scope === opt.value ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'"
                  @click="selectScope(opt.value)"
                >{{ opt.label }}</button>
              </div>
            </div>
            <slot v-else name="scope" />
          </div>

          <div v-if="(scopeLabel || hasScopeDropdown) && showSearch" :class="sep" aria-hidden="true" />

          <!-- Recherche collapsible -->
          <div v-if="showSearch" class="flex items-center">
            <button :class="[L.tbIconBtn, searchExpanded && L.tbIconBtnActive]" title="Rechercher" @click="toggleSearch">
              <Search class="w-3.5 h-3.5" />
            </button>
            <div class="overflow-hidden transition-[max-width] duration-200 ease-out" :class="searchExpanded ? 'max-w-[260px]' : 'max-w-0'">
              <div class="pl-2">
                <div :class="L.searchBox">
                  <input ref="searchInputRef" v-model="searchQuery" type="text" :placeholder="searchPlaceholder" :class="L.searchInput" />
                  <button v-if="searchQuery" class="text-muted-foreground hover:text-foreground" @click="searchQuery = ''"><X class="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions contextuelles (ligne sélectionnée) -->
          <template v-if="hasRowActions && selectedItem">
            <div :class="sep" aria-hidden="true" />
            <div class="flex items-center gap-1.5">
              <slot name="row-actions" :item="selectedItem" />
            </div>
          </template>
        </div>

        <!-- Droite : modes d'affichage | filtre | aperçu | colonnes | actions d'en-tête -->
        <div class="flex items-center gap-1.5">
          <!-- Bascule de mode d'affichage -->
          <div v-if="hasViewModes" class="flex items-center gap-0.5 border border-border rounded-md p-0.5">
            <button
              v-for="m in viewModes" :key="m.value" type="button" :title="m.label"
              class="px-2 py-1 rounded inline-flex items-center gap-1 text-xs cursor-pointer transition-colors"
              :class="viewMode === m.value ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'"
              @click="viewMode = m.value"
            >
              <component :is="m.icon" class="w-3.5 h-3.5" />
            </button>
          </div>
          <div v-if="hasViewModes" :class="sep" aria-hidden="true" />

          <slot name="toolbar-actions" />
          <button v-if="hasFilters" :class="[L.tbIconBtn, showFilters && L.tbIconBtnActive]" title="Filtres" @click="showFilters = !showFilters">
            <Funnel class="w-3.5 h-3.5" />
          </button>
          <button v-if="hasDetailsPanel && isListMode" :class="[L.tbIconBtn, showDetailsPanel && L.tbIconBtnActive]" title="Aperçu rapide" @click="showDetailsPanel = !showDetailsPanel">
            <Info class="w-3.5 h-3.5" />
          </button>
          <button v-if="isListMode" ref="colsBtnRef" :class="[L.tbIconBtn, showColumns && L.tbIconBtnActive]" title="Colonnes" @click="showColumns = !showColumns">
            <Columns3 class="w-3.5 h-3.5" />
          </button>
          <slot name="header-actions-inline" />
        </div>
      </div>

      <!-- Corps : panneau filtres + table + aperçu -->
      <div class="flex relative">

        <!-- Panneau de filtres -->
        <div v-if="hasFilters && showFilters" :class="L.filterPanel">
          <div class="flex items-center justify-between">
            <span class="text-[13px] font-semibold">Filtres</span>
            <button class="bg-transparent border-0 cursor-pointer text-muted-foreground leading-none" @click="showFilters = false">
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
          <slot name="filters" :close="() => (showFilters = false)" :reset="() => emit('reset-filters')" />
        </div>

        <!-- Sélecteur de colonnes -->
        <div v-if="showColumns" ref="colsDropRef" class="absolute top-0 right-0 z-[200] w-[280px] bg-card border border-border rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12)] py-2">
          <div class="text-[11px] font-semibold text-muted-foreground px-3.5 pt-1 pb-2 tracking-[0.05em]">COLONNES</div>
          <div class="px-1 max-h-[60vh] overflow-y-auto">
            <div
              v-for="col in orderedColumns" :key="col.key"
              class="flex items-center gap-2 px-2.5 py-[5px] rounded group hover:bg-background"
              :class="{ 'ring-1 ring-primary ring-inset bg-primary/5': dragOverKey === col.key && dragKey }"
              @dragover="onDragOver($event, col.key)" @drop="onDrop(col.key)"
            >
              <span draggable="true" class="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground" :class="{ 'opacity-40': dragKey === col.key }" @dragstart="onDragStart(col.key)" @dragend="onDragEnd">
                <GripVertical class="w-3.5 h-3.5" />
              </span>
              <label class="flex-1 min-w-0 text-[13px] flex items-center gap-1.5 cursor-pointer" @click.stop>
                <input type="checkbox" class="accent-primary" :checked="!hidden.has(col.key)" :disabled="!isHideable(col)" @change="toggleColumn(col.key)" />
                <span class="truncate">{{ col.label }}</span>
              </label>
              <button
                v-if="!hidden.has(col.key) && isPinnable(col)" type="button"
                class="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] transition-colors"
                :class="pinned.has(col.key) ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-background hover:text-foreground'"
                :title="pinned.has(col.key) ? 'Libérer' : 'Figer'" @click.stop="togglePin(col.key)"
              >
                <PinOff v-if="pinned.has(col.key)" class="w-3 h-3" /><Pin v-else class="w-3 h-3" />
                {{ pinned.has(col.key) ? 'Figé' : 'Figer' }}
              </button>
            </div>
          </div>
          <div class="border-t border-border mt-1 pt-1 px-1">
            <button type="button" class="w-full text-left px-2.5 py-1.5 text-[13px] text-muted-foreground rounded hover:bg-background hover:text-foreground" @click="resetColumns">
              Réinitialiser les colonnes
            </button>
          </div>
        </div>

        <!-- Table (mode liste) -->
        <div v-if="isListMode" class="flex-1 min-w-0 overflow-x-auto" :class="{ 'lpl-scrolled': scrolledX }" @scroll="onTableScroll">
          <table v-if="loading || items.length > 0" :class="L.table" class="table-fixed">
            <colgroup>
              <col v-for="col in renderColumns" :key="col.key" :style="{ width: colWidth(col) + 'px' }" />
            </colgroup>
            <thead>
              <tr>
                <th
                  v-for="(col, ci) in renderColumns" :key="col.key"
                  :class="[L.th, cellAlign(col), !col.sortable && 'cursor-default hover:bg-primary/10', ci < stickyCount && 'lpl-sticky-th', ci === stickyCount - 1 && 'lpl-sticky-last']"
                  :style="stickyStyle(ci)"
                  @click="toggleSort(col)" @dragover="onDragOver($event, col.key)" @drop="onDrop(col.key)"
                >
                  <div class="flex items-center gap-1.5">
                    <span draggable="true" class="shrink-0 cursor-grab active:cursor-grabbing text-foreground/30 hover:text-foreground/60" :class="{ 'opacity-40': dragKey === col.key }" title="Déplacer la colonne" @click.stop @dragstart="onDragStart(col.key)" @dragend="onDragEnd">
                      <GripVertical class="w-3 h-3" />
                    </span>
                    <span class="truncate">{{ col.label }}</span>
                    <span v-if="col.sortable" class="ml-auto shrink-0">
                      <component :is="sortIcon(col.key)" class="w-3 h-3" :class="sortKey === col.key ? 'text-primary' : 'text-foreground/30'" />
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td :colspan="renderColumns.length" class="px-3 py-10 text-center text-muted-foreground text-[13px]">Chargement…</td>
              </tr>
              <tr
                v-else
                v-for="item in items" :key="rowId(item)"
                class="cursor-pointer transition-colors"
                :class="isSelected(item) ? 'bg-primary/10' : 'hover:bg-primary/5'"
                @click="selectRow(item)"
                @dblclick="openCard(item)"
              >
                <td
                  v-for="(col, ci) in renderColumns" :key="col.key"
                  :class="[L.td, cellAlign(col), 'overflow-hidden', ci < stickyCount && 'lpl-sticky', ci === stickyCount - 1 && 'lpl-sticky-last', isSelected(item) && 'lpl-sticky-selected']"
                  :style="stickyStyle(ci)"
                >
                  <slot v-if="hasCellSlot(col.key)" :name="`cell-${col.key}`" :item="item" :value="item[col.key]" />
                  <span v-else class="block truncate">{{ item[col.key] }}</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-else :class="L.emptyState">
            <slot name="empty">
              <Inbox class="w-8 h-8" />
              <p class="text-[13px]">Aucun résultat</p>
            </slot>
          </div>
        </div>

        <!-- Affichage alternatif (hiérarchique / organigramme…) -->
        <div v-else class="flex-1 min-w-0 overflow-auto">
          <slot name="custom-view" />
        </div>

        <!-- Panneau d'aperçu rapide -->
        <div v-if="hasDetailsPanel && showDetailsPanel" class="w-[320px] min-w-[320px] border-l border-border bg-card overflow-y-auto">
          <div class="flex items-center justify-between px-3.5 py-2 border-b border-border">
            <span class="text-[13px] font-semibold text-foreground">Aperçu</span>
            <button class="bg-transparent border-0 cursor-pointer text-muted-foreground leading-none" @click="showDetailsPanel = false"><X class="w-3.5 h-3.5" /></button>
          </div>
          <div v-if="selectedItem" class="p-3.5">
            <slot name="details-panel" :item="selectedItem" />
          </div>
          <div v-else class="p-6 text-center text-[13px] text-muted-foreground">
            Sélectionnez une ligne pour voir l'aperçu
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="!hidePagination && isListMode" :class="L.pagination">
        <span class="flex-1 whitespace-nowrap">{{ totalText }}</span>
        <div class="flex items-center gap-1.5 whitespace-nowrap">
          Par page
          <select v-model.number="pageSize" :class="L.pagSizeSelect">
            <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
        <div class="flex items-center gap-[3px]">
          <button :class="L.pagBtn" :disabled="page <= 1" @click="goToPage(page - 1)"><ChevronLeft class="w-3.5 h-3.5" /></button>
          <button v-for="p in totalPages" :key="p" :class="[L.pagBtn, p === page && L.pagBtnActive]" @click="goToPage(p)">{{ p }}</button>
          <button :class="L.pagBtn" :disabled="page >= totalPages" @click="goToPage(page + 1)"><ChevronRight class="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>

    <!-- Slot par défaut : modales / overlays propres à la vue -->
    <slot />
  </div>
</template>

<style scoped>
/* Fond des cellules épinglées (sticky) synchronisé avec l'état de la ligne */
.lpl-sticky { background: var(--color-card); }
tr:hover .lpl-sticky { background: var(--ucodis-red-light); }
.lpl-sticky-selected { background: var(--ucodis-red-light); }
.lpl-sticky-th { background: var(--color-background); }
.lpl-scrolled .lpl-sticky-last { box-shadow: 2px 0 6px rgba(0, 0, 0, 0.08); }
</style>
