<template>
  <ListPageLayout
    title="Sites & géofences"
    subtitle="Référentiel des sites géographiques UCODIS"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} site(s)`"
    search-placeholder="Rechercher par code ou nom…"
    scope-label="Statut :"
    :scope-options="scopeOptions"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(s) => openCard((s as SiteReseau).id)"
  >
    <template #header-actions>
      <button :class="L.btnPrimary" @click="openCreate"><Plus class="w-4 h-4" /> Nouveau site</button>
    </template>

    <template #above-table>
      <div class="grid grid-cols-3 gap-2.5 mb-3.5">
        <div :class="L.kpiItem"><div :class="[L.kpiItemIcon, 'bg-primary/10']"><MapPinned class="w-[18px] h-[18px] text-primary" /></div><div><div :class="L.kpiItemVal">{{ store.sites.length }}</div><div :class="L.kpiItemLbl">Total sites</div></div></div>
        <div :class="L.kpiItem"><div :class="[L.kpiItemIcon, 'bg-success-bg']"><Check class="w-[18px] h-[18px] text-success" /></div><div><div :class="L.kpiItemVal">{{ store.actifs.length }}</div><div :class="L.kpiItemLbl">Actifs</div></div></div>
        <div :class="L.kpiItem"><div :class="[L.kpiItemIcon, 'bg-primary/10']"><MapPinned class="w-[18px] h-[18px] text-primary" /></div><div><div :class="L.kpiItemVal">{{ uniqueTypes }}</div><div :class="L.kpiItemLbl">Types</div></div></div>
      </div>
    </template>

    <template #filters>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Type</label>
        <SearchableDropdown v-model="filterType" :items="optType" placeholder="Tous" compact />
      </div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer text-left hover:text-primary" @click="resetFilters">Réinitialiser</button>
    </template>

    <template #cell-code="{ item }">
      <span class="text-[11px] font-bold px-[7px] py-0.5 rounded bg-primary/10 text-primary tracking-[0.04em] font-mono">{{ item.code }}</span>
    </template>
    <template #cell-nom="{ item }">
      <button class="font-medium text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer text-left" @click.stop="openCard(item.id)">{{ item.nom }}</button>
    </template>
    <template #cell-ville="{ item }"><span class="text-muted-foreground text-xs">{{ item.ville }}</span></template>
    <template #cell-type="{ item }"><span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="typeBadge(item.type)">{{ item.type }}</span></template>
    <template #cell-statut="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="item.actif ? 'bg-success-bg text-success' : 'bg-background text-muted-foreground border border-border'">
        {{ item.actif ? 'Actif' : 'Inactif' }}
      </span>
    </template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-bold px-[7px] py-0.5 rounded bg-primary/10 text-primary tracking-[0.04em] font-mono">{{ item.code }}</span>
          <div class="text-sm font-semibold text-foreground mt-1.5">{{ item.nom }}</div>
          <div class="text-xs text-muted-foreground">{{ item.ville }}{{ item.region ? ` · ${item.region}` : '' }}</div>
        </div>
        <div class="flex gap-2 flex-wrap">
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="typeBadge(item.type)">{{ item.type }}</span>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="item.actif ? 'bg-success-bg text-success' : 'bg-background text-muted-foreground border border-border'">
            {{ item.actif ? 'Actif' : 'Inactif' }}
          </span>
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="openCard(item.id)">Ouvrir la fiche</button>
        <button :class="L.btnOutline" class="w-full justify-center" @click="openEdit(item.id)">Modifier</button>
      </div>
    </template>

    <template #empty>
      <MapPinned class="w-8 h-8" />
      <p class="text-[13px]">Aucun site trouvé</p>
    </template>

    <SiteCard v-if="openCardId !== null" :sites="filtered" :site-id="openCardId" @close="openCardId = null" />
    <SiteFormModal v-model="showCreate" :edit-id="editId" @saved="editId = undefined" />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Check, MapPinned, Plus } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import SiteCard from '../../components/flotte/SiteCard.vue'
import SiteFormModal from '../../components/flotte/SiteFormModal.vue'
import { useSitesStore } from '../../stores/sites'
import type { SiteReseau, TypeSiteReseau } from '../../types'
import * as L from '../../lib/listClasses'

const store = useSitesStore()

const showCreate = ref(false)
const editId = ref<string | undefined>(undefined)
const openCardId = ref<string | null>(null)
const searchQuery = ref('')
const activeScope = ref('')
const filterType = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSize = ref(15)

function openCreate() { editId.value = undefined; showCreate.value = true }
function openEdit(id: string) { editId.value = id; showCreate.value = true }
function openCard(id: string) { openCardId.value = id }

const scopeOptions = [
  { value: '', label: 'Tous' },
  { value: 'actif', label: 'Actifs' },
  { value: 'inactif', label: 'Inactifs' },
]

const columns = computed<ListColumn[]>(() => [
  { key: 'code', label: 'Code', sortable: true, hideable: false, width: 110 },
  { key: 'nom', label: 'Nom', sortable: true, width: 220 },
  { key: 'ville', label: 'Ville', width: 150 },
  { key: 'type', label: 'Type', sortable: true, width: 170 },
  { key: 'statut', label: 'Statut', sortable: true, width: 110 },
])

const uniqueTypes = computed(() => new Set(store.sites.map(s => s.type)).size)

watch([activeScope, filterType, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; filterType.value = ''; searchQuery.value = ''; page.value = 1 }

const filtered = computed(() => {
  let rows = store.sites.filter(s => {
    if (activeScope.value === 'actif' && !s.actif) return false
    if (activeScope.value === 'inactif' && s.actif) return false
    if (filterType.value && s.type !== filterType.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!s.code.toLowerCase().includes(q) && !s.nom.toLowerCase().includes(q)) return false
    }
    return true
  })
  if (sortKey.value) {
    const k = sortKey.value as keyof SiteReseau
    rows = [...rows].sort((a, b) => {
      const cmp = String(a[k] ?? '').localeCompare(String(b[k] ?? ''))
      return sortDir.value === 'asc' ? cmp : -cmp
    })
  }
  return rows
})

const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })

const TYPE_BADGE: Record<TypeSiteReseau, string> = {
  'Dépôt': 'bg-primary/10 text-primary', 'Entrepôt client': 'bg-success-bg text-success',
  'Zone à risque': 'bg-danger-bg text-danger', 'Point de contrôle': 'bg-info-bg text-info', 'Relais': 'bg-warning-bg text-warning',
}
function typeBadge(t: TypeSiteReseau) { return TYPE_BADGE[t] ?? 'bg-background text-muted-foreground' }

const optType: DropdownItem[] = [
  { id: 'Dépôt', label: 'Dépôt' },
  { id: 'Entrepôt client', label: 'Entrepôt client' },
  { id: 'Zone à risque', label: 'Zone à risque' },
  { id: 'Point de contrôle', label: 'Point de contrôle' },
  { id: 'Relais', label: 'Relais' },
]
</script>
