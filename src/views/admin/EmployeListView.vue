<template>
  <ListPageLayout
    title="Employés"
    :subtitle="`${personnel.liste.length} employé(s) enregistré(s)`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} employé(s)`"
    search-placeholder="Rechercher un employé…"
    :page-size-options="[15, 25, 50]"
    scope-label="Statut :"
    :scope-options="scopeOptions"
    v-model:scope="scope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="openCard"
  >
    <template #header-actions>
      <div class="flex gap-2">
        <button :class="L.btnOutline" @click="showImport = true"><Upload class="w-4 h-4" /> Importer</button>
        <button :class="L.btnPrimary" @click="showCreate = true"><UserPlus class="w-4 h-4" /> Nouvel employé</button>
      </div>
    </template>

    <template #above-table>
      <div class="grid grid-cols-4 gap-2.5 mb-3.5 max-md:grid-cols-2">
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-info-bg"><Users class="w-[18px] h-[18px] text-info" /></div>
          <div><div :class="L.kpiItemVal">{{ personnel.liste.length }}</div><div :class="L.kpiItemLbl">Total</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-success-bg"><UserCheck class="w-[18px] h-[18px] text-success" /></div>
          <div><div :class="L.kpiItemVal">{{ actifs }}</div><div :class="L.kpiItemLbl">Actifs</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-primary/10"><Truck class="w-[18px] h-[18px] text-primary" /></div>
          <div><div :class="L.kpiItemVal">{{ personnel.roulants.length }}</div><div :class="L.kpiItemLbl">Personnel roulant</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-neutral-bg"><UserX class="w-[18px] h-[18px] text-neutral" /></div>
          <div><div :class="L.kpiItemVal">{{ sortis }}</div><div :class="L.kpiItemLbl">Sortis</div></div>
        </div>
      </div>
    </template>

    <template #filters>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Entité</label>
        <SearchableDropdown v-model="fEntite" :items="optEntites" placeholder="Toutes les entités" compact />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Fonction</label>
        <SearchableDropdown v-model="fFonction" :items="optFonctions" placeholder="Toutes les fonctions" compact />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Site</label>
        <SearchableDropdown v-model="fSite" :items="optSites" placeholder="Tous les sites" compact />
      </div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer text-left hover:text-primary"
              @click="resetFilters">Réinitialiser les filtres</button>
    </template>

    <template #cell-matricule="{ item }">
      <span class="font-mono text-xs font-semibold text-primary">{{ item.matricule }}</span>
    </template>

    <template #cell-employe="{ item }">
      <div class="flex items-center gap-2.5">
        <UserAvatar :nom="item.nomComplet" taille="md" />
        <div class="min-w-0">
          <div class="font-medium text-[13px] truncate flex items-center gap-1.5">
            <button class="hover:text-primary hover:underline transition-colors text-left bg-transparent border-0 p-0 cursor-pointer"
                    @click.stop="openCard(item)">{{ item.nomComplet }}</button>
            <Truck v-if="item.conduit" class="w-3.5 h-3.5 text-primary shrink-0" />
          </div>
          <div class="text-[11px] text-muted-foreground truncate">{{ item.telephone }}</div>
        </div>
      </div>
    </template>

    <template #cell-cin="{ item }">
      <span class="font-mono text-xs text-muted-foreground">{{ item.cin }}</span>
    </template>

    <template #cell-entiteNom="{ item }">
      <span class="text-xs text-muted-foreground truncate">{{ item.entiteNom }}</span>
    </template>

    <template #cell-fonctionLibelle="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
            :class="item.conduit ? 'bg-primary/10 text-primary' : 'bg-neutral-bg text-neutral'">
        {{ item.fonctionLibelle }}
      </span>
    </template>

    <template #cell-dateEntree="{ item }">
      <span class="text-muted-foreground text-xs">{{ formatDate(item.dateEntree) }}</span>
    </template>

    <template #cell-statut="{ item }">
      <StatusPill :statut="item.statut" />
    </template>

    <!-- Aperçu rapide : clic simple sur une ligne -->
    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3.5">
        <div class="flex items-center gap-2.5">
          <UserAvatar :nom="item.nomComplet" taille="lg" />
          <div class="min-w-0">
            <div class="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
              {{ item.nomComplet }}
              <Truck v-if="item.conduit" class="w-3.5 h-3.5 text-primary shrink-0" />
            </div>
            <div class="text-[11px] text-muted-foreground">{{ item.fonctionLibelle }}</div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap">
          <StatusPill :statut="item.statut" />
          <StatusPill v-if="item.conduit" :statut="item.habilite ? 'habilite' : 'non_habilite'" />
        </div>

        <div class="grid grid-cols-2 gap-2 text-[12px]">
          <div><div class="text-muted-foreground text-[11px]">Matricule</div>{{ item.matricule }}</div>
          <div><div class="text-muted-foreground text-[11px]">CIN</div>{{ item.cin }}</div>
          <div><div class="text-muted-foreground text-[11px]">Entité</div>{{ item.entiteNom }}</div>
          <div><div class="text-muted-foreground text-[11px]">Site</div>{{ item.site }}</div>
          <div><div class="text-muted-foreground text-[11px]">Contrat</div>{{ item.contrat }}</div>
          <div><div class="text-muted-foreground text-[11px]">Entrée</div>{{ formatDate(item.dateEntree) }}</div>
        </div>

        <div v-if="item.email" class="text-[12px]">
          <div class="text-muted-foreground text-[11px]">Courriel</div>{{ item.email }}
        </div>

        <div class="text-[12px]">
          <div class="text-muted-foreground text-[11px]">Pièces</div>
          <span :class="docs.enRegle(item.id) ? 'text-success font-medium' : 'text-danger font-medium'">
            {{ docs.enRegle(item.id) ? 'En règle' : 'À régulariser' }}
          </span>
        </div>

        <button :class="L.btnPrimary" class="w-full justify-center" @click="openCard(item)">
          Ouvrir la fiche
        </button>
      </div>
    </template>

    <template #empty>
      <Users class="w-8 h-8" />
      <p class="text-[13px]">Aucun employé trouvé.</p>
    </template>

    <!-- Fiche en superposition : double-clic sur une ligne -->
    <EmployeCard
      v-if="openCardId !== null"
      :employes="filtered"
      :employe-id="openCardId"
      @close="openCardId = null"
    />

    <NouvelEmployeModal
      :ouvert="showCreate"
      @fermer="showCreate = false"
      @cree="idCree => { showCreate = false; openCardId = idCree }"
    />

    <ImportCsvModal
      v-if="showImport"
      titre="Importer des employés"
      :champs="CHAMPS_IMPORT"
      :apercu-colonnes="COLONNES_APERCU"
      :modele="MODELE_CSV"
      description-controles="Contrôles appliqués : prénom et nom obligatoires, fonction et entité reconnues (par code ou par nom), CIN en double avec un employé déjà enregistré."
      :valider="validerLigneImport"
      @close="showImport = false"
      @importer="lignes => importerEmployes(lignes as unknown as LigneEmploye[])"
    />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Info, Truck, Upload, UserCheck, UserPlus, Users, UserX, X } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import EmployeCard from '../../components/cards/EmployeCard.vue'
