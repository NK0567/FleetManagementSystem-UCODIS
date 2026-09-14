<template>
  <ListPageLayout
    title="Ordres de travail"
    :subtitle="`${store.ouverts.length} intervention(s) en cours · ${store.enAttentePiece.length} en attente de pièce`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} ordre(s) de travail`"
    search-placeholder="Référence, plaque, symptôme…"
    scope-label="Statut :"
    :scope-options="scopeOptions"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(o) => openCard((o as OrdreTravail).id)"
  >
    <template #header-actions>
      <button :class="L.btnPrimary" @click="creationOuverte = true"><Plus class="w-4 h-4" /> Déclarer une panne</button>
    </template>

    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-4.5 h-4.5" :class="k.iconColor" /></div>
          <div class="min-w-0">
            <p class="text-xl font-bold leading-none truncate">{{ k.value }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">{{ k.label }}</p>
          </div>
        </div>
      </div>
    </template>

    <template #cell-reference="{ item }">
      <span class="font-mono font-semibold text-foreground">{{ item.reference }}</span>
      <div class="text-[11px] text-muted-foreground">{{ LIB_ORIGINE_OT[item.origine] }}</div>
    </template>

    <template #cell-vehicule="{ item }">
      <span class="font-mono text-xs text-foreground">{{ item.vehiculePlaque }}</span>
      <div class="text-[11px] text-muted-foreground">{{ item.kilometrage ? item.kilometrage.toLocaleString('fr-FR') + ' km' : '-' }}</div>
    </template>

    <template #cell-diagnostic="{ item }">
      <template v-if="item.sousSysteme">
        <span class="text-xs font-medium">{{ LIB_SOUS_SYSTEME[item.sousSysteme] }}</span>
        <div class="text-[11px] text-muted-foreground">{{ item.modeDefaillance ? LIB_MODE_DEFAILLANCE[item.modeDefaillance] : '' }}</div>
      </template>
      <span v-else class="text-[11px] text-warning font-medium">À diagnostiquer</span>
    </template>

    <template #cell-type="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="item.typeMaintenance === 'preventif' ? 'bg-success-bg text-success' : 'bg-info-bg text-info'">
        {{ LIB_TYPE_MAINTENANCE[item.typeMaintenance] }}
      </span>
    </template>

    <template #cell-gravite="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_GRAVITE_OT[item.gravite].cls">{{ LIB_GRAVITE_OT[item.gravite].label }}</span>
    </template>

    <template #cell-statut="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="CLS_STATUT[item.statut]">{{ LIB_STATUT_OT[item.statut] }}</span>
    </template>

    <template #cell-cout="{ item }">
      <span class="text-xs">{{ store.coutOT(item) ? store.coutOT(item).toLocaleString('fr-FR') + ' Ar' : '-' }}</span>
    </template>

    <template #cell-declare="{ item }">
      <span class="text-xs">{{ fmtDateHeure(item.declareLe) }}</span>
    </template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_GRAVITE_OT[item.gravite].cls">{{ LIB_GRAVITE_OT[item.gravite].label }}</span>
            <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="CLS_STATUT[item.statut]">{{ LIB_STATUT_OT[item.statut] }}</span>
          </div>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.reference }}</div>
          <div class="text-xs text-muted-foreground">{{ LIB_ORIGINE_OT[item.origine] }}</div>
        </div>
        <div class="text-xs text-foreground leading-relaxed">{{ item.symptome }}</div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Véhicule</div><span class="font-mono">{{ item.vehiculePlaque }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Déclaré le</div>{{ fmtDateHeure(item.declareLe) }}</div>
          <div class="col-span-2">
            <div class="text-muted-foreground text-[11px]">Diagnostic</div>
            <template v-if="item.sousSysteme">{{ LIB_SOUS_SYSTEME[item.sousSysteme] }}<span v-if="item.modeDefaillance"> - {{ LIB_MODE_DEFAILLANCE[item.modeDefaillance] }}</span></template>
            <span v-else class="text-warning">à établir</span>
          </div>
          <div><div class="text-muted-foreground text-[11px]">Pièces</div>{{ item.pieces.length }}</div>
          <div><div class="text-muted-foreground text-[11px]">Coût</div>{{ store.coutOT(item) ? store.coutOT(item).toLocaleString('fr-FR') + ' Ar' : '-' }}</div>
        </div>
        <div v-if="item.statut === 'attente_piece'" class="bg-warning-bg text-warning rounded-md px-2.5 py-2 text-[11px] leading-snug">
          Le véhicule reste immobilisé tant que la pièce n'est pas réceptionnée.
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="openCard(item.id)">Ouvrir la fiche</button>
      </div>
    </template>

    <template #empty><Wrench class="w-8 h-8" /><p class="text-sm">Aucun ordre de travail</p></template>
  </ListPageLayout>

  <OrdreTravailCard v-if="ficheId" :ordres="store.ordres" :ordre-id="ficheId" @close="ficheId = null" />

  <!-- Déclaration d'une panne -->
  <div v-if="creationOuverte" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4" @click.self="creationOuverte = false">
    <div class="bg-card rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
      <div class="bg-primary px-5 py-3.5 flex items-center justify-between">
        <h3 class="text-white font-semibold">Déclarer une panne</h3>
        <button class="text-white/80 hover:text-white bg-transparent border-0 cursor-pointer" @click="creationOuverte = false"><X class="w-5 h-5" /></button>
      </div>
      <div class="p-5 flex flex-col gap-3.5">
        <div :class="F.field">
          <label :class="F.fieldLabel">Véhicule *</label>
          <SearchableDropdown v-model="formNouvel.vehiculeId" :items="optVehicules" placeholder="Choisir…" />
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">Symptôme constaté *</label>
          <textarea v-model="formNouvel.symptome" rows="3" :class="F.fieldTextarea" placeholder="Ce qui a été observé…"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div :class="F.field">
            <label :class="F.fieldLabel">Gravité *</label>
            <SearchableDropdown v-model="formNouvel.gravite" :items="optGravite" placeholder="Sélectionner…" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Origine</label>
            <SearchableDropdown v-model="formNouvel.origine" :items="optOrigine" placeholder="Sélectionner…" />
          </div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border">
        <button :class="cls.btnOutline" @click="creationOuverte = false">Annuler</button>
        <button :class="cls.btnPrimary" :disabled="!formNouvel.vehiculeId || !formNouvel.symptome.trim()" @click="declarerPanne">Déclarer</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Ordres de travail, repris de la structure du socle FMS
 * (US 3.2.1 à 3.2.5) : déclaration, diagnostic ISO 14224, pièces et
 * main-d'œuvre, clôture. La déclaration ouvre immédiatement une
 * indisponibilité, comme sur le socle FMS.
 */
import { ref, computed, watch } from 'vue'
import { Clock, Coins, PackageSearch, Plus, ShieldCheck, Wrench, X } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import OrdreTravailCard from '../../components/maintenance/OrdreTravailCard.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useVehiculeStore } from '../../stores/vehicules'
import {
  LIB_ORIGINE_OT, LIB_SOUS_SYSTEME, LIB_MODE_DEFAILLANCE, LIB_TYPE_MAINTENANCE, LIB_GRAVITE_OT, LIB_STATUT_OT,
} from '../../types/maintenance'
import type { OrdreTravail, StatutOT, GraviteOT, OrigineOT } from '../../types/maintenance'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'
import * as cls from '../../lib/formClasses'

const store = useMaintenanceStore()
const vehicules = useVehiculeStore()

const ficheId = ref<string | null>(null)
function openCard(id: string) { ficheId.value = id }

const CLS_STATUT: Record<StatutOT, string> = {
  ouvert: 'bg-info-bg text-info', diagnostique: 'bg-primary/10 text-primary',
  attente_piece: 'bg-warning-bg text-warning', en_cours: 'bg-primary/10 text-primary',
  attente_validation: 'bg-warning-bg text-warning', cloture: 'bg-success-bg text-success',
  annule: 'bg-neutral-bg text-neutral',
}

const activeScope = ref('')
const searchQuery = ref('')
const sortKey = ref('declare')
const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = ref(15)

function resetFilters() { activeScope.value = ''; searchQuery.value = ''; page.value = 1 }
watch([activeScope, searchQuery, pageSize], () => { page.value = 1 })

const scopeOptions = [
  { value: '', label: 'Tous les ordres' },
  { value: 'ouverts', label: 'En cours' },
  { value: 'piece', label: 'En attente de pièce' },
  { value: 'cloture', label: 'Clôturés' },
]

const filtered = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return store.ordres.filter(o => {
    if (activeScope.value === 'ouverts' && (o.statut === 'cloture' || o.statut === 'annule')) return false
    if (activeScope.value === 'piece' && o.statut !== 'attente_piece') return false
    if (activeScope.value === 'cloture' && o.statut !== 'cloture') return false
    if (q && !`${o.reference} ${o.vehiculePlaque} ${o.symptome}`.toLowerCase().includes(q)) return false
    return true
  }).sort((a, b) => {
    const dir = sortDir.value === 'asc' ? 1 : -1
    if (sortKey.value === 'declare') return dir * (+new Date(a.declareLe) - +new Date(b.declareLe))
    if (sortKey.value === 'gravite') return dir * (a.gravite.localeCompare(b.gravite))
    if (sortKey.value === 'statut') return dir * (a.statut.localeCompare(b.statut))
    if (sortKey.value === 'vehicule') return dir * (a.vehiculePlaque.localeCompare(b.vehiculePlaque))
    return dir * (a.reference.localeCompare(b.reference))
  })
})
const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })

