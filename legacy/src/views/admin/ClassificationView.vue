<template>
  <div class="px-7 py-6 flex flex-col gap-4">

    <!-- En-tête -->
    <div>
      <h1 class="text-xl font-bold text-foreground">Classification</h1>
      <p class="text-[13px] text-muted-foreground mt-0.5">
        Catégories et fonctions : la structure qui classe chaque employé et détermine
        son droit à congé et ses responsabilités
      </p>
    </div>

    <!-- Onglets -->
    <div class="flex gap-1.5 border-b border-border">
      <button
        v-for="tb in TABS" :key="tb.key"
        class="px-3.5 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors"
        :class="onglet === tb.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'"
        @click="onglet = tb.key"
      >{{ tb.label }}</button>
    </div>

    <!-- ═══════════ Onglet Catégorie ═══════════ -->
    <template v-if="onglet === 'categorie'">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <p class="text-[13px] text-muted-foreground">
          Classent les employés et déterminent leur droit annuel à congé
        </p>
        <div class="flex gap-2">
          <button v-if="peutModifier" :class="L.btnOutline" @click="showImportCat = true">
            <Upload class="w-4 h-4" /> Importer
          </button>
          <button v-if="peutModifier" :class="L.btnPrimary" @click="ouvrirAjoutCategorie">
            <Plus class="w-4 h-4" /> Ajouter une catégorie
          </button>
        </div>
      </div>

      <div :class="L.tableCard">
        <table :class="tableau">
          <thead>
            <tr>
              <th :class="th" style="width:100px">Code</th>
              <th :class="th">Libellé</th>
              <th :class="th">Périmètre</th>
              <th :class="[th, 'text-center']" style="width:110px">Droit annuel</th>
              <th :class="[th, 'text-center']" style="width:100px">Employés</th>
              <th :class="[th, 'text-center']" style="width:90px">Statut</th>
              <th :class="[th, 'text-center']" style="width:90px">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in classification.categories" :key="c.id" class="hover:bg-background">
              <td :class="td"><span :class="badge">{{ c.code }}</span></td>
              <td :class="td" class="font-medium">{{ c.libelle }}</td>
              <td :class="td" class="text-muted-foreground text-xs leading-relaxed">{{ c.description }}</td>
              <td :class="[td, 'text-center']" class="font-medium">{{ c.droitAnnuel }} j</td>
              <td :class="[td, 'text-center']">{{ effectifCategorie(c.id) }}</td>
              <td :class="[td, 'text-center']">
                <button class="cursor-pointer" :disabled="!peutModifier" @click="classification.mettreAJourCategorie(c.id, { actif: !c.actif })">
                  <span :class="c.actif ? 'text-success' : 'text-muted-foreground'" class="text-[13px]">
                    {{ c.actif ? 'Actif' : 'Inactif' }}
                  </span>
                </button>
              </td>
              <td :class="td">
                <div class="flex gap-1 justify-center">
                  <button :class="iconBtn" title="Modifier" :disabled="!peutModifier" @click="ouvrirEditionCategorie(c)"><Pencil class="w-3.5 h-3.5" /></button>
                  <button :class="[iconBtn, 'hover:!bg-danger-bg hover:!text-danger']" title="Supprimer" :disabled="!peutModifier"
                          @click="confirmerSuppressionCategorie(c)">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="classification.categories.length === 0" class="text-center p-6 text-muted-foreground italic text-sm">
          Aucune catégorie configurée
        </p>
      </div>

      <p class="text-[11px] text-muted-foreground leading-relaxed">
        Ces catégories reprennent le découpage des projets de flotte précédents pour porter le
        droit annuel. Le rattachement des fonctions aux catégories reste à valider par UCODIS.
      </p>
    </template>

    <!-- ═══════════ Onglet Fonction ═══════════ -->
    <template v-else-if="onglet === 'fonction'">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <p class="text-[13px] text-muted-foreground">
          Catalogue des fonctions de l'entreprise
        </p>
        <div class="flex gap-2">
          <button v-if="peutModifier" :class="L.btnOutline" @click="showImportFonction = true">
            <Upload class="w-4 h-4" /> Importer
          </button>
          <button v-if="peutModifier" :class="L.btnPrimary" @click="ouvrirAjoutFonction">
            <Plus class="w-4 h-4" /> Ajouter une fonction
          </button>
        </div>
      </div>

      <div :class="L.tableCard">
        <table :class="tableau">
          <thead>
            <tr>
              <th :class="th" style="width:90px">Code</th>
              <th :class="th">Libellé</th>
              <th :class="[th, 'text-center']" style="width:120px">Conduite</th>
              <th :class="[th, 'text-center']" style="width:110px">Responsabilités</th>
              <th :class="[th, 'text-center']" style="width:100px">Employés</th>
              <th :class="[th, 'text-center']" style="width:90px">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in fonctions.liste" :key="f.id" class="hover:bg-background cursor-pointer" @click="detailFonction = f.id">
              <td :class="td"><span :class="badge">{{ f.code }}</span></td>
              <td :class="td" class="font-medium">{{ f.libelle }}</td>
              <td :class="[td, 'text-center']">
                <span v-if="f.conduit" class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                  Permis requis
                </span>
                <span v-else class="text-muted-foreground text-xs">·</span>
              </td>
              <td :class="[td, 'text-center']">{{ f.responsabilites.length }}</td>
              <td :class="[td, 'text-center']">{{ titulaires(f.id).length }}</td>
              <td :class="td" @click.stop>
                <div class="flex gap-1 justify-center">
                  <button :class="iconBtn" title="Détail" @click="detailFonction = f.id"><Eye class="w-3.5 h-3.5" /></button>
                  <button :class="iconBtn" title="Modifier" :disabled="!peutModifier" @click="ouvrirEditionFonction(f)"><Pencil class="w-3.5 h-3.5" /></button>
                  <button :class="[iconBtn, 'hover:!bg-danger-bg hover:!text-danger']" title="Supprimer" :disabled="!peutModifier || f.effectif > 0"
                          @click="confirmerSuppressionFonction(f)">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Détail dépliable de la fonction sélectionnée -->
      <div v-if="fonctionDetail" class="bg-card border border-border rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-[14px] font-semibold text-foreground">{{ fonctionDetail.libelle }}</span>
            <span :class="badge">{{ fonctionDetail.code }}</span>
          </div>
          <button class="text-muted-foreground cursor-pointer" @click="detailFonction = null"><X class="w-4 h-4" /></button>
        </div>
        <div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2">Responsabilités</div>
        <ul class="flex flex-col gap-1.5 mb-3">
          <li v-for="(r, i) in fonctionDetail.responsabilites" :key="i" class="flex gap-2 text-[13px] leading-snug">
            <span class="text-primary shrink-0">•</span><span>{{ r }}</span>
          </li>
        </ul>
        <div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2">Personnes sur cette fonction</div>
        <div v-if="titulaires(fonctionDetail.id).length" class="flex flex-wrap gap-1.5">
          <button
            v-for="p in titulaires(fonctionDetail.id)" :key="p.id"
            class="flex items-center gap-1.5 bg-background border border-border rounded-full pl-1 pr-2.5 py-1 cursor-pointer hover:border-primary/40"
            @click="openCardId = p.id"
          >
            <UserAvatar :nom="p.nomComplet" taille="sm" />
            <span class="text-[12px]">{{ p.nomComplet }}</span>
          </button>
        </div>
        <p v-else class="text-[12px] text-muted-foreground">Aucune personne rattachée.</p>
      </div>

      <p class="text-[11px] text-muted-foreground leading-relaxed">
        Deux fonctions ne relèvent pas de l'exploitation, Direction et Administrateur système ·
        parce qu'elles servent au pilotage et à l'exploitation du logiciel.
      </p>
    </template>

    <!-- ═══════════ Onglet Poste ═══════════ -->
    <template v-else>
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <p class="text-[13px] text-muted-foreground">
          Fonctions rattachées à une entité, avec leur effectif nominal et réel
        </p>
        <button :class="L.btnOutline" @click="exporterPostes"><Download class="w-4 h-4" /> Exporter</button>
      </div>

      <div :class="L.tableCard">
        <table :class="tableau">
          <thead>
            <tr>
              <th :class="th">Fonction</th>
              <th :class="th">Entité</th>
              <th :class="[th, 'text-center']" style="width:150px">Occupation</th>
              <th :class="[th, 'text-center']" style="width:90px">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in fonctions.liste" :key="f.id" class="hover:bg-background">
              <td :class="td" class="font-medium">
                {{ f.libelle }}
                <span :class="badge" class="ml-1.5">{{ f.code }}</span>
              </td>
              <td :class="td" class="text-muted-foreground text-xs">{{ entiteNom(f.entiteId) }}</td>
              <td :class="[td, 'text-center']">
                <span :class="titulaires(f.id).length >= f.effectif ? 'text-success' : 'text-warning'" class="font-medium">
                  {{ titulaires(f.id).length }} / {{ f.effectif }} places
                </span>
              </td>
              <td :class="td">
                <div class="flex gap-1 justify-center">
                  <button :class="iconBtn" title="Voir la fonction" @click="onglet = 'fonction'; detailFonction = f.id">
                    <ArrowRight class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-[11px] text-muted-foreground leading-relaxed">
        L'effectif nominal reprend le dimensionnement cible : dix
        conducteurs pour dix tracteurs, cinq aides conducteurs. Un poste en dessous de
        son effectif nominal reste ouvert au recrutement.
      </p>
    </template>

    <EmployeCard
      v-if="openCardId !== null"
      :employes="personnel.actifs"
      :employe-id="openCardId"
      @close="openCardId = null"
    />

    <!-- ═══ Modale : catégorie ═══ -->
    <ModalShell :ouvert="modaleCategorie.ouvert" :titre="modaleCategorie.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'" @fermer="modaleCategorie.ouvert = false">
      <div class="flex flex-col gap-3.5">
        <div :class="F.fieldRow">
          <div :class="F.field">
            <label :class="F.fieldLabel">Code *</label>
            <input v-model="modaleCategorie.code" :class="F.fieldInput" placeholder="CAT-E" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Droit annuel (jours) *</label>
            <input v-model.number="modaleCategorie.droitAnnuel" type="number" min="0" :class="F.fieldInput" />
          </div>
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">Libellé *</label>
          <input v-model="modaleCategorie.libelle" :class="F.fieldInput" placeholder="Ex. Encadrement dépôt" />
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">Périmètre</label>
          <textarea v-model="modaleCategorie.description" rows="2" :class="F.fieldTextarea" placeholder="Fonctions couvertes par cette catégorie…"></textarea>
        </div>
        <p v-if="erreurCategorie" class="text-[12px] text-danger">{{ erreurCategorie }}</p>
      </div>
      <template #pied>
        <button :class="cls.btnPrimary" @click="validerCategorie">
          <Check class="w-4 h-4" /> {{ modaleCategorie.id ? 'Enregistrer' : 'Créer' }}
        </button>
        <button :class="cls.btnOutline" @click="modaleCategorie.ouvert = false">Annuler</button>
      </template>
    </ModalShell>

    <!-- ═══ Modale : fonction ═══ -->
    <ModalShell :ouvert="modaleFonction.ouvert" :titre="modaleFonction.id ? 'Modifier la fonction' : 'Nouvelle fonction'" @fermer="modaleFonction.ouvert = false">
      <div class="flex flex-col gap-3.5">
        <div :class="F.fieldRow">
          <div :class="F.field">
            <label :class="F.fieldLabel">Code *</label>
            <input v-model="modaleFonction.code" :class="F.fieldInput" placeholder="EXP" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Entité de rattachement *</label>
            <SearchableDropdown v-model="modaleFonction.entiteId" :items="optEntitesFonction" placeholder="Sélectionner…" />
          </div>
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">Libellé *</label>
          <input v-model="modaleFonction.libelle" :class="F.fieldInput" placeholder="Ex. Magasinier pièces détachées" />
        </div>
        <div :class="F.fieldRow">
          <div :class="F.field">
            <label :class="F.fieldLabel">Effectif nominal *</label>
            <input v-model.number="modaleFonction.effectif" type="number" min="0" :class="F.fieldInput" />
          </div>
          <label class="flex items-center gap-2 mt-6 cursor-pointer">
            <input type="checkbox" v-model="modaleFonction.conduit" class="accent-[var(--ucodis-red)]" />
            <span class="text-[13px] text-foreground">Fonction de conduite (permis exigé)</span>
          </label>
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">Responsabilités <span class="text-muted-foreground font-normal">(une par ligne)</span></label>
          <textarea v-model="modaleFonction.responsabilitesTexte" rows="4" :class="F.fieldTextarea"
                    placeholder="Une responsabilité par ligne…"></textarea>
        </div>
        <p v-if="erreurFonction" class="text-[12px] text-danger">{{ erreurFonction }}</p>
      </div>
      <template #pied>
        <button :class="cls.btnPrimary" @click="validerFonction">
          <Check class="w-4 h-4" /> {{ modaleFonction.id ? 'Enregistrer' : 'Créer' }}
        </button>
        <button :class="cls.btnOutline" @click="modaleFonction.ouvert = false">Annuler</button>
      </template>
    </ModalShell>

    <ConfirmDialog
      :open="confirmation.ouvert"
      :title="confirmation.titre"
      :message="confirmation.message"
      confirm-label="Supprimer"
      destructive
      @confirm="confirmation.onConfirm(); confirmation.ouvert = false"
      @cancel="confirmation.ouvert = false"
    />

    <ImportCsvModal
      v-if="showImportCat"
      titre="Importer des catégories"
      :champs="CHAMPS_IMPORT_CAT"
      :apercu-colonnes="COLONNES_APERCU_CAT"
      :modele="MODELE_CSV_CAT"
      description-controles="Contrôles appliqués : code et libellé obligatoires, code déjà utilisé par une autre catégorie."
      :valider="validerLigneCategorie"
      @close="showImportCat = false"
      @importer="lignes => importerCategories(lignes as unknown as LigneCategorie[])"
    />

    <ImportCsvModal
      v-if="showImportFonction"
      titre="Importer des fonctions"
      :champs="CHAMPS_IMPORT_FONCTION"
      :apercu-colonnes="COLONNES_APERCU_FONCTION"
      :modele="MODELE_CSV_FONCTION"
      description-controles="Contrôles appliqués : code, libellé et entité obligatoires, code déjà utilisé par une autre fonction, entité non reconnue."
      :valider="validerLigneFonction"
      @close="showImportFonction = false"
      @importer="lignes => importerFonctions(lignes as unknown as LigneFonction[])"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ArrowRight, Check, Download, Eye, Info, Pencil, Plus, Trash2, Upload, X } from '@lucide/vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import EmployeCard from '../../components/cards/EmployeCard.vue'
