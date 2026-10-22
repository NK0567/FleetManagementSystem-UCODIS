<template>
  <ListPageLayout
    title="Conducteurs"
    :subtitle="`${personnel.conducteurs.length} conducteur(s) et ${personnel.aides.length} aide(s) · ${nonAffectables.length} non affectable(s)`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} personne(s)`"
    search-placeholder="Nom, matricule, n° de permis…"
    scope-label="Fonction :"
    :scope-options="scopeOptions"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(c) => ouvrirFiche((c as Personnel).id)"
  >
    <template #header-actions>
      <RouterLink v-if="config.parametres.gestionPersonnelRaccordee" :to="{ name: 'admin-employes' }" :class="L.btnOutline" class="no-underline"><Users class="w-4 h-4" /> Gérer les personnes dans Employés</RouterLink>
      <template v-else>
        <button :class="L.btnOutline" @click="importOuvert = true"><Upload class="w-4 h-4" /> Importer</button>
        <button :class="L.btnPrimary" @click="creationOuverte = true"><Plus class="w-4 h-4" /> Nouvelle personne</button>
      </template>
    </template>

    <template #filters>
      <div :class="L.fpField"><label :class="L.fpFieldLabel">Affectation</label><SearchableDropdown v-model="filtreAffectation" :items="optAffectation" placeholder="Toutes" compact /></div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer hover:text-primary" @click="resetFilters">Réinitialiser</button>
    </template>

    <template #above-table>
      <div v-if="nonAffectables.length" class="flex items-start gap-2.5 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3.5">
        <ShieldAlert class="w-4 h-4 shrink-0 mt-px" />
        <p class="text-xs leading-relaxed">
          {{ nonAffectables.length }} conducteur(s) ne peuvent pas être affectés :
          <span v-for="(c, i) in nonAffectables" :key="c.id">{{ i ? ' · ' : '' }}{{ c.nomComplet }} ({{ motifBlocage(c.id) }})</span>.
        </p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
          <div><div :class="L.kpiItemVal">{{ k.value }}</div><div :class="L.kpiItemLbl">{{ k.label }}</div></div>
        </div>
      </div>
    </template>

    <template #cell-conducteur="{ item }">
      <div class="flex items-center gap-2">
        <UserAvatar :nom="item.nomComplet" taille="sm" />
        <div>
          <p class="font-medium text-foreground text-xs">{{ item.nomComplet }}</p>
          <p class="text-[11px] text-muted-foreground">{{ item.matricule }} · {{ item.fonctionLibelle }}</p>
        </div>
      </div>
    </template>
    <template #cell-pieces="{ item }">
      <div v-for="pc in piecesSuivies(item.id)" :key="pc.code" class="text-[11px] truncate">
        {{ pc.libelle }} : <span class="font-medium px-1.5 py-0.5 rounded" :class="classeDoc(pc.doc)">{{ texteDoc(pc) }}</span>
      </div>
    </template>
    <template #cell-score="{ item }">
      <span v-if="!estRoulant(item)" class="text-muted-foreground text-xs">-</span>
      <div v-else class="flex items-center gap-2">
        <div class="w-16 h-1.5 bg-background rounded-full overflow-hidden"><div class="h-full rounded-full" :class="barreScore(scoreDe(item.id))" :style="{ width: scoreDe(item.id) + '%' }"></div></div>
        <span class="text-xs font-semibold" :class="texteScore(scoreDe(item.id))">{{ scoreDe(item.id) }}</span>
      </div>
    </template>
    <template #cell-statut="{ item }">
      <span v-if="!estRoulant(item)" class="text-muted-foreground text-xs">-</span>
      <span v-else-if="motifBlocage(item.id)" class="text-xs font-medium px-2 py-0.5 rounded-full bg-danger-bg text-danger">Non affectable</span>
      <span v-else class="text-xs font-medium px-2 py-0.5 rounded-full" :class="estAffecte(item.id) ? 'bg-primary/10 text-primary' : 'bg-success-bg text-success'">{{ estAffecte(item.id) ? 'Affecté' : 'Affectable' }}</span>
    </template>
    <template #cell-disponibilite="{ item }">
      <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="LIB_DISPONIBILITE[dispos.disponibilite(item.id).etat].cls">{{ LIB_DISPONIBILITE[dispos.disponibilite(item.id).etat].label }}</span>
      <div v-if="dispos.disponibilite(item.id).detail" class="text-[11px] text-muted-foreground truncate">{{ dispos.disponibilite(item.id).detail }}</div>
    </template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <UserAvatar :nom="item.nomComplet" taille="md" />
          <div>
            <div class="font-semibold text-foreground">{{ item.nomComplet }}</div>
            <div class="text-xs text-muted-foreground">{{ item.matricule }}</div>
          </div>
        </div>

        <div v-if="estRoulant(item) && motifBlocage(item.id)" class="bg-danger-bg text-danger rounded-md px-2.5 py-2 text-[11px] leading-snug">
          Affectation refusée : {{ motifBlocage(item.id) }}
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div v-for="pc in piecesSuivies(item.id)" :key="pc.code"><div class="text-muted-foreground text-[11px]">{{ pc.libelle }}</div><span :class="classeDoc(pc.doc)" class="px-1.5 py-0.5 rounded">{{ texteDoc(pc) }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Score conduite</div><span :class="texteScore(scoreDe(item.id))" class="font-semibold">{{ scoreDe(item.id) }} / 100</span></div>
          <div><div class="text-muted-foreground text-[11px]">Écarts</div>{{ ecartsStore.ecartsDuChauffeur(item.id).length }}</div>
        </div>

        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirFiche(item.id)">Ouvrir la fiche</button>
      </div>
    </template>

    <template #empty>
      <User class="w-8 h-8" />
      <p class="text-sm">Aucune personne trouvée</p>
    </template>

 <NouveauConducteurModal v-if="creationOuverte" @close="creationOuverte = false" @cree="id => { creationOuverte = false; ficheId = id }" />
    <ImportCsvModal v-if="importOuvert" titre="Importer des personnes" :champs="CHAMPS_IMPORT" import-id="personnes" :apercu-colonnes="COLONNES_APERCU" :modele="MODELE_CSV"
      description-controles="Prénom, nom, fonction et pièce d'identité obligatoires ; fonction connue ; pièce d'identité unique."
      :valider="validerLigne" @close="importOuvert = false" @importer="lignes => importer(lignes as unknown as LigneImport[])" />
    <ConducteurFicheCard v-if="ficheId" :conducteurs="filtered" :conducteur-id="ficheId" @close="ficheId = null" @voir-page-complete="voirPageComplete" />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { useIndicateursStore } from '../../stores/indicateurs'
import { useFormationsStore } from '../../stores/formations'
import { computed, ref, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useConfigurationStore } from '../../stores/configuration'
import { Plus, ShieldAlert, Upload, User, UserCheck, Users, UserX } from '@lucide/vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import NouveauConducteurModal from '../../components/flotte/NouveauConducteurModal.vue'
import { IMPORTS } from '../../stores/imports'
import ImportCsvModal from '../../components/ui/ImportCsvModal.vue'
import type { ChampImport, LigneValidee } from '../../components/ui/ImportCsvModal.vue'
import { useFonctionStore } from '../../stores/fonctions'
import { useEntiteStore } from '../../stores/entites'
import { aujourdhuiISO } from '../../utils/horloge'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import ConducteurFicheCard from '../../components/flotte/ConducteurFicheCard.vue'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useDocumentsStore } from '../../stores/documentsPersonnel'
import { useEcartsStore } from '../../stores/ecarts'
import { useScoresConducteursStore } from '../../stores/scoresConducteurs'
import { useDisponibilitesStore, LIB_DISPONIBILITE } from '../../stores/disponibilites'
import type { Personnel } from '../../types'
import { formatDate } from '../../utils/helpers'
import * as L from '../../lib/listClasses'

