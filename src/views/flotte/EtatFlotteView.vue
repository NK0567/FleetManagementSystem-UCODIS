<template>
  <ListPageLayout
    title="État de flotte"
    :subtitle="sousTitre"
    :columns="columns"
    row-key="vehiculeId"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} véhicule(s)`"
    search-placeholder="Plaque, conducteur, voyage…"
    scope-label="Groupe :"
    :scope-options="scopeOptions"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(l) => ouvrirVehicule((l as LigneEtatFlotte).vehiculeId)"
  >
    <template #header-actions>
      <SearchableDropdown v-model="dateAffichee" :items="optionsJours" placeholder="Situation du jour" compact class="mr-2" />
      <button v-if="dateAffichee === 'aujourd_hui'" :class="L.btnOutline" @click="archiver"><Archive class="w-4 h-4" /> Archiver</button>
      <BoutonsExport :rapport="rapport" />
      <button :class="L.btnOutline" @click="ouvrirEnvoi"><Mail class="w-4 h-4" /> Envoyer</button>
    </template>

    <template #above-table>
      <p v-if="message" class="text-[12px] text-success mb-2">{{ message }}</p>
      <p v-if="archive" class="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-2">État archivé le {{ formatDateHeure(archive.archiveLe) }} par {{ archive.par }} : lecture seule.</p>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
          <div><div :class="L.kpiItemVal">{{ k.value }}</div><div :class="L.kpiItemLbl">{{ k.label }}</div></div>
        </div>
      </div>
    </template>

    <template #filters>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">État</label>
        <SearchableDropdown v-model="filterEtat" :items="optEtats" placeholder="Tous" compact />
      </div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer hover:text-primary" @click="resetFilters">Réinitialiser</button>
    </template>

    <template #cell-vehicule="{ item }">
      <span class="font-mono text-xs font-semibold text-primary">{{ item.vehiculePlaque }}</span>
      <div v-if="item.semiRemorquePlaque" class="text-[11px] text-muted-foreground font-mono">{{ item.semiRemorquePlaque }}</div>
    </template>
    <template #cell-chauffeur="{ item }"><span class="text-xs">{{ item.chauffeurNom ?? 'Non assigné' }}</span></template>
    <template #cell-etat="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="classeGroupe(item.etat)">{{ libelleEtat(item.etat) }}</span>
      <div class="text-[11px] text-muted-foreground mt-0.5"><span class="font-mono">{{ codeEtat(item.etat) }}</span>{{ item.voyageRef ? ` · ${item.voyageRef}` : '' }}</div>
    </template>
    <template #cell-immobilisation="{ item }">
      <span v-if="item.codeIndispo" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-danger-bg text-danger">{{ item.codeIndispo }}</span>
      <div v-if="item.motifIndispo" class="text-[11px] text-muted-foreground mt-0.5">{{ item.motifIndispo }}</div>
      <span v-if="item.etat !== 'IMMO'" class="text-xs text-muted-foreground">-</span>
    </template>
    <template #cell-remise="{ item }"><span class="text-xs text-muted-foreground">{{ item.remiseEnServicePrevue ? formatDate(item.remiseEnServicePrevue) : '-' }}</span></template>
    <template #cell-position="{ item }"><span class="text-xs">{{ item.position ?? '-' }}</span></template>
    <template #cell-mission="{ item }"><span class="text-xs">{{ item.mission ?? '-' }}</span></template>
    <template #cell-observation="{ item }"><span class="text-xs text-muted-foreground">{{ item.observation ?? '' }}</span></template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded" :class="classeGroupe(item.etat)">{{ libelleEtat(item.etat) }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.vehiculePlaque }}</div>
          <div class="text-xs text-muted-foreground font-mono">{{ codeEtat(item.etat) }}</div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div v-if="item.semiRemorquePlaque"><div class="text-muted-foreground text-[11px]">Semi-remorque</div><span class="font-mono">{{ item.semiRemorquePlaque }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Conducteur</div>{{ item.chauffeurNom ?? 'Non assigné' }}</div>
          <div v-if="item.voyageRef" class="col-span-2"><div class="text-muted-foreground text-[11px]">Voyage</div><span class="font-mono">{{ item.voyageRef }}</span></div>
        </div>

        <div v-if="item.etat === 'IMMO'" class="bg-danger-bg text-danger rounded-md px-2.5 py-2 text-[11px] leading-snug">
          <strong v-if="item.codeIndispo" class="font-mono">{{ item.codeIndispo }} : </strong>{{ item.motifIndispo }}
          <div v-if="item.remiseEnServicePrevue" class="mt-1">Remise en service prévue le {{ formatDate(item.remiseEnServicePrevue) }}.</div>
        </div>

        <div v-if="item.position || item.mission" class="grid grid-cols-1 gap-2 text-xs">
          <div v-if="item.position"><div class="text-muted-foreground text-[11px]">Position</div>{{ item.position }}</div>
          <div v-if="item.mission"><div class="text-muted-foreground text-[11px]">Produit ou mission</div>{{ item.mission }}</div>
        </div>

        <template v-if="!archive">
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] text-muted-foreground">Observation du jour</label>
            <textarea :value="saisie.vehiculeId === item.vehiculeId ? saisie.observation : (item.observation ?? '')" rows="3" maxlength="500" class="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs" placeholder="Ce que la direction ou le client doit savoir aujourd'hui" @input="preparer(item); saisie.observation = ($event.target as HTMLTextAreaElement).value"></textarea>
            <template v-if="item.etat === 'IMMO'">
              <label class="text-[11px] text-muted-foreground">Remise en service prévue</label>
              <input :value="saisie.vehiculeId === item.vehiculeId ? saisie.remise : (item.remiseEnServicePrevue ?? '')" type="date" :min="store.dateDuJour" class="h-[32px] rounded-md border border-border bg-background px-2.5 text-xs" @input="preparer(item); saisie.remise = ($event.target as HTMLInputElement).value" />
            </template>
            <button :class="L.btnOutline" class="justify-center" @click="enregistrerNote(item)">Enregistrer l'observation</button>
            <p v-if="erreurNote" class="text-[11px] text-danger">{{ erreurNote }}</p>
          </div>
        </template>
        <p v-else-if="item.observation" class="text-[11px] text-muted-foreground leading-snug">{{ item.observation }}</p>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirVehicule(item.vehiculeId)">Ouvrir la fiche</button>
      </div>
    </template>

    <template #empty>
      <Truck class="w-8 h-8" />
      <p class="text-sm">Aucun véhicule trouvé</p>
    </template>
  </ListPageLayout>

  <!-- Envoi par e-mail : le fichier Excel est téléchargé pour être joint, la messagerie s'ouvre avec le résumé. -->
  <div v-if="envoiOuvert" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" @click.self="envoiOuvert = false">
    <div class="bg-card rounded-xl shadow-xl w-full max-w-md p-5">
      <h2 class="text-[15px] font-semibold text-foreground mb-1">Envoyer l'état de flotte</h2>
      <p class="text-[12px] text-muted-foreground mb-3">{{ libelleJour }}</p>
      <label class="text-[11px] font-semibold text-muted-foreground uppercase">Destinataires, séparés par une virgule</label>
      <input v-model="destinataires" class="w-full h-[36px] rounded-md border border-border bg-background px-2.5 text-[13px] mt-1" placeholder="direction@entreprise.com, client@exemple.com" />
      <p v-if="erreurEnvoi" class="text-[12px] text-danger mt-2">{{ erreurEnvoi }}</p>
      <div v-if="store.envois.length" class="mt-3 text-[11px] text-muted-foreground">
        <p class="font-semibold mb-1">Derniers envois</p>
        <p v-for="e in store.envois.slice(0, 3)" :key="e.le">{{ formatDateHeure(e.le) }} · {{ e.destinataires.join(', ') }}</p>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button :class="L.btnOutline" @click="envoiOuvert = false">Annuler</button>
        <button :class="L.btnPrimary" @click="envoyer">Envoyer</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Archive, CircleCheck, Mail, Route, Truck, TriangleAlert } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import BoutonsExport from '../../components/shared/BoutonsExport.vue'
import { useFlotteEtatStore, ETATS_FLOTTE, LIB_GROUPE_ETAT, libelleEtat, codeEtat, groupeDeLEtat } from '../../stores/flotteEtat'
import { useAuthStore } from '../../stores/auth'
import { exporterExcel, type Rapport } from '../../lib/rapports'
import type { LigneEtatFlotte, GroupeEtatFlotte } from '../../types'
import { formatDate } from '../../utils/helpers'
import * as L from '../../lib/listClasses'

/**
 * État de flotte quotidien (FMS-RA-02) : produit automatiquement, avec
 * l'observation du jour saisie sur l'aperçu ; archivable, exportable en PDF
 * ou Excel, et envoyé par e-mail.
 */
const store = useFlotteEtatStore()
const auth = useAuthStore()
const router = useRouter()
/** Le double clic et « Ouvrir la fiche » ouvrent la fiche du véhicule. */
function ouvrirVehicule(id: string) { router.push({ name: 'flotte-vehicules', query: { vehicule: id } }) }

const searchQuery = ref('')
const activeScope = ref('')
const filterEtat = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSize = ref(15)
const dateAffichee = ref('aujourd_hui')
const message = ref('')

const fmtJour = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
const formatDateHeure = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
const optionsJours = computed<DropdownItem[]>(() => [
  { id: 'aujourd_hui', label: `${fmtJour(store.dateDuJour)} (aujourd'hui)` },
  ...store.datesArchivees.filter(d => d !== store.dateDuJour).map(d => ({ id: d, label: `${fmtJour(d)} (archive)` })),
])
const archive = computed(() => dateAffichee.value === 'aujourd_hui' ? null : store.archives[dateAffichee.value] ?? null)
const source = computed(() => archive.value?.lignes ?? store.lignes)
const libelleJour = computed(() => `Situation au ${fmtJour(archive.value?.date ?? store.dateDuJour)}`)
const nbImmo = computed(() => source.value.filter(l => groupeDeLEtat(l.etat) === 'immobilise').length)
const sousTitre = computed(() => `${libelleJour.value} · ${nbImmo.value} véhicule(s) immobilisé(s)${store.archives[store.dateDuJour] && !archive.value ? ' · archivé aujourd\'hui' : ''}`)