import ModalShell from '../../components/ui/ModalShell.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import ConfirmDialog from '../../components/shared/ConfirmDialog.vue'
import ImportCsvModal from '../../components/ui/ImportCsvModal.vue'
import type { ChampImport, LigneValidee } from '../../components/ui/ImportCsvModal.vue'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'
import * as cls from '../../lib/formClasses'
import { useAuthStore } from '../../stores/auth'
import { useClassificationStore } from '../../stores/classification'
import { useFonctionStore } from '../../stores/fonctions'
import { usePersonnelStore } from '../../stores/personnel'
import { useEntiteStore } from '../../stores/entites'
import type { Categorie } from '../../stores/classification'
import type { Fonction } from '../../types'

const auth = useAuthStore()
const classification = useClassificationStore()
const fonctions = useFonctionStore()
const personnel = usePersonnelStore()
const entites = useEntiteStore()

const tableau = 'w-full border-collapse text-[13px]'
const th = 'px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground bg-background uppercase tracking-[0.04em] border-b border-border whitespace-nowrap'
const td = 'px-3 py-2.5 border-b border-border align-middle'
const badge = 'text-[10px] font-mono bg-background text-muted-foreground px-1.5 py-0.5 rounded border border-border'
const iconBtn = 'w-7 h-7 flex items-center justify-center border-0 rounded-md bg-background text-muted-foreground cursor-pointer transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-background disabled:hover:text-muted-foreground'