const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const docsPersonnel = useDocumentsStore()
const ecartsStore = useEcartsStore()
const scoresStore = useScoresConducteursStore()
const dispos = useDisponibilitesStore()
/** Conducteurs et aides conducteurs, distingués par leur fonction (FMS-DB-09). */
const roulants = computed(() => [...personnel.conducteurs, ...personnel.aides])
const estRoulant = (p: Personnel) => personnel.estConducteur(p) || personnel.estAide(p)
const router = useRouter()
const config = useConfigurationStore()

const searchQuery = ref('')
const activeScope = ref('')
const ficheId = ref<string | null>(null)
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSize = ref(15)

/** État du document selon son propre délai de préavis, comme partout ailleurs. */
/** Pièces obligatoires datées ou non en règle : celles dont l'échéance se suit. */
function piecesSuivies(id: string) { return docsPersonnel.piecesObligatoires(id).filter(pc => !pc.valide || !!pc.doc?.dateExpiration) }
function texteDoc(pc: ReturnType<typeof piecesSuivies>[number]) {
  if (!pc.doc) return 'absente'
  if (pc.etat === 'annule') return 'annulée'
  if (pc.etat === 'perdu') return 'perdue'
  return pc.doc.dateExpiration ? formatDate(pc.doc.dateExpiration) : 'sans échéance'
}
function classeDoc(doc?: Parameters<typeof docsPersonnel.etat>[0]) {
  const e = doc ? docsPersonnel.etat(doc) : null
  return !doc || e === 'expire' || e === 'annule' || e === 'perdu' ? 'bg-danger-bg text-danger' : e === 'proche' ? 'bg-warning-bg text-warning' : 'text-muted-foreground'
}
function motifBlocage(id: string) {
  const e = dispos.eligibilite(id)
  return e.ok ? null : e.motif ?? null
}
const nonAffectables = computed(() => roulants.value.filter(c => motifBlocage(c.id)))
function estAffecte(id: string) { return !!vehicules.affectations.find(a => a.conducteurId === id && !a.dateFin) }
/** Engagé ce jour-là : en mission ou sur une mission planifiée à la date du jour. */
function estEngage(id: string) { const e = dispos.disponibilite(id).etat; return e === 'en_mission' || e === 'mission_planifiee' }
const estDisponibleAffectable = (id: string) => !motifBlocage(id) && !estAffecte(id) && !estEngage(id)
/** Numéro du permis de conduire, pour la recherche. */
function numeroPermis(id: string) { return docsPersonnel.parPersonnel(id).find(d => d.type === 'permis')?.reference ?? '' }