function archiver() {
  const r = store.archiver(auth.user?.nom ?? 'Utilisateur')
  message.value = r.remplace ? "Archive du jour mise à jour." : 'État du jour archivé.'
}

const COULEUR_GROUPE: Record<GroupeEtatFlotte, string> = {
  operationnel: 'bg-success-bg text-success', transit: 'bg-info-bg text-info', attente: 'bg-warning-bg text-warning', immobilise: 'bg-danger-bg text-danger',
}
function classeGroupe(code: string) {
  const def = ETATS_FLOTTE.find(e => e.code === code)
  return def ? COULEUR_GROUPE[def.groupe] : 'bg-neutral-bg text-neutral'
}

const scopeOptions = [
  { value: '', label: 'Tous les groupes' },
  ...(Object.keys(LIB_GROUPE_ETAT) as GroupeEtatFlotte[]).map(g => ({ value: g, label: LIB_GROUPE_ETAT[g] })),
]
/** Seuls les états présents dans la situation affichée sont proposés. */
const optEtats = computed<DropdownItem[]>(() => ETATS_FLOTTE.filter(e => source.value.some(l => l.etat === e.code)).map(e => ({ id: e.code, label: `${libelleEtat(e.code)} (${codeEtat(e.code)})` })))

const compte = (g: GroupeEtatFlotte) => source.value.filter(l => groupeDeLEtat(l.etat) === g).length
const kpis = computed(() => [
  { label: 'Opérationnels', value: compte('operationnel'), icon: CircleCheck, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: 'En transit', value: compte('transit'), icon: Route, bg: 'bg-info-bg', iconColor: 'text-info' },
  { label: 'En attente', value: compte('attente'), icon: Truck, bg: 'bg-warning-bg', iconColor: 'text-warning' },
  { label: 'Immobilisés', value: compte('immobilise'), icon: TriangleAlert, bg: 'bg-danger-bg', iconColor: 'text-danger' },
])

