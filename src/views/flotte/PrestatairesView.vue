<template>
  <ListPageLayout
    title="Prestataires"
    :subtitle="`${store.prestataires.filter(p => p.autorise).length} autorisé(s) · ${store.prestataires.filter(p => !p.autorise).length} non autorisé(s)`"
    :columns="columns" :items="pageItems" :total="totalCount" :total-text="`${totalCount} prestataire(s)`"
    search-placeholder="Nom, contact, téléphone…" scope-label="Type :" :scope-options="scopeOptions"
    v-model:scope="scope" v-model:search-query="searchQuery" v-model:page="page" v-model:page-size="pageSize"
    @reset-filters="resetFilters" @open-card="(p: any) => ficheId = p.id"
  >
    <template #header-actions>
      <div class="flex gap-2">
        <button :class="L.btnOutline" @click="importOuvert = true"><Upload class="w-4 h-4" /> Importer</button>
        <button :class="L.btnPrimary" @click="creationOuverte = true"><Plus class="w-4 h-4" /> Nouveau prestataire</button>
      </div>
    </template>
    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="[L.kpiItem, k.actif && 'ring-1 ring-primary']" class="cursor-pointer" @click="choisirKpi(k.filtre)">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
          <div><div :class="L.kpiItemVal">{{ k.value }}</div><div :class="L.kpiItemLbl">{{ k.label }}</div></div>
        </div>
      </div>
    </template>
    <template #filters>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Autorisation</label>
        <SearchableDropdown v-model="filtreAutorisation" :items="optAutorisation" placeholder="Tous" compact />
      </div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer text-left hover:text-primary" @click="resetFilters">Réinitialiser</button>
    </template>
    <template #cell-nom="{ item }">
      <button class="font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer text-left text-xs" @click.stop="ficheId = item.id">{{ item.nom }}</button>
      <div class="text-[11px] text-muted-foreground font-mono">{{ item.id }}</div>
    </template>
    <template #cell-type="{ item }"><span class="text-xs">{{ libelleType(item.type) }}</span></template>
    <template #cell-contact="{ item }"><span class="text-xs">{{ item.contact ?? '-' }}</span><div class="text-[11px] text-muted-foreground">{{ item.telephone ?? '' }}</div></template>
    <template #cell-contrats="{ item }"><span class="text-xs">{{ contratsEnCours(item).length }} en cours</span><div class="text-[11px] text-muted-foreground">{{ item.contrats?.length ?? 0 }} au total</div></template>
    <template #cell-autorisation="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="item.autorise ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ item.autorise ? 'Autorisé' : 'Non autorisé' }}</span>
    </template>
    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="item.autorise ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ item.autorise ? 'Autorisé' : 'Non autorisé' }}</span>
          <div class="font-semibold text-foreground mt-1.5">{{ item.nom }}</div>
          <div class="text-xs text-muted-foreground">{{ libelleType(item.type) }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Contact</div>{{ item.contact ?? '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Téléphone</div>{{ item.telephone ?? '-' }}</div>
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">E-mail</div>{{ item.email ?? '-' }}</div>
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Contrats en cours</div>{{ contratsEnCours(item).map(c => c.objet).join(', ') || '-' }}</div>
        </div>
        <p v-if="!item.autorise && item.motifNonAutorise" class="bg-danger-bg text-danger rounded-md px-2.5 py-2 text-[11px]">{{ item.motifNonAutorise }}</p>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ficheId = item.id">Ouvrir la fiche</button>
      </div>
    </template>
    <template #empty><Handshake class="w-8 h-8" /><p class="text-sm">Aucun prestataire</p></template>
  </ListPageLayout>
  <PrestataireCard v-if="ficheId" :key="ficheId" :ids="filtered.some(p => p.id === ficheId) ? filtered.map(p => p.id) : [ficheId]" :prestataire-id="ficheId" @close="ficheId = null" />
  <PrestataireFormModal v-if="creationOuverte" @close="creationOuverte = false" @cree="id => { creationOuverte = false; ficheId = id }" />
  <ImportCsvModal
    v-if="importOuvert"
    titre="Importer des prestataires"
    :champs="CHAMPS_IMPORT"
    :apercu-colonnes="[{ cle: 'nom', libelle: 'Nom' }, { cle: 'typeLibelle', libelle: 'Type' }, { cle: 'telephone', libelle: 'Téléphone' }]"
    :modele="['Nom', 'Type', 'Contact', 'Téléphone', 'E-mail', 'Adresse']"
    description-controles="Nom obligatoire, type connu, pas de doublon."
    :valider="validerLigne"
    @close="importOuvert = false"
    @importer="importer"
  />
</template>

<script setup lang="ts">
/** Référentiel des prestataires (FMS-DB-13) : type, coordonnées, contrats, autorisation à travailler avec l'entreprise. */
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Ban, CircleCheck, FileText, Handshake, Plus, Upload } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import ImportCsvModal from '../../components/ui/ImportCsvModal.vue'
import type { ChampImport, LigneValidee } from '../../components/ui/ImportCsvModal.vue'
import PrestataireCard from '../../components/flotte/PrestataireCard.vue'
import PrestataireFormModal from '../../components/flotte/PrestataireFormModal.vue'
import { usePrestatairesStore, type Prestataire } from '../../stores/prestataires'
import { aujourdhuiISO } from '../../utils/horloge'
import * as L from '../../lib/listClasses'

const store = usePrestatairesStore()
const route = useRoute()
const scope = ref('')
const scopeOptions = computed(() => [{ value: '', label: 'Tous' }, ...store.types.map(t => ({ value: t.code, label: t.libelle }))])
const searchQuery = ref(''); const page = ref(1); const pageSize = ref(15)
const filtreAutorisation = ref('')
const optAutorisation: DropdownItem[] = [{ id: 'oui', label: 'Autorisés' }, { id: 'non', label: 'Non autorisés' }]
/** Indicateur « Contrats en cours » : ne garde que les prestataires qui ont un contrat en cours. */
const filtreContrats = ref(false)
const ficheId = ref<string | null>(typeof route.query.prestataire === 'string' ? route.query.prestataire : null)
const creationOuverte = ref(false); const importOuvert = ref(false)
watch([scope, searchQuery, pageSize, filtreAutorisation, filtreContrats], () => { page.value = 1 })
function resetFilters() { scope.value = ''; searchQuery.value = ''; filtreAutorisation.value = ''; filtreContrats.value = false; page.value = 1 }
const libelleType = (code: string) => store.types.find(t => t.code === code)?.libelle ?? code
const contratsEnCours = (p: Prestataire) => (p.contrats ?? []).filter(c => c.debut <= aujourdhuiISO() && (!c.fin || c.fin >= aujourdhuiISO()))

const filtered = computed(() => store.prestataires.filter(p => {
  if (scope.value && p.type !== scope.value) return false
  if (filtreAutorisation.value === 'oui' && !p.autorise) return false
  if (filtreAutorisation.value === 'non' && p.autorise) return false
  if (filtreContrats.value && !contratsEnCours(p).length) return false
  const q = searchQuery.value.toLowerCase()
  return !q || `${p.nom} ${p.contact ?? ''} ${p.telephone ?? ''} ${p.email ?? ''}`.toLowerCase().includes(q)
}).sort((a, b) => a.nom.localeCompare(b.nom)))
const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })
function choisirKpi(f: string) {
  if (f === 'contrats') { filtreContrats.value = true; filtreAutorisation.value = ''; return }
  filtreContrats.value = false; filtreAutorisation.value = f
}
const kpis = computed(() => [
  { label: 'Prestataires', value: store.prestataires.length, filtre: '', actif: !filtreAutorisation.value && !filtreContrats.value, icon: Handshake, bg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: 'Autorisés', value: store.prestataires.filter(p => p.autorise).length, filtre: 'oui', actif: filtreAutorisation.value === 'oui', icon: CircleCheck, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: 'Non autorisés', value: store.prestataires.filter(p => !p.autorise).length, filtre: 'non', actif: filtreAutorisation.value === 'non', icon: Ban, bg: 'bg-danger-bg', iconColor: 'text-danger' },
  { label: 'Contrats en cours', value: store.prestataires.reduce((s, p) => s + contratsEnCours(p).length, 0), filtre: 'contrats', actif: filtreContrats.value, icon: FileText, bg: 'bg-info-bg', iconColor: 'text-info' },
])
const columns = computed<ListColumn[]>(() => [
  { key: 'nom', label: 'Prestataire', hideable: false, width: 240 },
  { key: 'type', label: 'Type', width: 180 },
  { key: 'contact', label: 'Contact', width: 180 },
  { key: 'contrats', label: 'Contrats', width: 120 },
  { key: 'autorisation', label: 'Autorisation', width: 120 },
])

