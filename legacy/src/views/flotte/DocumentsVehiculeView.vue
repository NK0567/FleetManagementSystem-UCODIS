<template>
  <ListPageLayout
    title="Documents"
    :subtitle="`Véhicules et personnes · ${docsV.vehiculesNonConformes.length} véhicule(s) et ${personnesNonConformes.length} personne(s) non en règle`"
    :columns="columns"
    row-key="cle"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} document(s)`"
    search-placeholder="Véhicule, personne, type, numéro…"
    scope-label="État :"
    :scope-options="scopeOptions"
    v-model:scope="scope"
    v-model:search-query="searchQuery"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(d: any) => ouvrir(d)"
  >
    <template #header-actions>
      <button :class="L.btnPrimary" @click="nouveau()"><Plus class="w-4 h-4" /> Nouveau document</button>
    </template>

    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem" class="cursor-pointer" @click="k.action()">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
          <div><div :class="L.kpiItemVal">{{ k.value }}</div><div :class="L.kpiItemLbl">{{ k.label }}</div></div>
        </div>
      </div>
    </template>

    <template #filters>
      <div :class="L.fpField"><label :class="L.fpFieldLabel">Véhicule ou personne</label><SearchableDropdown v-model="filterSource" :items="optSource" placeholder="Tous" compact /></div>
      <div :class="L.fpField"><label :class="L.fpFieldLabel">Type</label><SearchableDropdown v-model="filterType" :items="optType" placeholder="Tous" compact /></div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer hover:text-primary" @click="resetFilters">Réinitialiser</button>
    </template>

    <template #cell-entite="{ item }">
      <div class="flex items-center gap-2">
        <span class="px-1.5 py-0.5 rounded text-[11px] font-medium" :class="item.source === 'vehicule' ? 'bg-info-bg text-info' : 'bg-primary/10 text-primary'">{{ item.source === 'vehicule' ? 'Véhicule' : 'Personne' }}</span>
        <span class="text-[13px] font-semibold text-foreground" :class="item.source === 'vehicule' && 'font-mono'">{{ item.titulaire }}</span>
      </div>
    </template>
    <template #cell-type="{ item }"><span class="text-foreground text-[13px]">{{ item.nom }}</span><div v-if="item.obligatoire" class="text-[11px] text-muted-foreground">obligatoire</div></template>
    <template #cell-emission="{ item }"><span class="text-xs text-muted-foreground">{{ item.emission ? formatDate(item.emission) : '-' }}</span></template>
    <template #cell-expiration="{ item }">
      <span v-if="item.fin" class="px-2 py-0.5 rounded text-xs font-medium" :class="CLS[item.etat]">{{ formatDate(item.fin) }}</span>
      <span v-else class="text-muted-foreground text-xs">{{ item.manquant ? '-' : 'illimitée' }}</span>
    </template>
    <template #cell-statut="{ item }"><StatusPill :statut="item.etat" /></template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <StatusPill :statut="item.etat" />
          <div class="font-medium text-foreground mt-1.5">{{ item.nom }}</div>
          <div class="text-xs text-muted-foreground" :class="item.source === 'vehicule' && 'font-mono'">{{ item.titulaire }}</div>
        </div>
        <template v-if="item.manquant">
          <div class="bg-danger-bg text-danger rounded-md px-2.5 py-2 text-[11px] leading-snug">{{ item.source === 'vehicule' ? 'Document obligatoire manquant : ce véhicule ne peut pas être affecté.' : 'Document obligatoire manquant : cette personne ne peut pas être affectée.' }}</div>
          <button :class="L.btnPrimary" class="w-full justify-center" @click="nouveau(item.source, item.entityId, item.typeCode)">Enregistrer ce document</button>
        </template>
        <template v-else>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div><div class="text-muted-foreground text-[11px]">N°</div><span class="font-mono">{{ item.numero ?? '-' }}</span></div>
            <div><div class="text-muted-foreground text-[11px]">Scan</div>{{ item.scan ? 'joint' : 'absent' }}</div>
            <div><div class="text-muted-foreground text-[11px]">Émission</div>{{ item.emission ? formatDate(item.emission) : '-' }}</div>
            <div><div class="text-muted-foreground text-[11px]">Fin</div>{{ item.fin ? formatDate(item.fin) : 'illimitée' }}</div>
          </div>
          <div v-if="item.etat !== 'valide'" class="rounded-md px-2.5 py-2 text-[11px] leading-snug" :class="item.etat === 'proche' ? 'bg-warning-bg text-warning' : 'bg-danger-bg text-danger'">
            {{ item.etat === 'proche' ? 'À renouveler avant l’échéance.' : 'Document hors validité : régularisation requise.' }}
          </div>
          <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrir(item)">Ouvrir la fiche</button>
        </template>
      </div>
    </template>

    <template #empty><FileText class="w-8 h-8" /><p class="text-sm">Aucun document trouvé</p></template>
  </ListPageLayout>

  <DocumentCard v-if="ficheCle" :key="ficheCle" :cles="clesFiches" :cle="ficheCle" @close="ficheCle = null"
    @renouveler="(s, e, t) => { ficheCle = null; nouveau(s, e, t) }" />
  <DocumentFormModal v-if="creation" :source="creation.source" :entity-id="creation.entityId" :type-code="creation.typeCode"
    @close="creation = null" @cree="cle => { creation = null; ficheCle = cle }" />
</template>

<script setup lang="ts">
/**
 * Documents des véhicules et des personnes (FMS-SC-01), en une seule vue.
 * Les documents obligatoires manquants y figurent aussi, pour savoir à tout
 * moment qui et quoi est en règle.
 */
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Clock, FileText, FileX, Plus, Truck, TriangleAlert, Users } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import DocumentCard from '../../components/flotte/DocumentCard.vue'
import DocumentFormModal from '../../components/flotte/DocumentFormModal.vue'
import { useDocumentsVehiculeStore } from '../../stores/documentsVehicule'
import { useDocumentsStore } from '../../stores/documentsPersonnel'
import { useTypesDocumentsStore } from '../../stores/typesDocuments'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { formatDate } from '../../utils/helpers'
import type { EtatDocument, PieceJointe } from '../../types'
import * as L from '../../lib/listClasses'

const docsV = useDocumentsVehiculeStore()
const docsP = useDocumentsStore()
const types = useTypesDocumentsStore()
const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()

interface Ligne {
  cle: string; source: 'vehicule' | 'personne'; entityId: string; titulaire: string; typeCode: string; nom: string; obligatoire: boolean
  numero?: string; emission?: string; fin?: string; etat: EtatDocument; scan?: PieceJointe; manquant?: boolean
}
const CLS: Record<string, string> = { valide: 'bg-success-bg text-success', proche: 'bg-warning-bg text-warning', expire: 'bg-danger-bg text-danger', annule: 'bg-danger-bg text-danger', perdu: 'bg-danger-bg text-danger', absent: 'bg-neutral-bg text-neutral' }

const lignes = computed<Ligne[]>(() => {
  const out: Ligne[] = []
  docsV.actifs.forEach(d => out.push({
    cle: `veh:${d.id}`, source: 'vehicule', entityId: d.vehiculeId, titulaire: vehicules.parId(d.vehiculeId)?.immatriculation ?? d.vehiculeId,
    typeCode: d.type, nom: docsV.libelle(d), obligatoire: !!types.get(d.type)?.obligatoire, numero: d.numero, emission: d.dateEmission, fin: d.echeance, etat: docsV.etat(d), scan: d.scan,
  }))
  vehicules.liste.filter(v => v.statut !== 'sorti').forEach(v => types.obligatoires('vehicule', v.type).forEach(t => {
    if (!docsV.documentsDe(v.id).some(d => d.type === t.code)) out.push({ cle: `manq:veh:${v.id}:${t.code}`, source: 'vehicule', entityId: v.id, titulaire: v.immatriculation, typeCode: t.code, nom: t.libelle, obligatoire: true, etat: 'absent', manquant: true })
  }))
  docsP.actifs.forEach(d => {
    const p = personnel.parId(d.personnelId); if (!p || p.statut === 'archive') return
    out.push({ cle: `per:${d.id}`, source: 'personne', entityId: d.personnelId, titulaire: p.nomComplet, typeCode: d.type, nom: docsP.libelle(d),
      obligatoire: !!types.get(d.type)?.obligatoire, numero: d.reference, emission: d.dateDelivrance, fin: d.dateExpiration, etat: docsP.etat(d), scan: d.scan ?? (d.fichier ? { nom: d.fichier } : undefined) })
  })
  personnel.actifs.forEach(p => docsP.piecesAbsentes(p.id).forEach(code => out.push({
    cle: `manq:per:${p.id}:${code}`, source: 'personne', entityId: p.id, titulaire: p.nomComplet, typeCode: code, nom: types.libelle(code), obligatoire: true, etat: 'absent', manquant: true,
  })))
  const rang: Record<string, number> = { expire: 0, perdu: 0, annule: 0, absent: 1, proche: 2, valide: 3 }
  return out.sort((a, b) => (rang[a.etat]! - rang[b.etat]!) || (a.fin ?? '9999').localeCompare(b.fin ?? '9999'))
})
const personnesNonConformes = computed(() => personnel.actifs.filter(p => !docsP.enRegle(p.id)))

const scope = ref('')
const scopeOptions = [
  { value: '', label: 'Tous' }, { value: 'alerte', label: 'À traiter' }, { value: 'proche', label: 'À renouveler' },
  { value: 'invalide', label: 'Expirés, annulés ou perdus' }, { value: 'absent', label: 'Manquants' }, { value: 'valide', label: 'Valides' },
]
const searchQuery = ref(''); const filterSource = ref(''); const filterType = ref('')
const page = ref(1); const pageSize = ref(15)
const ficheCle = ref<string | null>(null)
/* Un document ouvert depuis une alerte arrive avec sa clé (véhicule ou personne). */
const routeLien = useRoute()
function lireDocument(v: unknown) { if (typeof v === 'string' && lignes.value.some(l => l.cle === v && !l.manquant)) ficheCle.value = v }
lireDocument(routeLien.query.document)
watch(() => routeLien.query.document, lireDocument)
const creation = ref<{ source?: 'vehicule' | 'personne'; entityId?: string; typeCode?: string } | null>(null)
watch([scope, searchQuery, filterSource, filterType, pageSize], () => { page.value = 1 })
function resetFilters() { scope.value = ''; searchQuery.value = ''; filterSource.value = ''; filterType.value = ''; page.value = 1 }

const optSource: DropdownItem[] = [{ id: 'vehicule', label: 'Véhicules' }, { id: 'personne', label: 'Personnes' }]
const optType = computed<DropdownItem[]>(() => types.types.filter(t => t.cible !== 'entreprise').map(t => ({ id: t.code, label: t.libelle })))

const filtered = computed(() => lignes.value.filter(l => {
  if (scope.value === 'alerte' && l.etat === 'valide') return false
  if (scope.value === 'proche' && l.etat !== 'proche') return false
  if (scope.value === 'invalide' && !['expire', 'annule', 'perdu'].includes(l.etat)) return false
  if (scope.value === 'absent' && !l.manquant) return false
  if (scope.value === 'valide' && l.etat !== 'valide') return false
  if (filterSource.value && l.source !== filterSource.value) return false
  if (filterType.value && l.typeCode !== filterType.value) return false
  const q = searchQuery.value.toLowerCase()
  return !q || `${l.titulaire} ${l.nom} ${l.numero ?? ''}`.toLowerCase().includes(q)
}))
const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })
const clesFiches = computed(() => filtered.value.filter(l => !l.manquant).map(l => l.cle))

const kpis = computed(() => [
  { label: 'Expirés ou invalides', value: lignes.value.filter(l => ['expire', 'annule', 'perdu'].includes(l.etat)).length, icon: FileX, bg: 'bg-danger-bg', iconColor: 'text-danger', action: () => { scope.value = 'invalide' } },
  { label: 'À renouveler', value: lignes.value.filter(l => l.etat === 'proche').length, icon: Clock, bg: 'bg-warning-bg', iconColor: 'text-warning', action: () => { scope.value = 'proche' } },
  { label: 'Obligatoires manquants', value: lignes.value.filter(l => l.manquant).length, icon: TriangleAlert, bg: 'bg-neutral-bg', iconColor: 'text-neutral', action: () => { scope.value = 'absent' } },
  { label: 'Véhicules non en règle', value: docsV.vehiculesNonConformes.length, icon: Truck, bg: 'bg-info-bg', iconColor: 'text-info', action: () => { scope.value = 'alerte'; filterSource.value = 'vehicule' } },
  { label: 'Personnes non en règle', value: personnesNonConformes.value.length, icon: Users, bg: 'bg-primary/10', iconColor: 'text-primary', action: () => { scope.value = 'alerte'; filterSource.value = 'personne' } },
])

const columns = computed<ListColumn[]>(() => [
  { key: 'entite', label: 'Véhicule ou personne', hideable: false, width: 220 },
  { key: 'type', label: 'Document', width: 200 },
  { key: 'emission', label: 'Émission', width: 110 },
  { key: 'expiration', label: 'Fin de validité', width: 130 },
  { key: 'statut', label: 'État', width: 120 },
])

function ouvrir(l: Ligne) { if (l.manquant) nouveau(l.source, l.entityId, l.typeCode); else ficheCle.value = l.cle }
function nouveau(source?: 'vehicule' | 'personne', entityId?: string, typeCode?: string) { creation.value = { source, entityId, typeCode } }
</script>