const columns = computed<ListColumn[]>(() => [
  { key: 'vehicule', label: 'Véhicule', sortable: true, hideable: false, width: 120 },
  { key: 'chauffeur', label: 'Conducteur', width: 150 },
  { key: 'etat', label: 'État', sortable: true, width: 160 },
  { key: 'position', label: 'Position', width: 170 },
  { key: 'mission', label: 'Produit ou mission', width: 210 },
  { key: 'immobilisation', label: 'Immobilisation', width: 190 },
  { key: 'remise', label: 'Remise en service', width: 130 },
  { key: 'observation', label: 'Observation du jour', width: 220 },
])

watch([activeScope, filterEtat, searchQuery, pageSize, dateAffichee], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; filterEtat.value = ''; searchQuery.value = ''; page.value = 1 }

const filtered = computed(() => {
  let rows = source.value.filter(l => {
    if (activeScope.value && groupeDeLEtat(l.etat) !== activeScope.value) return false
    if (filterEtat.value && l.etat !== filterEtat.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!`${l.vehiculePlaque} ${l.chauffeurNom ?? ''} ${l.voyageRef ?? ''} ${l.position ?? ''} ${l.mission ?? ''}`.toLowerCase().includes(q)) return false
    }
    return true
  })
  if (sortKey.value) {
    const k = sortKey.value === 'vehicule' ? 'vehiculePlaque' : sortKey.value as keyof LigneEtatFlotte
    rows = [...rows].sort((a, b) => {
      const cmp = String(a[k] ?? '').localeCompare(String(b[k] ?? ''))
      return sortDir.value === 'asc' ? cmp : -cmp
    })
  }
  return rows
})