const kpis = computed(() => [
  { label: 'En cours', value: String(store.ouverts.length), icon: Wrench, bg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: 'En attente de pièce', value: String(store.enAttentePiece.length), icon: PackageSearch, bg: 'bg-warning-bg', iconColor: 'text-warning' },
  { label: 'MTTR (heures)', value: store.mttrHeures != null ? String(store.mttrHeures) : '-', icon: Clock, bg: 'bg-info-bg', iconColor: 'text-info' },
  { label: 'Préventif', value: store.ratioPreventif != null ? store.ratioPreventif + ' %' : '-', icon: ShieldCheck, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: 'Coût pièces', value: store.coutTotal.toLocaleString('fr-FR') + ' Ar', icon: Coins, bg: 'bg-neutral-bg', iconColor: 'text-neutral' },
])

const columns = computed<ListColumn[]>(() => [
  { key: 'reference', label: 'Ordre', sortable: true, width: 150 },
  { key: 'vehicule', label: 'Véhicule', sortable: true, width: 140 },
  { key: 'diagnostic', label: 'Diagnostic', width: 190 },
  { key: 'type', label: 'Type', width: 110 },
  { key: 'gravite', label: 'Gravité', sortable: true, width: 105 },
  { key: 'statut', label: 'Statut', sortable: true, width: 145 },
  { key: 'cout', label: 'Coût', width: 130 },
  { key: 'declare', label: 'Déclaré le', sortable: true, width: 120 },
])

