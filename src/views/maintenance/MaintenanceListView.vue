<template>
  <ListPageLayout
    title="Ordres de travail"
    :subtitle="`${store.ouverts.length} intervention(s) en cours · ${store.enAttentePiece.length} en attente de pièce`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} ordre(s) de travail`"
    search-placeholder="Référence, plaque, symptôme, sous-système…"
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
      <button :class="L.btnOutline" @click="importOuvert = true"><Upload class="w-4 h-4" /> Importer l'historique</button>
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

  <OrdreTravailCard v-if="ficheId" :ordres="store.ordres" :ordre-id="ficheId" @close="ficheId = null" @creer="ficheId = null; creationOuverte = true" />

  <ImportCsvModal
    v-if="importOuvert"
    titre="Importer l'historique des interventions"
    :champs="CHAMPS_IMPORT"
    :apercu-colonnes="COLONNES_APERCU"
    :modele="MODELE_CSV"
    description-controles="Contrôles appliqués : véhicule reconnu par sa plaque, date passée (AAAA-MM-JJ ou JJ/MM/AAAA), description obligatoire, sous-système reconnu (colonne du fichier, sinon proposé d'après la description), intervention pas déjà présente."
    :valider="validerLigneImport"
    @close="importOuvert = false"
    @importer="lignes => importerLignes(lignes as unknown as LigneHistorique[])"
  />

  <OrdreTravailFormModal v-if="creationOuverte" @close="creationOuverte = false" @cree="id => { creationOuverte = false; ficheId = id }" />
</template>

<script setup lang="ts">
/**
 * Ordres de travail, repris de la structure du socle FMS
 * (US 3.2.1 à 3.2.5) : déclaration, diagnostic ISO 14224, pièces et
 * main-d'œuvre, clôture. La déclaration ouvre immédiatement une
 * indisponibilité, comme sur le socle FMS.
 */
import { ref, computed, watch } from 'vue'
import { Clock, Coins, PackageSearch, Plus, ShieldCheck, Upload, Wrench, X } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import OrdreTravailCard from '../../components/maintenance/OrdreTravailCard.vue'
import OrdreTravailFormModal from '../../components/maintenance/OrdreTravailFormModal.vue'
import ImportCsvModal from '../../components/ui/ImportCsvModal.vue'
import type { ChampImport, LigneValidee } from '../../components/ui/ImportCsvModal.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useVehiculeStore } from '../../stores/vehicules'
import {
  LIB_ORIGINE_OT, LIB_SOUS_SYSTEME, LIB_MODE_DEFAILLANCE, LIB_TYPE_MAINTENANCE, LIB_GRAVITE_OT, LIB_STATUT_OT,
} from '../../types/maintenance'
import type { OrdreTravail, StatutOT, GraviteOT, OrigineOT, SousSysteme } from '../../types/maintenance'
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
    if (q && !`${o.reference} ${o.vehiculePlaque} ${o.symptome} ${o.sousSysteme ? LIB_SOUS_SYSTEME[o.sousSysteme] : ''}`.toLowerCase().includes(q)) return false
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

/* ── Reprise de l'historique ─────────────────────────────────── */
const importOuvert = ref(false)
const CHAMPS_IMPORT: ChampImport[] = [
  { cle: 'plaque', libelle: 'Immatriculation véhicule', requis: true },
  { cle: 'date', libelle: 'Date', requis: true },
  { cle: 'description', libelle: 'Description', requis: true },
  { cle: 'cout', libelle: 'Coût (Ar)', requis: false },
  { cle: 'sousSysteme', libelle: 'Sous-système', requis: false },
]
const COLONNES_APERCU = [
  { cle: 'vehiculePlaque', libelle: 'Véhicule' },
  { cle: 'date', libelle: 'Date' },
  { cle: 'libelle', libelle: 'Description' },
  { cle: 'sousSystemeLib', libelle: 'Sous-système' },
  { cle: 'coutAr', libelle: 'Coût (Ar)' },
]
const MODELE_CSV = ['Immatriculation véhicule', 'Date', 'Description', 'Coût', 'Sous-système']
interface LigneHistorique { vehiculeId: string; vehiculePlaque: string; date: string; libelle: string; coutAr: number; sousSysteme: SousSysteme }

/** Accepte AAAA-MM-JJ ou JJ/MM/AAAA (export tableur courant) et ramène au format ISO. */
function normaliserDate(d: string) {
  const m = d.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  return m ? `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}` : d.slice(0, 10)
}
function dateValide(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const t = new Date(d + 'T00:00:00Z')
  return !isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d && t.getTime() <= Date.now()
}
const sansAccent = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
function sousSystemeDe(valeur: string, description: string): SousSysteme | null {
  if (valeur) {
    const v = sansAccent(valeur)
    const trouve = (Object.entries(LIB_SOUS_SYSTEME) as [SousSysteme, string][]).find(([k, lib]) => sansAccent(k) === v || sansAccent(lib) === v)
    if (trouve) return trouve[0]
  }
  return store.proposerSousSysteme(description) as SousSysteme | null
}
function validerLigneImport(ligne: Record<string, string>, mapping: Record<string, string>): LigneValidee {
  const val = (cle: string) => (mapping[cle] ? (ligne[mapping[cle]!] ?? '').trim() : '')
  const plaque = val('plaque')
  if (!plaque) return { valide: false, motif: 'Immatriculation manquante' }
  const v = vehicules.liste.find(x => x.immatriculation.replace(/\s/g, '').toLowerCase() === plaque.replace(/\s/g, '').toLowerCase())
  if (!v) return { valide: false, motif: `Véhicule inconnu « ${plaque} »` }
  const date = normaliserDate(val('date'))
  if (!dateValide(date)) return { valide: false, motif: `Date invalide ou future « ${val('date')} »` }
  const libelle = val('description')
  if (!libelle) return { valide: false, motif: 'Description manquante' }
  const coutBrut = val('cout').replace(/[\s\u00a0]/g, '').replace(',', '.')
  const coutAr = coutBrut ? Number(coutBrut) : 0
  if (Number.isNaN(coutAr) || coutAr < 0) return { valide: false, motif: `Coût invalide « ${val('cout')} »` }
  const ss = sousSystemeDe(val('sousSysteme'), libelle)
  if (!ss) return { valide: false, motif: 'Sous-système non reconnu : renseignez la colonne Sous-système' }
  if (store.ordres.some(o => o.vehiculeId === v.id && o.declareLe.slice(0, 10) === date && o.symptome.trim().toLowerCase() === libelle.toLowerCase()))
    return { valide: false, motif: 'Intervention déjà présente dans l\'historique' }
  return { valide: true, donnees: { vehiculeId: v.id, vehiculePlaque: v.immatriculation, date, libelle, coutAr, sousSysteme: ss, sousSystemeLib: LIB_SOUS_SYSTEME[ss] } }
}
function importerLignes(lignes: LigneHistorique[]) {
  store.importerHistorique(lignes.map(l => ({ vehiculeId: l.vehiculeId, vehiculePlaque: l.vehiculePlaque, date: l.date, libelle: l.libelle, coutAr: l.coutAr, sousSysteme: l.sousSysteme })))
}
</script>