import NouvelEmployeModal from '../../components/NouvelEmployeModal.vue'
import ImportCsvModal from '../../components/ui/ImportCsvModal.vue'
import type { ChampImport, LigneValidee } from '../../components/ui/ImportCsvModal.vue'
import * as L from '../../lib/listClasses'
import { formatDate } from '../../utils/helpers'
import { usePersonnelStore } from '../../stores/personnel'
import { useFonctionStore } from '../../stores/fonctions'
import { useEntiteStore } from '../../stores/entites'
import { useParametresStore } from '../../stores/parametres'
import { useDocumentsStore } from '../../stores/documentsPersonnel'
import { aujourdhuiISO } from '../../utils/horloge'
import type { Personnel } from '../../types'

const personnel = usePersonnelStore()
const fonctions = useFonctionStore()
const entites = useEntiteStore()
const params = useParametresStore()
const docs = useDocumentsStore()

const showImport = ref(false)
const showCreate = ref(false)
const openCardId = ref<string | null>(null)
function openCard(item: Personnel) { openCardId.value = item.id }

/** Ouverture directe depuis un lien externe (ex. tableau de bord conducteur), via ?ouvrir=<id>. */
const route = useRoute()
onMounted(() => {
  const id = route.query.ouvrir
  if (typeof id === 'string' && personnel.parId(id)) openCardId.value = id
})