/* ── Reprise depuis le système de gestion de l'entreprise, par fichier ── */
const CHAMPS_IMPORT: ChampImport[] = [
  { cle: 'nom', libelle: 'Nom', requis: true }, { cle: 'type', libelle: 'Type', requis: true },
  { cle: 'contact', libelle: 'Contact', requis: false }, { cle: 'telephone', libelle: 'Téléphone', requis: false },
  { cle: 'email', libelle: 'E-mail', requis: false }, { cle: 'adresse', libelle: 'Adresse', requis: false },
]
const vus = new Map<string, Record<string, string>>()
watch(importOuvert, () => vus.clear())
const norm = (x: string) => x.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
function validerLigne(ligne: Record<string, string>, mapping: Record<string, string>): LigneValidee {
  const val = (c: string) => (mapping[c] ? (ligne[mapping[c]!] ?? '').trim() : '')
  const nom = val('nom'); const typeSaisi = val('type')
  if (!nom) return { valide: false, motif: 'Nom manquant' }
  const type = store.types.find(t => norm(t.code) === norm(typeSaisi) || norm(t.libelle) === norm(typeSaisi))
  if (!type) return { valide: false, motif: `Type non reconnu « ${typeSaisi} »` }
  if (store.prestataires.some(p => norm(p.nom) === norm(nom) && p.type === type.code)) return { valide: false, motif: `Déjà dans le référentiel (${nom})` }
  const cle = `${norm(nom)}|${type.code}`
  const premiere = vus.get(cle)
  if (premiere && premiere !== ligne) return { valide: false, motif: `En double dans le fichier (${nom})` }
  vus.set(cle, ligne)
  const email = val('email')
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { valide: false, motif: `E-mail invalide (${email})` }
  return { valide: true, donnees: { nom, type: type.code, typeLibelle: type.libelle, contact: val('contact'), telephone: val('telephone'), email, adresse: val('adresse') } }
}
function importer(lignes: Record<string, unknown>[]) {
  lignes.forEach(l => store.creer({ nom: String(l.nom), type: String(l.type), contact: String(l.contact || '') || undefined, telephone: String(l.telephone || '') || undefined,
    email: String(l.email || '') || undefined, adresse: String(l.adresse || '') || undefined, autorise: true, source: 'import' }))
}
</script>