/** Score de conduite : le même calcul que la page du conducteur (FMS-SC-07). */
function scoreDe(id: string) { return scoresStore.scoreGlobal(id) }
/** Bandes du score : cible de l'indicateur, puis seuil de formation (paramétrage). */
const indScore = useIndicateursStore()
const formationsScore = useFormationsStore()
const bandeScore = (s: number) => s >= (indScore.cible('score') ?? 80) ? 0 : s >= formationsScore.seuilScore ? 1 : 2
function barreScore(s: number) { return ['bg-success', 'bg-warning', 'bg-danger'][bandeScore(s)] }
function texteScore(s: number) { return ['text-success', 'text-warning', 'text-danger'][bandeScore(s)] }

const kpis = computed(() => [
  { label: 'Conducteurs et aides', value: roulants.value.length, icon: Users, bg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: 'Disponibles et affectables', value: roulants.value.filter(c => estDisponibleAffectable(c.id)).length, icon: UserCheck, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: 'Non affectables', value: nonAffectables.value.length, icon: UserX, bg: 'bg-danger-bg', iconColor: 'text-danger' },
  { label: 'Échéances proches', value: roulants.value.filter(c => docsPersonnel.parPersonnel(c.id).some(d => docsPersonnel.etat(d) === 'proche')).length, icon: ShieldAlert, bg: 'bg-warning-bg', iconColor: 'text-warning' },
])

const scopeOptions = [
  { value: '', label: 'Conducteurs et aides' },
  { value: 'conducteurs', label: 'Conducteurs' },
  { value: 'aides', label: 'Aides conducteurs' },
  { value: 'tous', label: 'Tout le personnel' },
]
const filtreAffectation = ref('')
const optAffectation: DropdownItem[] = [
  { id: '', label: 'Toutes' },
  { id: 'disponible', label: 'Disponibles et affectables' },
  { id: 'affecte', label: 'Affectés' },
  { id: 'bloque', label: 'Non affectables' },
]

const columns = computed<ListColumn[]>(() => [
  { key: 'conducteur', label: 'Conducteur', sortable: true, hideable: false, width: 170 },
  { key: 'pieces', label: 'Pièces obligatoires', width: 230 },
  { key: 'score', label: 'Score conduite', width: 130 },
  { key: 'statut', label: 'Affectation', width: 130 },
  { key: 'disponibilite', label: 'Disponibilité', width: 170 },
])

watch([activeScope, searchQuery, pageSize, filtreAffectation], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; searchQuery.value = ''; filtreAffectation.value = ''; page.value = 1 }