const TABS = [
  { key: 'categorie' as const, label: 'Catégorie' },
  { key: 'fonction' as const, label: 'Fonction' },
  { key: 'poste' as const, label: 'Poste' },
]
const onglet = ref<'categorie' | 'fonction' | 'poste'>('categorie')

/** Le responsable flotte gère aussi la classification, au même titre que l'administrateur. */
const peutModifier = computed(() => auth.gerePersonnel)
const optEntitesFonction = computed<DropdownItem[]>(() =>
  entites.liste.map(e => ({ id: e.id, label: e.nom, sublabel: e.code })))
const openCardId = ref<string | null>(null)
const detailFonction = ref<string | null>(null)
const fonctionDetail = computed(() => (detailFonction.value ? fonctions.parId(detailFonction.value) : null))

const showImportCat = ref(false)
const showImportFonction = ref(false)

function titulaires(fonctionId: string) {
  return personnel.actifs.filter(p => p.fonctionId === fonctionId)
}
function entiteNom(id: string) { return entites.parId(id)?.nom ?? '-' }

/**
 * Effectif d'une catégorie : priorité à la catégorie explicitement choisie
 * sur la fiche ; à défaut (fiches créées avant l'ajout de ce champ), on
 * retombe sur le rattachement par défaut de la fonction, centralisé dans
 * le store classification.
 */
