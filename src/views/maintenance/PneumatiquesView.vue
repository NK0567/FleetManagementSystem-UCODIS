<template>
  <ListPageLayout
    title="Pneus"
    :subtitle="`${store.pneus.filter(p => p.statut === 'monte').length} monté(s) · ${store.pneus.filter(p => p.statut === 'stock').length} en stock · ${store.alertes.length} alerte(s) en cours`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} pneu(s)`"
    search-placeholder="N° de série, marque, véhicule…"
    scope-label="Situation :"
    :scope-options="scopeOptions"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(p: any) => ouvrirFiche(p.id)"
  >
    <template #header-actions>
      <button :class="L.btnOutline" @click="reglageOuvert = !reglageOuvert"><Settings2 class="w-4 h-4" /> Seuils</button>
      <button :class="L.btnOutline" @click="planOuvert = !planOuvert"><CircleDot class="w-4 h-4" /> Plan du véhicule</button>
      <button :class="L.btnPrimary" @click="creationOuverte = true"><Plus class="w-4 h-4" /> Nouveau pneu</button>
    </template>

    <template #above-table>
      <ReglageSeuilsPneus v-if="reglageOuvert" class="mb-3.5" />
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem" class="cursor-pointer" @click="activeScope = k.scope">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-4.5 h-4.5" :class="k.iconColor" /></div>
          <div class="min-w-0">
            <p class="text-xl font-bold leading-none truncate">{{ k.value }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">{{ k.label }}</p>
          </div>
        </div>
      </div>

      <!-- Plan d'un véhicule -->
      <div v-if="planOuvert" :class="L.card" class="mb-3.5">
        <div :class="L.cardTitle"><CircleDot class="w-4 h-4 text-primary" /> Plan du véhicule</div>
        <div class="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-5 items-start">
          <div>
            <SearchableDropdown v-model="vehiculePlan" :items="optVehicules" placeholder="Choisir un véhicule…" />
            <div v-if="vehiculePlan" class="relative mx-auto mt-3 bg-background border border-border rounded-lg" style="width: 260px; height: 300px">
              <div class="absolute left-1/2 -translate-x-1/2 border-2 border-border rounded-md bg-card" style="top: 6%; bottom: 6%; width: 34%"></div>
              <p class="absolute top-1 left-2 text-[10px] text-muted-foreground">Avant</p>
              <button v-for="pos in store.planDuVehicule(vehiculePlan)" :key="pos.code"
                class="absolute -translate-x-1/2 -translate-y-1/2 w-9 h-12 rounded-md border-2 text-[11px] font-bold cursor-pointer flex items-center justify-center"
                :class="classePosition(pos.code)" :style="{ left: pos.x + '%', top: pos.y + '%' }"
                :title="titrePosition(pos.code, pos.libelle)" @click="ouvrirPosition(pos.code)">{{ pos.code }}</button>
            </div>
          </div>
          <div v-if="vehiculePlan" class="flex flex-col gap-3">
            <p class="text-[11px] text-muted-foreground">Vert : dans les seuils · orange : rotation à prévoir · rouge : pression ou sculpture hors seuil · pointillé : position libre.</p>
            <div v-if="positionLibre" class="flex gap-2 items-end">
              <div :class="F.field" class="flex-1"><label :class="F.fieldLabel">Monter un pneu en position {{ positionLibre }}</label><SearchableDropdown v-model="pneuAMonter" :items="optStock" placeholder="Pneu en stock…" /></div>
              <button :class="F.btnPrimary" @click="monterEnPosition">Monter</button>
            </div>
            <p v-else class="text-xs text-muted-foreground">Cliquez sur une position occupée pour ouvrir la fiche du pneu, ou sur une position libre pour y monter un pneu du stock.</p>
          </div>
        </div>
      </div>
    </template>

    <template #cell-serie="{ item }"><button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click.stop="ouvrirFiche(item.id)">{{ item.numeroSerie }}</button><div class="text-[11px] text-muted-foreground">{{ item.marque }} · {{ item.taille }}</div></template>
    <template #cell-statut="{ item }"><span class="text-[11px] font-semibold px-2 py-0.5 rounded-full" :class="CLS_STATUT[item.statut]">{{ LIB_STATUT_PNEU[item.statut] }}</span><div class="text-[11px] text-muted-foreground">{{ item.neuf ? 'Neuf' : `Rechapé ${item.nbRechapages} fois` }}</div></template>
    <template #cell-position="{ item }">
      <template v-if="item.statut === 'monte'"><span class="font-mono text-xs">{{ item.vehiculePlaque }}</span><div class="text-[11px] text-muted-foreground">{{ libellePosition(item) }}</div></template>
      <span v-else class="text-muted-foreground">-</span>
    </template>
    <template #cell-releve="{ item }">
      <template v-if="store.dernierReleve(item)"><span class="text-xs">{{ store.dernierReleve(item)!.pressionBar }} bar · {{ store.dernierReleve(item)!.sculptureMm }} mm</span>
        <div v-for="m in store.alertesDe(item)" :key="m" class="text-[11px] font-medium" :class="m.startsWith('Rotation') ? 'text-warning' : 'text-danger'">{{ m }}</div></template>
      <span v-else class="text-muted-foreground">-</span>
    </template>
    <template #cell-km="{ item }"><span class="text-xs">{{ store.kmParcourus(item).toLocaleString('fr-FR') }} km</span></template>
    <template #cell-cpk="{ item }"><span class="text-xs">{{ store.coutParKm(item) != null ? store.coutParKm(item)!.toFixed(1) + ' Ar/km' : '-' }}</span></template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full" :class="CLS_STATUT[item.statut]">{{ LIB_STATUT_PNEU[item.statut] }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.numeroSerie }}</div>
          <div class="text-xs text-muted-foreground">{{ item.marque }} · {{ item.taille }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Position</div>{{ item.statut === 'monte' ? `${item.vehiculePlaque}, ${libellePosition(item)}` : '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Km parcourus</div>{{ store.kmParcourus(item).toLocaleString('fr-FR') }}</div>
          <div><div class="text-muted-foreground text-[11px]">Coût au km</div>{{ store.coutParKm(item) != null ? store.coutParKm(item)!.toFixed(1) + ' Ar' : '-' }}</div>
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Dernier relevé</div>{{ store.dernierReleve(item) ? `${store.dernierReleve(item)!.pressionBar} bar · ${store.dernierReleve(item)!.sculptureMm} mm` : '-' }}</div>
        </div>
        <div v-if="store.alertesDe(item).length" class="flex flex-col gap-0.5">
          <span v-for="m in store.alertesDe(item)" :key="m" class="text-[11px] font-medium" :class="m.startsWith('Rotation') ? 'text-warning' : 'text-danger'">{{ m }}</span>
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirFiche(item.id)">Ouvrir la fiche</button>
      </div>
    </template>

    <template #empty><CircleDot class="w-8 h-8" /><p class="text-sm">Aucun pneu</p></template>
    <PneuCard v-if="ficheId" :pneus="filtered" :pneu-id="ficheId" @close="ficheId = null" @creer="ficheId = null; creationOuverte = true" />
    <PneuFormModal v-if="creationOuverte" @close="creationOuverte = false" @cree="id => { creationOuverte = false; ficheId = id }" />
  </ListPageLayout>
</template>

<script setup lang="ts">
/** Pneumatique, spécificité de la maintenance (FMS-MA-14 à MA-17). */
import { ref, computed, watch } from 'vue'
import { Plus, TriangleAlert, CircleDot, Disc3, Package, Recycle, Settings2 } from '@lucide/vue'
import PneuCard from '../../components/maintenance/PneuCard.vue'
import PneuFormModal from '../../components/maintenance/PneuFormModal.vue'
import ReglageSeuilsPneus from '../../components/maintenance/ReglageSeuilsPneus.vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import { usePneusStore, LIB_STATUT_PNEU, type Pneu, type StatutPneu } from '../../stores/pneus'
import { useVehiculeStore } from '../../stores/vehicules'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const store = usePneusStore()
const reglageOuvert = ref(false)
const vehiculesStore = useVehiculeStore()

const CLS_STATUT: Record<StatutPneu, string> = { stock: 'bg-info-bg text-info', monte: 'bg-success-bg text-success', rechapage: 'bg-warning-bg text-warning', rebut: 'bg-neutral-bg text-neutral' }
const optVehicules = computed<DropdownItem[]>(() => vehiculesStore.liste.map(v => ({ id: v.id, label: v.immatriculation, sublabel: v.type === 'tracteur' ? 'Tracteur' : 'Semi-remorque' })))
const optStock = computed<DropdownItem[]>(() => store.pneus.filter(p => p.statut === 'stock').map(p => ({ id: p.id, label: p.numeroSerie, sublabel: `${p.marque} ${p.taille}` })))
function libellePosition(p: Pneu) { return store.planDuVehicule(p.vehiculeId ?? '').find(x => x.code === p.positionCode)?.libelle ?? `position ${p.positionCode}` }

/* Fiche et création */
const creationOuverte = ref(false)
const ficheId = ref<string | null>(null)
function ouvrirFiche(id: string) { ficheId.value = id }

/* Plan du véhicule */
const vehiculePlan = ref('v-tr-1')
const positionLibre = ref('')
const pneuAMonter = ref('')
watch(vehiculePlan, () => { positionLibre.value = '' })
const pneuEn = (code: string) => store.pneusDuVehicule(vehiculePlan.value).find(p => p.positionCode === code)
function classePosition(code: string) {
  const p = pneuEn(code)
  if (!p) return 'border-dashed border-muted-foreground/50 bg-transparent text-muted-foreground'
  const a = store.alertesDe(p)
  if (a.some(x => !x.startsWith('Rotation'))) return 'border-danger bg-danger-bg text-danger'
  if (a.length) return 'border-warning bg-warning-bg text-warning'
  return 'border-success bg-success-bg text-success'
}
function titrePosition(code: string, libelle: string) { const p = pneuEn(code); return p ? `${libelle} : ${p.numeroSerie}` : `${libelle} : libre` }
function ouvrirPosition(code: string) {
  const p = pneuEn(code)
  if (p) { positionLibre.value = ''; ouvrirFiche(p.id) }
  else positionLibre.value = code
}
function monterEnPosition() {
  if (!pneuAMonter.value) { alert(optStock.value.length ? 'Choisissez un pneu en stock.' : 'Aucun pneu en stock : enregistrez-en un.'); return }
  const res = store.monter(pneuAMonter.value, vehiculePlan.value, positionLibre.value)
  if (!res.ok) { alert(res.motif); return }
  pneuAMonter.value = ''; positionLibre.value = ''
}

/* Liste */
const searchQuery = ref(''); const activeScope = ref(''); const sortKey = ref(''); const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1); const pageSize = ref(20)
const planOuvert = ref(true)
const kpis = computed(() => [
  { label: 'Montés', value: store.pneus.filter(p => p.statut === 'monte').length, scope: 'monte', icon: Disc3, bg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: 'En stock', value: store.pneus.filter(p => p.statut === 'stock').length, scope: 'stock', icon: Package, bg: 'bg-info-bg', iconColor: 'text-info' },
  { label: 'En alerte', value: store.alertes.length, scope: 'alerte', icon: TriangleAlert, bg: 'bg-danger-bg', iconColor: 'text-danger' },
  { label: 'Au rechapage', value: store.pneus.filter(p => p.statut === 'rechapage').length, scope: 'rechapage', icon: Recycle, bg: 'bg-warning-bg', iconColor: 'text-warning' },
])
const scopeOptions = [{ value: '', label: 'Toutes' }, ...Object.entries(LIB_STATUT_PNEU).map(([value, label]) => ({ value, label })), { value: 'alerte', label: 'En alerte' }]
const columns: ListColumn[] = [
  { key: 'serie', label: 'Pneu', width: 200 },
  { key: 'statut', label: 'Situation', width: 140 },
  { key: 'position', label: 'Véhicule et position', width: 190 },
  { key: 'releve', label: 'Dernier relevé', width: 200 },
  { key: 'km', label: 'Km', width: 100 },
  { key: 'cpk', label: 'Coût au km', width: 110 },
]
watch([activeScope, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; searchQuery.value = ''; page.value = 1 }
const filtered = computed(() => store.pneus.filter(p => {
  if (activeScope.value === 'alerte') { if (!store.alertesDe(p).length) return false }
  else if (activeScope.value && p.statut !== activeScope.value) return false
  if (searchQuery.value && !`${p.numeroSerie} ${p.marque} ${p.vehiculePlaque ?? ''} ${p.taille}`.toLowerCase().includes(searchQuery.value.toLowerCase())) return false
  return true
}))
const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
</script>