const filtered = computed(() => {
  const base = activeScope.value === 'tous' ? personnel.actifs : roulants.value
  let rows = base.filter(c => {
    if (activeScope.value === 'conducteurs' && !personnel.estConducteur(c)) return false
    if (activeScope.value === 'aides' && !personnel.estAide(c)) return false
    if (filtreAffectation.value && !estRoulant(c)) return false
    if (filtreAffectation.value === 'disponible' && !estDisponibleAffectable(c.id)) return false
    if (filtreAffectation.value === 'affecte' && !estAffecte(c.id)) return false
    if (filtreAffectation.value === 'bloque' && !motifBlocage(c.id)) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!`${c.nomComplet} ${c.matricule} ${numeroPermis(c.id)}`.toLowerCase().includes(q)) return false
    }
    return true
  })
  if (sortKey.value) {
    /* La colonne Conducteur se trie sur le nom complet. */
    const k = (sortKey.value === 'conducteur' ? 'nomComplet' : sortKey.value) as keyof Personnel
    rows = [...rows].sort((a, b) => {
      const cmp = String(a[k] ?? '').localeCompare(String(b[k] ?? ''), 'fr')
      return sortDir.value === 'asc' ? cmp : -cmp
    })
  }
  return rows
})

const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })

function ouvrirFiche(id: string) { ficheId.value = id }

/* ── Saisie et import dans le FMS, sans dépendre d'un module du personnel (FMS-DB-08) ── */
const creationOuverte = ref(false)
const importOuvert = ref(false)
const fonctions = useFonctionStore()
const entites = useEntiteStore()
const CHAMPS_IMPORT: ChampImport[] = IMPORTS.personnes.champs
const COLONNES_APERCU = [{ cle: 'nomComplet', libelle: 'Nom' }, { cle: 'fonctionLibelle', libelle: 'Fonction' }, { cle: 'cin', libelle: "Pièce d'identité" }]
const MODELE_CSV = ['Prénom', 'Nom', 'Fonction', "Pièce d'identité", 'Téléphone', "Date d'entrée"]
interface LigneImport { prenom: string; nom: string; nomComplet: string; fonctionId: string; fonctionLibelle: string; cin: string; telephone: string; dateEntree: string }
const vusImport = new Set<string>()
watch(importOuvert, () => vusImport.clear())
const norm = (x: string) => x.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
/** Toutes les fonctions de l'entreprise s'importent : conducteurs, aides et personnel technique. */
function validerLigne(ligne: Record<string, string>, mapping: Record<string, string>): LigneValidee {
  const val = (c: string) => (mapping[c] ? (ligne[mapping[c]!] ?? '').trim() : '')
  const prenom = val('prenom'), nom = val('nom'), cin = val('cin')
  if (!prenom || !nom) return { valide: false, motif: 'Prénom ou nom manquant' }
  if (!cin) return { valide: false, motif: "Pièce d'identité manquante" }
  const fn = fonctions.liste.find(f => norm(f.libelle) === norm(val('fonction')) || norm(f.code) === norm(val('fonction')))
  if (!fn) return { valide: false, motif: `Fonction non reconnue « ${val('fonction')} »` }
  if (personnel.liste.some(p => p.cin === cin)) return { valide: false, motif: `Pièce d'identité déjà enregistrée (${cin})` }
  if (vusImport.has(cin)) return { valide: false, motif: `Pièce d'identité en double dans le fichier (${cin})` }
  const dateEntree = val('dateEntree')
  if (dateEntree && !/^\d{4}-\d{2}-\d{2}$/.test(dateEntree)) return { valide: false, motif: `Date d'entrée invalide « ${dateEntree} » (format AAAA-MM-JJ)` }
  vusImport.add(cin)
  const l: LigneImport = { prenom, nom: nom.toUpperCase(), nomComplet: `${prenom} ${nom.toUpperCase()}`, fonctionId: fn.id, fonctionLibelle: fn.libelle, cin, telephone: val('telephone'), dateEntree: dateEntree || aujourdhuiISO() }
  return { valide: true, donnees: l as unknown as Record<string, unknown> }
}
function importer(lignes: LigneImport[]) {
  lignes.forEach(l => {
    const fn = fonctions.parId(l.fonctionId)!
    personnel.creer({ prenom: l.prenom, nom: l.nom, fonctionId: fn.id, fonctionLibelle: fn.libelle, entiteId: fn.entiteId, entiteNom: entites.parId(fn.entiteId)?.nom ?? '',
      site: '', telephone: l.telephone, cin: l.cin, dateNaissance: '', contrat: config.parametres.typesContrat[0] ?? '', dateEntree: l.dateEntree, conduit: fn.conduit })
  })
  /* La fenêtre reste ouverte pour que le rapport d'import se lise. */
}
function voirPageComplete(id: string) { router.push({ name: 'flotte-conducteur-dashboard', params: { id } }) }
</script>