function effectifCategorie(categorieId: string) {
  return personnel.actifs.filter(p =>
    p.categorieId ? p.categorieId === categorieId
                   : classification.categorieParDefaut(p.fonctionId) === categorieId,
  ).length
}

/* ── Modale catégorie ─────────────────────────────────────────── */
const modaleCategorie = reactive({ ouvert: false, id: '', code: '', libelle: '', droitAnnuel: 30, description: '' })
const erreurCategorie = ref('')

function ouvrirAjoutCategorie() {
  Object.assign(modaleCategorie, { ouvert: true, id: '', code: '', libelle: '', droitAnnuel: 30, description: '' })
  erreurCategorie.value = ''
}
function ouvrirEditionCategorie(c: Categorie) {
  Object.assign(modaleCategorie, { ouvert: true, id: c.id, code: c.code, libelle: c.libelle, droitAnnuel: c.droitAnnuel, description: c.description })
  erreurCategorie.value = ''
}
function validerCategorie() {
  if (!modaleCategorie.code.trim() || !modaleCategorie.libelle.trim()) {
    erreurCategorie.value = 'Le code et le libellé sont obligatoires.'
    return
  }
  const patch = {
    code: modaleCategorie.code.trim(),
    libelle: modaleCategorie.libelle.trim(),
    droitAnnuel: modaleCategorie.droitAnnuel,
    description: modaleCategorie.description.trim(),
  }
  if (modaleCategorie.id) {
    classification.mettreAJourCategorie(modaleCategorie.id, patch)
  } else {
    classification.creerCategorie({ ...patch, actif: true })
  }
  modaleCategorie.ouvert = false
}
function confirmerSuppressionCategorie(c: Categorie) {
  confirmation.titre = 'Supprimer la catégorie'
  confirmation.message = `Supprimer « ${c.libelle} » ? Cette action ne peut pas être annulée dans la maquette.`
  confirmation.onConfirm = () => classification.supprimerCategorie(c.id)
  confirmation.ouvert = true
}