const actifs = computed(() => personnel.liste.filter(p => p.statut === 'actif').length)
const sortis = computed(() => personnel.liste.filter(p => p.statut === 'archive').length)

const columns = computed<ListColumn[]>(() => [
  { key: 'matricule',       label: 'Matricule', sortable: true, hideable: false, width: 110 },
  { key: 'employe',         label: 'Employé',   sortable: true, width: 240 },
  { key: 'cin',             label: 'CIN',       sortable: false, width: 140 },
  { key: 'entiteNom',       label: 'Entité',    sortable: true, width: 190 },
  { key: 'fonctionLibelle', label: 'Fonction',  sortable: true, width: 170 },
  { key: 'dateEntree',      label: 'Entrée',    sortable: true, width: 110 },
  { key: 'statut',          label: 'Statut',    width: 110 },
])

const scopeOptions = [
  { value: '',         label: 'Tous' },
  { value: 'actif',    label: 'Actifs' },
  { value: 'conge',    label: 'En congé' },
  { value: 'suspendu', label: 'Suspendus' },
  { value: 'archive',  label: 'Sortis' },
]

const scope = ref('')
const fEntite = ref('')
const fFonction = ref('')
const fSite = ref('')
const searchQuery = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSize = ref(15)

watch([scope, fEntite, fFonction, fSite, searchQuery, pageSize], () => { page.value = 1 })

function resetFilters() {
  scope.value = ''; fEntite.value = ''; fFonction.value = ''; fSite.value = ''
  searchQuery.value = ''; page.value = 1
}

const filtered = computed(() => {
  let rows = personnel.liste.filter(p => {
    if (scope.value ? p.statut !== scope.value : p.statut === 'archive') return false
    if (fEntite.value && p.entiteId !== fEntite.value) return false
    if (fFonction.value && p.fonctionId !== fFonction.value) return false
    if (fSite.value && p.site !== fSite.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const cible = `${p.nomComplet} ${p.matricule} ${p.cin} ${p.fonctionLibelle}`.toLowerCase()
      if (!cible.includes(q)) return false
    }
    return true
  })

  if (sortKey.value) {
    const champs: Record<string, keyof Personnel> = {
      matricule: 'matricule', employe: 'nomComplet', entiteNom: 'entiteNom',
      fonctionLibelle: 'fonctionLibelle', dateEntree: 'dateEntree',
    }
    const f = champs[sortKey.value]
    if (f) {
      rows = [...rows].sort((a, b) => {
        const cmp = String(a[f] ?? '').localeCompare(String(b[f] ?? ''))
        return sortDir.value === 'asc' ? cmp : -cmp
      })
    }
  }
  return rows
})

const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => {
  const d = (page.value - 1) * pageSize.value
  return filtered.value.slice(d, d + pageSize.value)
})

const optEntites = computed<DropdownItem[]>(() =>
  entites.liste.map(e => ({ id: e.id, label: e.nom, sublabel: e.code })))
const optFonctions = computed<DropdownItem[]>(() =>
  fonctions.liste.map(f => ({ id: f.id, label: f.libelle, sublabel: f.code })))
const optSites = computed<DropdownItem[]>(() =>
  params.sites.map(s => ({ id: s.nom, label: s.nom, sublabel: s.code })))

