<template>
  <ListPageLayout
    title="Documents"
    subtitle="Véhicules & conducteurs - suivi réglementaire"
    :columns="columns"
    row-key="cle"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} document(s)`"
    search-placeholder="Rechercher par entité ou type…"
    v-model:search-query="searchQuery"
    v-model:page="page"
    v-model:page-size="pageSize"
    @open-card="(d) => openDetail(d as LigneDocument)"
  >
    <template #above-table>
      <div class="flex flex-wrap gap-2.5 mb-3.5">
        <div v-if="documentsExpires.length" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-danger-bg border border-danger/20 text-danger text-sm font-medium">
          <TriangleAlert class="w-4 h-4" /> {{ documentsExpires.length }} document(s) expiré(s)
        </div>
        <div v-if="documentsProches.length" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning-bg border border-warning/20 text-warning text-sm font-medium">
          <Clock class="w-4 h-4" /> {{ documentsProches.length }} expiration(s) dans {{ params.preavisDocumentaireJours }} jours
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiCard">
          <p class="text-xs text-muted-foreground font-medium">{{ k.label }}</p>
          <p class="text-2xl font-bold mt-0.5" :class="k.color ?? 'text-foreground'">{{ k.value }}</p>
        </div>
      </div>
    </template>

    <template #filters>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Entité</label>
        <SearchableDropdown v-model="filterEntity" :items="optEntity" placeholder="Toutes" compact />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Type</label>
        <SearchableDropdown v-model="filterType" :items="optType" placeholder="Tous" compact />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Statut</label>
        <SearchableDropdown v-model="filterStatut" :items="optStatut" placeholder="Tous" compact />
      </div>
    </template>

    <template #header-actions>
      <button :class="L.btnPrimary" @click="openModal()"><Plus class="w-4 h-4" /> Ajouter document</button>
    </template>

    <template #cell-entite="{ item }">
      <div class="flex items-center gap-2">
        <span class="px-1.5 py-0.5 rounded text-[11px] font-medium" :class="item.entityType === 'vehicule' ? 'bg-info-bg text-info' : 'bg-primary/10 text-primary'">
          {{ item.entityType === 'vehicule' ? 'VÉH' : 'CND' }}
        </span>
        <span class="font-mono text-[13px] font-semibold text-foreground">{{ item.entityLabel }}</span>
      </div>
    </template>
    <template #cell-type="{ item }"><span class="text-foreground text-[13px]">{{ item.type }}</span></template>
    <template #cell-emission="{ item }"><span class="text-xs text-muted-foreground">{{ item.dateEmission ? fmtDate(item.dateEmission) : '-' }}</span></template>
    <template #cell-expiration="{ item }">
      <span v-if="item.dateExpiration" class="px-2 py-0.5 rounded text-xs font-medium" :class="classeEcheance(item.statut)">{{ fmtDate(item.dateExpiration) }}</span>
      <span v-else class="text-muted-foreground text-xs">-</span>
    </template>
    <template #cell-statut="{ item }">
      <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="classeStatut(item.statut)">{{ libelleStatut(item.statut) }}</span>
    </template>
    <template #cell-actions="{ item }">
      <div class="flex items-center gap-2">
        <button class="text-xs text-primary hover:underline bg-transparent border-0 cursor-pointer p-0" @click.stop="openModal(item)">Modifier</button>
        <button class="text-xs text-danger hover:underline bg-transparent border-0 cursor-pointer p-0" @click.stop="confirmDelete(item)">Supprimer</button>
      </div>
    </template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="item.entityType === 'vehicule' ? 'bg-info-bg text-info' : 'bg-primary/10 text-primary'">
            {{ item.entityType === 'vehicule' ? 'Véhicule' : 'Conducteur' }}
          </span>
          <div class="font-medium text-foreground mt-1.5">{{ item.type }}</div>
          <div class="font-mono text-xs text-muted-foreground">{{ item.entityLabel }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">N°</div><span class="font-mono">{{ item.numero ?? '-' }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Statut</div>{{ libelleStatut(item.statut) }}</div>
          <div><div class="text-muted-foreground text-[11px]">Émission</div>{{ item.dateEmission ? fmtDate(item.dateEmission) : '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Expiration</div>{{ item.dateExpiration ? fmtDate(item.dateExpiration) : '-' }}</div>
        </div>
        <div v-if="item.dateExpiration" class="rounded-md px-2.5 py-2 text-[11px] leading-snug" :class="classeBanniere(item.statut)">
          {{ libelleBanniere(item) }}
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="openDetail(item)">Ouvrir la fiche</button>
      </div>
    </template>

    <template #empty>
      <FileText class="w-8 h-8" />
      <p class="text-sm">Aucun document trouvé</p>
    </template>
  </ListPageLayout>

  <!-- Modale d'ajout / modification -->
  <div v-if="showModal" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" @click.self="showModal = false">
    <div class="bg-card rounded-xl shadow-xl w-full max-w-md overflow-hidden">
      <div class="bg-primary px-5 py-3.5 flex items-center justify-between">
        <h2 class="text-white font-semibold text-[15px]">{{ editingDoc ? 'Modifier' : 'Ajouter' }} un document</h2>
        <button class="text-white/80 hover:text-white bg-transparent border-0 cursor-pointer" @click="showModal = false"><X class="w-5 h-5" /></button>
      </div>
      <div class="p-5 flex flex-col gap-3.5">
        <div>
          <label :class="F.fieldLabel">Entité *</label>
          <div class="flex gap-2 mt-1">
            <button v-for="et in (['vehicule','conducteur'] as const)" :key="et" type="button"
                    class="flex-1 py-1.5 rounded-lg border-2 text-sm font-medium capitalize transition-colors cursor-pointer"
                    :class="form.entityType === et ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground bg-transparent'"
                    @click="form.entityType = et; form.entityId = ''; form.type = ''">
              {{ et === 'vehicule' ? 'Véhicule' : 'Conducteur' }}
            </button>
          </div>
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">{{ form.entityType === 'vehicule' ? 'Véhicule' : 'Conducteur' }} *</label>
          <SearchableDropdown v-model="form.entityId" :items="optEntitiesForForm" placeholder="Choisir…" />
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">Type de document *</label>
          <SearchableDropdown v-model="form.type" :items="optTypesForForm" placeholder="Choisir…" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div :class="F.field">
            <label :class="F.fieldLabel">N°</label>
            <input v-model="form.numero" :class="F.fieldInput" placeholder="Référence" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Émission</label>
            <input v-model="form.dateEmission" type="date" :class="F.fieldInput" />
          </div>
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">Expiration</label>
          <input v-model="form.dateExpiration" type="date" :class="F.fieldInput" />
        </div>
        <p v-if="formError" class="text-danger text-[12px]">{{ formError }}</p>
      </div>
      <div class="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border">
        <button :class="cls.btnOutline" @click="showModal = false">Annuler</button>
        <button :class="cls.btnPrimary" @click="handleSubmit">{{ editingDoc ? 'Enregistrer' : 'Ajouter' }}</button>
      </div>
    </div>
  </div>

  <!-- Confirmation de suppression -->
  <div v-if="deleteTarget" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" @click.self="deleteTarget = null">
    <div class="bg-card rounded-xl shadow-xl w-full max-w-sm p-5">
      <h2 class="text-[15px] font-semibold text-foreground mb-2">Supprimer ce document ?</h2>
      <p class="text-[13px] text-muted-foreground mb-4">{{ deleteTarget.type }} · {{ deleteTarget.entityLabel }}. Cette action est irréversible.</p>
      <div class="flex items-center justify-end gap-2">
        <button :class="cls.btnOutline" @click="deleteTarget = null">Annuler</button>
        <button class="px-4 py-[7px] rounded-md text-[13px] font-medium bg-danger text-white border-0 cursor-pointer" @click="doDelete">Supprimer</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Documents, repris du socle FMS : un seul écran unifiant véhicules
 * et conducteurs, plutôt que deux écrans séparés. Le store du socle FMS fusionne
 * les deux entités dans une seule table ; côté UCODIS, les deux familles
 * de documents restent dans leurs stores respectifs (déjà utilisés
 * ailleurs, notamment par les fiches employé et le tableau de bord
 * conducteur) et cet écran les compose en une seule vue, sans dupliquer
 * la donnée ni casser ce qui existe déjà.
 */
import { ref, computed, watch } from 'vue'
import { Clock, FileText, Plus, TriangleAlert, X } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import { useDocumentsVehiculeStore } from '../../stores/documentsVehicule'
import type { TypeDocumentVehicule } from '../../stores/documentsVehicule'
import { useDocumentsStore, LIBELLE_TYPE_DOC } from '../../stores/documentsPersonnel'
import type { TypeDocument } from '../../types'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useConfigurationStore } from '../../stores/configuration'
import { formatDate, etatEcheance } from '../../utils/helpers'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'
import * as cls from '../../lib/formClasses'

const docsVehicule = useDocumentsVehiculeStore()
const docsPersonnel = useDocumentsStore()
const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const configStore = useConfigurationStore()
const params = computed(() => configStore.parametres)

interface LigneDocument {
  cle: string
  sourceId: string
  entityType: 'vehicule' | 'conducteur'
  entityId: string
  entityLabel: string
  type: string
  typeCode: string
  numero?: string
  dateEmission?: string
  dateExpiration?: string
  statut: 'valide' | 'proche' | 'expire' | 'absent'
}

const lignes = computed<LigneDocument[]>(() => {
  const veh: LigneDocument[] = docsVehicule.liste.map(d => ({
    cle: `veh:${d.id}`, sourceId: d.id, entityType: 'vehicule', entityId: d.vehiculeId,
    entityLabel: vehicules.parId(d.vehiculeId)?.immatriculation ?? d.vehiculeId,
    type: d.type, typeCode: d.type, numero: d.numero, dateEmission: d.dateEmission,
    dateExpiration: d.echeance, statut: docsVehicule.etat(d),
  }))
  const per: LigneDocument[] = docsPersonnel.liste.map(d => ({
    cle: `per:${d.id}`, sourceId: d.id, entityType: 'conducteur', entityId: d.personnelId,
    entityLabel: personnel.parId(d.personnelId)?.matricule ?? d.personnelId,
    type: d.libelle, typeCode: d.type, numero: d.reference, dateEmission: d.dateDelivrance,
    dateExpiration: d.dateExpiration, statut: docsPersonnel.etat(d),
  }))
  return [...veh, ...per]
})

const documentsExpires = computed(() => lignes.value.filter(l => l.statut === 'expire'))
const documentsProches = computed(() => lignes.value.filter(l => l.statut === 'proche'))

const kpis = computed(() => {
  const valides = lignes.value.filter(l => l.statut === 'valide').length
  return [
    { label: 'Total', value: lignes.value.length, color: 'text-foreground' },
    { label: 'Valides', value: valides, color: 'text-success' },
    { label: 'Expirés', value: documentsExpires.value.length, color: 'text-danger' },
    { label: `Expirent < ${params.value.preavisDocumentaireJours} j`, value: documentsProches.value.length, color: 'text-warning' },
  ]
})

const searchQuery = ref('')
const filterEntity = ref('')
const filterType = ref('')
const filterStatut = ref('')
const page = ref(1)
const pageSize = ref(15)

const optEntity: DropdownItem[] = [{ id: 'vehicule', label: 'Véhicules' }, { id: 'conducteur', label: 'Conducteurs' }]
const optType = computed<DropdownItem[]>(() => [...new Set(lignes.value.map(l => l.type))].map(t => ({ id: t, label: t })))
const optStatut: DropdownItem[] = [
  { id: 'valide', label: 'Valide' }, { id: 'proche', label: 'À renouveler' }, { id: 'expire', label: 'Expiré' },
]

watch([filterEntity, filterType, filterStatut, searchQuery, pageSize], () => { page.value = 1 })

const filtered = computed(() => lignes.value.filter(l => {
  if (filterEntity.value && l.entityType !== filterEntity.value) return false
  if (filterType.value && l.type !== filterType.value) return false
  if (filterStatut.value && l.statut !== filterStatut.value) return false
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    if (!`${l.entityLabel} ${l.type}`.toLowerCase().includes(q)) return false
  }
  return true
}))

const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })

const columns = computed<ListColumn[]>(() => [
  { key: 'entite', label: 'Entité', hideable: false, width: 130 },
  { key: 'type', label: 'Type de document', width: 190 },
  { key: 'emission', label: 'Émission', width: 110 },
  { key: 'expiration', label: 'Expiration', width: 120 },
  { key: 'statut', label: 'Statut', width: 110 },
  { key: 'actions', label: 'Actions', width: 130 },
])

function fmtDate(d?: string) { return formatDate(d) }
const STATUT_CLS: Record<string, string> = { valide: 'bg-success-bg text-success', proche: 'bg-warning-bg text-warning', expire: 'bg-danger-bg text-danger', absent: 'bg-neutral-bg text-neutral' }
const STATUT_LIB: Record<string, string> = { valide: 'Valide', proche: 'À renouveler', expire: 'Expiré', absent: 'Non renseigné' }
function classeStatut(s: string) { return STATUT_CLS[s] ?? '' }
function libelleStatut(s: string) { return STATUT_LIB[s] ?? s }
function classeEcheance(s: string) { return STATUT_CLS[s] ?? '' }
function classeBanniere(s: string) { return s === 'expire' ? 'bg-danger-bg text-danger' : s === 'proche' ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success' }
function libelleBanniere(item: LigneDocument) {
  if (item.statut === 'expire') return 'Document expiré, régularisation requise.'
  if (item.statut === 'proche') return `Expire dans moins de ${params.value.preavisDocumentaireJours} jours.`
  return 'Document en règle.'
}

/* ── Ajout / modification ────────────────────────────────── */
const showModal = ref(false)
const editingDoc = ref<LigneDocument | null>(null)
const formError = ref('')
const form = ref({ entityType: 'vehicule' as 'vehicule' | 'conducteur', entityId: '', type: '', numero: '', dateEmission: '', dateExpiration: '' })

function openModal(doc?: LigneDocument) {
  formError.value = ''
  editingDoc.value = doc ?? null
  if (doc) {
    form.value = { entityType: doc.entityType, entityId: doc.entityId, type: doc.typeCode, numero: doc.numero ?? '', dateEmission: doc.dateEmission ?? '', dateExpiration: doc.dateExpiration ?? '' }
  } else {
    form.value = { entityType: 'vehicule', entityId: '', type: '', numero: '', dateEmission: '', dateExpiration: '' }
  }
  showModal.value = true
}
function openDetail(row: LigneDocument) { openModal(row) }

const optEntitiesForForm = computed<DropdownItem[]>(() => form.value.entityType === 'vehicule'
  ? vehicules.tracteurs.map(v => ({ id: v.id, label: v.immatriculation }))
  : personnel.conducteurs.map(c => ({ id: c.id, label: `${c.nomComplet} (${c.matricule})` })))

const TYPES_VEHICULE: TypeDocumentVehicule[] = ['Carte grise', 'Assurance véhicule', 'Visite technique', 'Vignette', 'Carte fiscale']
const optTypesForForm = computed<DropdownItem[]>(() => form.value.entityType === 'vehicule'
  ? TYPES_VEHICULE.map(t => ({ id: t, label: t }))
  : (Object.keys(LIBELLE_TYPE_DOC) as TypeDocument[]).map(t => ({ id: t, label: LIBELLE_TYPE_DOC[t] })))

function handleSubmit() {
  formError.value = ''
  if (!form.value.entityId) { formError.value = 'Choisissez une entité.'; return }
  if (!form.value.type) { formError.value = 'Choisissez un type de document.'; return }

  if (form.value.entityType === 'vehicule') {
    const donnees = { vehiculeId: form.value.entityId, type: form.value.type as TypeDocumentVehicule, numero: form.value.numero || undefined, dateEmission: form.value.dateEmission || undefined, echeance: form.value.dateExpiration }
    if (editingDoc.value) docsVehicule.modifier(editingDoc.value.sourceId, donnees)
    else docsVehicule.creer(donnees)
  } else {
    const type = form.value.type as TypeDocument
    const donnees = { personnelId: form.value.entityId, type, libelle: LIBELLE_TYPE_DOC[type], reference: form.value.numero || undefined, dateDelivrance: form.value.dateEmission, dateExpiration: form.value.dateExpiration || undefined }
    if (editingDoc.value) docsPersonnel.modifier(editingDoc.value.sourceId, donnees)
    else docsPersonnel.creer(donnees)
  }
  showModal.value = false
}

const deleteTarget = ref<LigneDocument | null>(null)
function confirmDelete(doc: LigneDocument) { deleteTarget.value = doc }
function doDelete() {
  if (!deleteTarget.value) return
  if (deleteTarget.value.entityType === 'vehicule') docsVehicule.supprimer(deleteTarget.value.sourceId)
  else docsPersonnel.supprimer(deleteTarget.value.sourceId)
  deleteTarget.value = null
}
</script>