const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })

/* ── Observation du jour ───────────────────────────────────────── */
const saisie = ref({ vehiculeId: '', observation: '', remise: '' })
const erreurNote = ref('')
function preparer(l: LigneEtatFlotte) {
  if (saisie.value.vehiculeId === l.vehiculeId) return
  saisie.value = { vehiculeId: l.vehiculeId, observation: l.observation ?? '', remise: l.remiseEnServicePrevue ?? '' }
  erreurNote.value = ''
}
function enregistrerNote(l: LigneEtatFlotte) {
  preparer(l)
  const r = store.noter(l.vehiculeId, saisie.value.observation, saisie.value.remise || undefined, auth.user?.nom ?? 'Utilisateur')
  erreurNote.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) message.value = `Observation enregistrée pour ${l.vehiculePlaque}.`
}

/* ── Export et envoi ───────────────────────────────────────────── */
function rapport(): Rapport {
  return {
    titre: `État de flotte du ${fmtJour(archive.value?.date ?? store.dateDuJour)}`,
    sousTitre: `${source.value.length} véhicule(s) · ${nbImmo.value} immobilisé(s)${archive.value ? ' · archive' : ''}`,
    /* L'export et l'envoi portent sur l'état complet, jamais sur la liste filtrée. */
    sections: [{
      titre: 'État de flotte',
      colonnes: ['Véhicule', 'Semi-remorque', 'Conducteur', 'État', 'Position', 'Produit ou mission', 'Code', 'Motif', 'Remise en service', 'Observation du jour'],
      lignes: source.value.map(l => [l.vehiculePlaque, l.semiRemorquePlaque, l.chauffeurNom ?? 'Non assigné', `${libelleEtat(l.etat)} (${codeEtat(l.etat)})`, l.position, l.mission ?? l.voyageRef,
        l.codeIndispo, l.motifIndispo, l.remiseEnServicePrevue ? formatDate(l.remiseEnServicePrevue) : '', l.observation]),
    }],
  }
}
const envoiOuvert = ref(false)
const destinataires = ref('')
const erreurEnvoi = ref('')
function ouvrirEnvoi() { erreurEnvoi.value = ''; destinataires.value = store.envois[0]?.destinataires.join(', ') ?? ''; envoiOuvert.value = true }
async function envoyer() {
  const liste = destinataires.value.split(/[,;]/).map(x => x.trim()).filter(Boolean)
  const r = store.enregistrerEnvoi(liste, auth.user?.nom ?? 'Utilisateur')
  if (!r.ok) { erreurEnvoi.value = r.motif ?? ''; return }
  const rap = rapport()
  try { await exporterExcel(rap) } catch { /* le message part quand même, sans pièce jointe */ }
  const resume = [`${rap.titre}`, rap.sousTitre ?? '', '', ...source.value.slice(0, 25).map(l => `${l.vehiculePlaque} : ${libelleEtat(l.etat)}${l.mission ? `, ${l.mission}` : ''}${l.motifIndispo ? `, ${l.motifIndispo}` : ''}${l.observation ? ` (${l.observation})` : ''}`),
    source.value.length > 25 ? `et ${source.value.length - 25} autre(s) véhicule(s), voir le fichier joint.` : '', '', 'Détail complet dans le fichier Excel joint.'].join('\n')
  window.location.href = `mailto:${liste.join(',')}?subject=${encodeURIComponent(rap.titre)}&body=${encodeURIComponent(resume)}`
  envoiOuvert.value = false
  message.value = `Envoi préparé pour ${liste.join(', ')}.`
}
</script>