/* ── Import CSV ─────────────────────────────────────────────────
 * Colonnes attendues, calées sur les champs obligatoires de la fiche
 * employé. « Fonction » et « Entité » se reconnaissent par leur code
 * (UCT, CND…) ou par leur libellé exact, pour rester tolérant au format
 * exporté par un tableur RH existant. */
const CHAMPS_IMPORT: ChampImport[] = [
  { cle: 'prenom', libelle: 'Prénom', requis: true },
  { cle: 'nom', libelle: 'Nom', requis: true },
  { cle: 'fonction', libelle: 'Fonction', requis: true },
  { cle: 'entite', libelle: 'Entité', requis: true },
  { cle: 'cin', libelle: 'CIN', requis: true },
  { cle: 'telephone', libelle: 'Téléphone', requis: false },
  { cle: 'email', libelle: 'Email', requis: false },
  { cle: 'site', libelle: 'Site', requis: false },
]
const COLONNES_APERCU = [
  { cle: 'nomComplet', libelle: 'Employé' },
  { cle: 'fonctionLibelle', libelle: 'Fonction' },
  { cle: 'entiteNom', libelle: 'Entité' },
  { cle: 'cin', libelle: 'CIN' },
]
const MODELE_CSV = ['Prénom', 'Nom', 'Fonction', 'Entité', 'CIN', 'Téléphone', 'Email', 'Site']

interface LigneEmploye {
  prenom: string; nom: string; nomComplet: string
  fonctionId: string; fonctionLibelle: string
  entiteId: string; entiteNom: string
  cin: string; telephone: string; email?: string; site: string
}

function trouverFonction(valeur: string) {
  const v = valeur.trim().toLowerCase()
  return fonctions.liste.find(f => f.code.toLowerCase() === v || f.libelle.toLowerCase() === v) ?? null
}
function trouverEntite(valeur: string) {
  const v = valeur.trim().toLowerCase()
  return entites.liste.find(e => e.code.toLowerCase() === v || e.nom.toLowerCase() === v) ?? null
}

function validerLigneImport(ligne: Record<string, string>, mapping: Record<string, string>): LigneValidee {
  const val = (cle: string) => (mapping[cle] ? (ligne[mapping[cle]!] ?? '').trim() : '')

  const prenom = val('prenom')
  const nom = val('nom')
  const cin = val('cin')
  const fonctionSaisie = val('fonction')
  const entiteSaisie = val('entite')

  if (!prenom || !nom) return { valide: false, motif: 'Prénom ou nom manquant' }
  if (!cin) return { valide: false, motif: 'CIN manquant' }
  if (personnel.liste.some(p => p.cin === cin)) return { valide: false, motif: `CIN déjà utilisé (${cin})` }

  const fonction = trouverFonction(fonctionSaisie)
  if (!fonction) return { valide: false, motif: `Fonction non reconnue « ${fonctionSaisie} »` }

  const entite = trouverEntite(entiteSaisie)
  if (!entite) return { valide: false, motif: `Entité non reconnue « ${entiteSaisie} »` }

  const donnees: LigneEmploye = {
    prenom, nom, nomComplet: `${prenom} ${nom}`,
    fonctionId: fonction.id, fonctionLibelle: fonction.libelle,
    entiteId: entite.id, entiteNom: entite.nom,
    cin, telephone: val('telephone'), email: val('email') || undefined,
    site: val('site') || params.sites[0]?.nom || '',
  }
  return { valide: true, donnees: donnees as unknown as Record<string, unknown> }
}

function importerEmployes(lignes: LigneEmploye[]) {
  const aujourdhui = aujourdhuiISO()
  lignes.forEach(l => {
    personnel.creer({
      prenom: l.prenom, nom: l.nom,
      fonctionId: l.fonctionId, fonctionLibelle: l.fonctionLibelle,
      entiteId: l.entiteId, entiteNom: l.entiteNom,
      site: l.site, telephone: l.telephone || '-', email: l.email,
      cin: l.cin, dateNaissance: aujourdhui, contrat: 'CDI',
      dateEntree: aujourdhui, conduit: fonctions.parId(l.fonctionId)?.conduit ?? false,
    })
  })
}
</script>