/* ── Modale fonction ──────────────────────────────────────────── */
const modaleFonction = reactive({
  ouvert: false, id: '', code: '', libelle: '', entiteId: '', effectif: 1, conduit: false, responsabilitesTexte: '',
})
const erreurFonction = ref('')

function ouvrirAjoutFonction() {
  Object.assign(modaleFonction, { ouvert: true, id: '', code: '', libelle: '', entiteId: '', effectif: 1, conduit: false, responsabilitesTexte: '' })
  erreurFonction.value = ''
}
function ouvrirEditionFonction(f: Fonction) {
  Object.assign(modaleFonction, {
    ouvert: true, id: f.id, code: f.code, libelle: f.libelle, entiteId: f.entiteId,
    effectif: f.effectif, conduit: f.conduit, responsabilitesTexte: f.responsabilites.join('\n'),
  })
  erreurFonction.value = ''
}
function validerFonction() {
  if (!modaleFonction.code.trim() || !modaleFonction.libelle.trim() || !modaleFonction.entiteId) {
    erreurFonction.value = 'Le code, le libellé et l\u2019entité sont obligatoires.'
    return
  }
  const patch = {
    code: modaleFonction.code.trim(),
    libelle: modaleFonction.libelle.trim(),
    entiteId: modaleFonction.entiteId,
    effectif: modaleFonction.effectif,
    conduit: modaleFonction.conduit,
    responsabilites: modaleFonction.responsabilitesTexte.split('\n').map(l => l.trim()).filter(Boolean),
  }
  if (modaleFonction.id) {
    fonctions.mettreAJour(modaleFonction.id, patch)
  } else {
    fonctions.creer(patch)
  }
  modaleFonction.ouvert = false
}
function confirmerSuppressionFonction(f: Fonction) {
  if (f.effectif > 0 || titulaires(f.id).length > 0) return
  confirmation.titre = 'Supprimer la fonction'
  confirmation.message = `Supprimer « ${f.libelle} » ? Cette action ne peut pas être annulée dans la maquette.`
  confirmation.onConfirm = () => fonctions.supprimer(f.id)
  confirmation.ouvert = true
}

/* ── Confirmation générique ──────────────────────────────────── */
const confirmation = reactive({ ouvert: false, titre: '', message: '', onConfirm: () => {} })