/* ── Déclaration d'une panne ─────────────────────────────────── */
const creationOuverte = ref(false)
const formNouvel = ref({ vehiculeId: '', symptome: '', gravite: 'mineure' as GraviteOT, origine: 'remontee_chauffeur' as OrigineOT })
const optVehicules = computed<DropdownItem[]>(() => vehicules.liste.map(v => ({ id: v.id, label: v.immatriculation, sublabel: `${v.marque} ${v.modele}` })))
const optGravite: DropdownItem[] = Object.entries(LIB_GRAVITE_OT).map(([id, v]) => ({ id, label: v.label }))
const optOrigine: DropdownItem[] = Object.entries(LIB_ORIGINE_OT).map(([id, label]) => ({ id, label }))

function declarerPanne() {
  const v = vehicules.parId(formNouvel.value.vehiculeId)
  if (!v || !formNouvel.value.symptome.trim()) return
  const ref = store.creerOT({
    vehiculeId: v.id, vehiculePlaque: v.immatriculation,
    origine: formNouvel.value.origine, declarePar: 'Hery Andriamalala', declareLe: new Date().toISOString(),
    symptome: formNouvel.value.symptome.trim(), gravite: formNouvel.value.gravite, typeMaintenance: 'correctif',
    kilometrage: v.kilometrage,
  })
  creationOuverte.value = false
  formNouvel.value = { vehiculeId: '', symptome: '', gravite: 'mineure', origine: 'remontee_chauffeur' }
  ficheId.value = ref
}
</script>
