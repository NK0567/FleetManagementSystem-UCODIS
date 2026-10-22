<template>
  <ListPageLayout
    title="Échéances préventives"
    :subtitle="`${depassees} échéance(s) dépassée(s) · ${proches} proche(s) du seuil`"
    :columns="columns"
    row-key="cle"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} échéance(s)`"
    search-placeholder="Plaque, opération…"
    scope-label="État :"
    :scope-options="scopeOptions"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @select="message = null"
  >
    <template #above-table>
      <div v-if="modelesProvisoires.length" class="flex items-start gap-2.5 bg-warning-bg text-warning rounded-lg px-3.5 py-2.5 mb-3.5">
        <FileQuestion class="w-4 h-4 shrink-0 mt-px" />
        <p class="text-xs leading-relaxed">
          Intervalles à confirmer : {{ modelesProvisoires.join(' · ') }}.
        </p>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiCard">
          <p class="text-xl font-bold leading-none" :class="k.cls">{{ k.value }}</p>
          <p class="text-xs text-muted-foreground mt-1">{{ k.label }}</p>
        </div>
      </div>
    </template>

    <template #cell-vehicule="{ item }">
      <span class="font-mono font-semibold text-foreground">{{ item.vehiculePlaque }}</span>
    </template>

    <template #cell-operation="{ item }">
      <span class="text-xs font-medium">{{ item.operationLibelle }}</span>
      <div class="text-[11px] text-muted-foreground">{{ LIB_SOUS_SYSTEME[item.sousSysteme] }}</div>
    </template>

    <template #cell-nature="{ item }">
      <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-bg text-neutral">{{ LIB_NATURE_OPERATION[item.nature] }}</span>
    </template>

    <template #cell-echeance="{ item }">
      <span v-if="item.statut === 'a_renseigner'" class="text-xs text-muted-foreground">Dernier passage inconnu</span>
      <span v-if="item.kmProchain" class="text-xs block">{{ item.kmProchain.toLocaleString('fr-FR') }} km</span>
      <span v-if="item.heuresProchain" class="text-xs block">{{ item.heuresProchain.toLocaleString('fr-FR') }} h moteur</span>
      <span v-if="item.dateProchaine" class="text-xs block">{{ formatDate(item.dateProchaine) }}</span>
      <div v-if="item.kmRestants != null" class="text-[11px]" :class="item.kmRestants < 0 ? 'text-danger font-medium' : 'text-muted-foreground'">
        {{ item.kmRestants < 0 ? `dépassée de ${Math.abs(item.kmRestants).toLocaleString('fr-FR')} km` : `dans ${item.kmRestants.toLocaleString('fr-FR')} km` }}
      </div>
      <div v-if="item.heuresRestantes != null" class="text-[11px]" :class="item.heuresRestantes < 0 ? 'text-danger font-medium' : 'text-muted-foreground'">
        {{ item.heuresRestantes < 0 ? `dépassée de ${Math.abs(item.heuresRestantes).toLocaleString('fr-FR')} h` : `dans ${item.heuresRestantes.toLocaleString('fr-FR')} h` }}
      </div>
      <div v-if="item.joursRestants != null" class="text-[11px]" :class="item.joursRestants < 0 ? 'text-danger font-medium' : 'text-muted-foreground'">
        {{ item.joursRestants < 0 ? `dépassée de ${Math.abs(item.joursRestants)} jour(s)` : `dans ${item.joursRestants} jour(s)` }}
      </div>
    </template>

    <template #cell-etat="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="CLS_ETAT[item.statut]">{{ LIB_ETAT[item.statut] }}</span>
    </template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="CLS_ETAT[item.statut]">{{ LIB_ETAT[item.statut] }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.vehiculePlaque }}</div>
          <div class="text-xs text-muted-foreground">{{ item.operationLibelle }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Sous-système</div>{{ LIB_SOUS_SYSTEME[item.sousSysteme] }}</div>
          <div><div class="text-muted-foreground text-[11px]">Nature</div>{{ LIB_NATURE_OPERATION[item.nature] }}</div>
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Prochaine échéance, au premier seuil atteint</div>{{ [item.kmProchain ? item.kmProchain.toLocaleString('fr-FR') + ' km' : '', item.heuresProchain ? item.heuresProchain.toLocaleString('fr-FR') + ' h moteur' : '', item.dateProchaine ? formatDate(item.dateProchaine) : ''].filter(Boolean).join(', ') || '-' }}</div>
        </div>
        <div v-if="message" class="rounded-md px-2.5 py-2 text-[11px]" :class="message.ok ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ message.texte }}</div>
        <template v-if="item.statut === 'a_renseigner'">
          <div class="grid grid-cols-2 gap-2">
            <div :class="F.field"><label :class="F.fieldLabel">Km du dernier passage</label><input v-model.number="passage.km" type="number" min="0" :class="F.fieldInput" class="!h-[32px]" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Heures moteur</label><input v-model.number="passage.heures" type="number" min="0" :class="F.fieldInput" class="!h-[32px]" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Date</label><input v-model="passage.date" type="date" :class="F.fieldInput" class="!h-[32px]" /></div>
          </div>
          <button :class="L.btnPrimary" class="w-full justify-center" @click="renseigner(item)">Enregistrer le dernier passage</button>
        </template>
        <template v-else>
          <RouterLink v-if="store.otPreventifOuvert(item.vehiculeId, item.operationId)" :to="{ name: 'maintenance-ordres', query: { ot: store.otPreventifOuvert(item.vehiculeId, item.operationId)!.id } }"
            :class="L.btnOutline" class="w-full justify-center no-underline">Ordre {{ store.otPreventifOuvert(item.vehiculeId, item.operationId)!.reference }} en cours</RouterLink>
          <button v-else :class="L.btnPrimary" class="w-full justify-center" @click="creerOT(item)">Créer l'ordre de travail</button>
        </template>
        <div v-if="planProvisoire(item.vehiculeId)" class="bg-warning-bg text-warning rounded-md px-2.5 py-2 text-[11px] leading-snug">
          Intervalle à confirmer.
        </div>
      </div>
    </template>

    <template #empty><CalendarClock class="w-8 h-8" /><p class="text-sm">Aucune échéance à venir</p></template>
  </ListPageLayout>
</template>

<script setup lang="ts">
/**
 * Échéances préventives : le déclenchement se fait au premier seuil
 * atteint (kilomètres, heures moteur ou date), selon le plan d'entretien
 * de la marque et du modèle du véhicule.
 */
import { ref, computed, watch } from 'vue'
import { CalendarClock, FileQuestion } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import { RouterLink } from 'vue-router'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useAuthStore } from '../../stores/auth'
import { formatDate } from '../../utils/helpers'
import * as F from '../../lib/formClasses'
import { useVehiculeStore } from '../../stores/vehicules'
import { LIB_SOUS_SYSTEME, LIB_NATURE_OPERATION } from '../../types/maintenance'
import type { EcheanceEntretien } from '../../types/maintenance'
import * as L from '../../lib/listClasses'

const store = useMaintenanceStore()
const vehicules = useVehiculeStore()
const auth = useAuthStore()

const searchQuery = ref('')
const activeScope = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSize = ref(20)

const LIB_ETAT: Record<EcheanceEntretien['statut'], string> = { a_venir: 'À venir', proche: 'Proche', depassee: 'Dépassée', a_renseigner: 'À renseigner' }
const CLS_ETAT: Record<EcheanceEntretien['statut'], string> = {
  a_venir: 'bg-neutral-bg text-neutral', proche: 'bg-warning-bg text-warning', depassee: 'bg-danger-bg text-danger', a_renseigner: 'bg-info-bg text-info',
}
const message = ref<{ ok: boolean; texte: string } | null>(null)
const passage = ref<{ km: number | null; heures: number | null; date: string }>({ km: null, heures: null, date: '' })
function creerOT(e: EcheanceEntretien) {
  const v = vehicules.parId(e.vehiculeId); if (!v) return
  /* Les opérations du même véhicule arrivées à échéance partent dans le même ordre. */
  const lot = store.echeancesDe(v).filter(x => (x.statut === 'depassee' || x.statut === 'proche' || x.operationId === e.operationId) && !store.otPreventifOuvert(v.id, x.operationId)).map(x => x.operationId)
  const r = store.creerOTPreventif(v, lot, auth.user?.nom ?? 'Responsable maintenance')
  message.value = r.ok ? { ok: true, texte: `Ordre ${r.ref} créé : ${lot.length} opération(s).` } : { ok: false, texte: r.motif ?? '' }
}
function renseigner(e: EcheanceEntretien) {
  const v = vehicules.parId(e.vehiculeId); if (!v) return
  const vide = (n: number | null) => n == null || (n as unknown) === '' ? null : n
  const r = store.renseignerPassage(v.id, e.operationId, { km: vide(passage.value.km), heures: vide(passage.value.heures), date: passage.value.date }, v.kilometrage, v.heuresMoteur)
  message.value = r.ok ? { ok: true, texte: 'Dernier passage enregistré.' } : { ok: false, texte: r.motif ?? '' }
  if (r.ok) passage.value = { km: null, heures: null, date: '' }
}

const scopeOptions = [
  { value: '', label: 'Toutes' },
  { value: 'depassee', label: 'Dépassées' },
  { value: 'proche', label: 'Proches du seuil' },
  { value: 'a_venir', label: 'À venir' },
  { value: 'a_renseigner', label: 'À renseigner' },
]

type EcheanceListee = EcheanceEntretien & { cle: string }

const echeances = computed<EcheanceListee[]>(() =>
  vehicules.liste
    .filter(v => v.statut !== 'sorti')
    .flatMap(v => store.echeancesDe(v))
    .map(e => ({ ...e, cle: `${e.vehiculeId}-${e.operationId}` })))
const ORDRE_ETAT: Record<EcheanceEntretien['statut'], number> = { depassee: 0, proche: 1, a_venir: 2, a_renseigner: 3 }

function planProvisoire(vehiculeId: string) {
  const v = vehicules.parId(vehiculeId)
  const plan = v ? store.planDuModele(v.marque, v.modele) : undefined
  return plan?.provisoire ? plan : null
}

const modelesProvisoires = computed(() => {
  const modeles = new Set(
    vehicules.auParc.filter(v => store.planDuModele(v.marque, v.modele)?.provisoire).map(v => `${v.marque} ${v.modele}`.trim()))
  return [...modeles]
})

const depassees = computed(() => echeances.value.filter(e => e.statut === 'depassee').length)
const proches = computed(() => echeances.value.filter(e => e.statut === 'proche').length)

const kpis = computed(() => [
  { label: 'Dépassées', value: String(depassees.value), cls: depassees.value ? 'text-danger' : 'text-success' },
  { label: 'Proches du seuil', value: String(proches.value), cls: proches.value ? 'text-warning' : 'text-foreground' },
  { label: 'À venir', value: String(echeances.value.filter(e => e.statut === 'a_venir').length), cls: 'text-foreground' },
  { label: 'Dernier passage à renseigner', value: String(echeances.value.filter(e => e.statut === 'a_renseigner').length), cls: 'text-info' },
])

const columns = computed<ListColumn[]>(() => [
  { key: 'vehicule', label: 'Véhicule', sortable: true, width: 150 },
  { key: 'operation', label: 'Opération', width: 320 },
  { key: 'nature', label: 'Nature', width: 130 },
  { key: 'echeance', label: 'Échéance', sortable: true, width: 210 },
  { key: 'etat', label: 'État', sortable: true, width: 130 },
])

watch([activeScope, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; searchQuery.value = ''; page.value = 1 }

/** Comparaison des restes à courir : kilomètres, puis jours, puis heures ; une valeur inconnue passe à la fin. */
const reste = (a?: number, b?: number) => (a ?? Infinity) === (b ?? Infinity) ? 0 : (a ?? Infinity) < (b ?? Infinity) ? -1 : 1
const parEcheance = (a: EcheanceListee, b: EcheanceListee) =>
  reste(a.kmRestants, b.kmRestants) || reste(a.joursRestants, b.joursRestants) || reste(a.heuresRestantes, b.heuresRestantes)
const filtered = computed(() => {
  const dir = sortDir.value === 'asc' ? 1 : -1
  return echeances.value.filter(e => {
    if (activeScope.value && e.statut !== activeScope.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!`${e.vehiculePlaque} ${e.operationLibelle}`.toLowerCase().includes(q)) return false
    }
    return true
  }).sort((a, b) => {
    if (sortKey.value === 'vehicule') return dir * (a.vehiculePlaque.localeCompare(b.vehiculePlaque) || parEcheance(a, b))
    if (sortKey.value === 'echeance') return dir * parEcheance(a, b)
    if (sortKey.value === 'etat') return dir * ((ORDRE_ETAT[a.statut] - ORDRE_ETAT[b.statut]) || parEcheance(a, b))
    return (ORDRE_ETAT[a.statut] - ORDRE_ETAT[b.statut]) || parEcheance(a, b)
  })
})
const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })
</script>