/* ── Export CSV de l'onglet Poste ─────────────────────────────── */
function exporterPostes() {
  const lignes = [['Fonction', 'Code', 'Entité', 'Occupés', 'Effectif nominal']]
  fonctions.liste.forEach(f => {
    lignes.push([f.libelle, f.code, entiteNom(f.entiteId), String(titulaires(f.id).length), String(f.effectif)])
  })
  const csv = lignes.map(l => l.map(v => `"${v.replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'postes_ucodis.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Import CSV : catégories ──────────────────────────────────── */
const CHAMPS_IMPORT_CAT: ChampImport[] = [
  { cle: 'code', libelle: 'Code', requis: true },
  { cle: 'libelle', libelle: 'Libellé', requis: true },
  { cle: 'droitAnnuel', libelle: 'Droit annuel', requis: false },
  { cle: 'description', libelle: 'Périmètre', requis: false },
]
const COLONNES_APERCU_CAT = [
  { cle: 'code', libelle: 'Code' },
  { cle: 'libelle', libelle: 'Libellé' },
  { cle: 'droitAnnuel', libelle: 'Droit annuel' },
]
const MODELE_CSV_CAT = ['Code', 'Libellé', 'Droit annuel', 'Périmètre']

interface LigneCategorie { code: string; libelle: string; droitAnnuel: number; description: string }

function validerLigneCategorie(ligne: Record<string, string>, mapping: Record<string, string>): LigneValidee {
  const val = (cle: string) => (mapping[cle] ? (ligne[mapping[cle]!] ?? '').trim() : '')
  const code = val('code')
  const libelle = val('libelle')
  if (!code || !libelle) return { valide: false, motif: 'Code ou libellé manquant' }
  if (classification.categories.some(c => c.code.toLowerCase() === code.toLowerCase())) {
    return { valide: false, motif: `Code déjà utilisé (${code})` }
  }
  const droitAnnuel = Number(val('droitAnnuel')) || 30
  const donnees: LigneCategorie = { code, libelle, droitAnnuel, description: val('description') }
  return { valide: true, donnees: donnees as unknown as Record<string, unknown> }
}
function importerCategories(lignes: LigneCategorie[]) {
  lignes.forEach(l => classification.creerCategorie({ ...l, actif: true }))
}

/* ── Import CSV : fonctions ───────────────────────────────────── */
const CHAMPS_IMPORT_FONCTION: ChampImport[] = [
  { cle: 'code', libelle: 'Code', requis: true },
  { cle: 'libelle', libelle: 'Libellé', requis: true },
  { cle: 'entite', libelle: 'Entité', requis: true },
  { cle: 'effectif', libelle: 'Effectif nominal', requis: false },
  { cle: 'conduit', libelle: 'Conduite', requis: false },
]
const COLONNES_APERCU_FONCTION = [
  { cle: 'code', libelle: 'Code' },
  { cle: 'libelle', libelle: 'Libellé' },
  { cle: 'entiteNom', libelle: 'Entité' },
]
const MODELE_CSV_FONCTION = ['Code', 'Libellé', 'Entité', 'Effectif nominal', 'Conduite']

interface LigneFonction { code: string; libelle: string; entiteId: string; entiteNom: string; effectif: number; conduit: boolean }

function validerLigneFonction(ligne: Record<string, string>, mapping: Record<string, string>): LigneValidee {
  const val = (cle: string) => (mapping[cle] ? (ligne[mapping[cle]!] ?? '').trim() : '')
  const code = val('code')
  const libelle = val('libelle')
  const entiteSaisie = val('entite')
  if (!code || !libelle) return { valide: false, motif: 'Code ou libellé manquant' }
  if (fonctions.liste.some(f => f.code.toLowerCase() === code.toLowerCase())) {
    return { valide: false, motif: `Code déjà utilisé (${code})` }
  }
  const ent = entites.liste.find(e => e.code.toLowerCase() === entiteSaisie.toLowerCase() || e.nom.toLowerCase() === entiteSaisie.toLowerCase())
  if (!ent) return { valide: false, motif: `Entité non reconnue « ${entiteSaisie} »` }
  const conduitTxt = val('conduit').toLowerCase()
  const donnees: LigneFonction = {
    code, libelle, entiteId: ent.id, entiteNom: ent.nom,
    effectif: Number(val('effectif')) || 1,
    conduit: conduitTxt === 'oui' || conduitTxt === 'true' || conduitTxt === '1',
  }
  return { valide: true, donnees: donnees as unknown as Record<string, unknown> }
}
function importerFonctions(lignes: LigneFonction[]) {
  lignes.forEach(l => fonctions.creer({
    code: l.code, libelle: l.libelle, entiteId: l.entiteId,
    effectif: l.effectif, conduit: l.conduit, responsabilites: [],
  }))
}
</script>
