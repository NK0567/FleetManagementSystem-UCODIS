<script setup lang="ts">
/**
 * Fiche employé en superposition, sur CardModalShell.
 * Même comportement que sur le socle FMS : navigateur de matricules à
 * gauche, lecture par défaut, passage en édition par le crayon.
 *
 * Le contenu est celui d'UCODIS : identité, affectation, et · pour le
 * personnel roulant · habilitation et pièces, qui viennent de la SOP et
 * du module 9 du cahier des charges.
 */
import { ref, computed, watch } from 'vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import StatusPill from '../ui/StatusPill.vue'
import UserAvatar from '../ui/UserAvatar.vue'
import * as cls from '../../lib/formClasses'
import { formatDate } from '../../utils/helpers'
import { usePersonnelStore } from '../../stores/personnel'
import { useFonctionStore } from '../../stores/fonctions'
import { useEntiteStore } from '../../stores/entites'
import { useDocumentsStore, LIBELLE_TYPE_DOC } from '../../stores/documentsPersonnel'
import { useAbsenceStore } from '../../stores/absences'
import type { Personnel, StatutPersonnel, TypeContrat } from '../../types'

const props = defineProps<{ employes: Personnel[]; employeId: string }>()
const emit = defineEmits<{ close: [] }>()

const personnel = usePersonnelStore()
const fonctions = useFonctionStore()
const entites = useEntiteStore()
const docs = useDocumentsStore()
const absences = useAbsenceStore()

const STATUTS: Record<StatutPersonnel, string> = {
  actif: 'Actif', conge: 'En congé', suspendu: 'Suspendu', archive: 'Archivé',
}
const CONTRATS: TypeContrat[] = ['CDI', 'CDD', 'Journalier', 'Stage']

/* ── Navigation entre fiches ────────────────────────────────── */
const idCourant = ref(props.employeId)
watch(() => props.employeId, v => { idCourant.value = v; enEdition.value = false })

const courant = computed<Personnel | null>(
  () => props.employes.find(e => e.id === idCourant.value) ?? null,
)
const index = computed(() => props.employes.findIndex(e => e.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.employes.length - 1)
const sidebarItems = computed(() => props.employes.map(e => ({ no: e.matricule, label: e.nomComplet })))
const currentNo = computed(() => courant.value?.matricule ?? null)

function goPrev() {
  if (hasPrev.value) { idCourant.value = props.employes[index.value - 1]!.id; enEdition.value = false }
}
function goNext() {
  if (hasNext.value) { idCourant.value = props.employes[index.value + 1]!.id; enEdition.value = false }
}
function selectSidebar(no: string) {
  const e = props.employes.find(x => x.matricule === no)
  if (e) { idCourant.value = e.id; enEdition.value = false }
}

/* ── Édition ────────────────────────────────────────────────── */
const enEdition = ref(false)
const form = ref({
  prenom: '', nom: '', telephone: '', email: '', cin: '', dateNaissance: '',
  fonctionId: '', entiteId: '', site: '', contrat: 'CDI' as TypeContrat,
  dateEntree: '', statut: 'actif' as StatutPersonnel,
})

const optFonctions = computed<DropdownItem[]>(() =>
  fonctions.liste.map(f => ({ id: f.id, label: f.libelle, sublabel: f.code })))
const optEntites = computed<DropdownItem[]>(() =>
  entites.liste.map(e => ({ id: e.id, label: e.nom, sublabel: e.code })))

function enterEdit() {
  const e = courant.value
  if (!e) return
  form.value = {
    prenom: e.prenom, nom: e.nom, telephone: e.telephone, email: e.email ?? '',
    cin: e.cin, dateNaissance: e.dateNaissance, fonctionId: e.fonctionId,
    entiteId: e.entiteId, site: e.site, contrat: e.contrat,
    dateEntree: e.dateEntree, statut: e.statut,
  }
  enEdition.value = true
}
function cancelEdit() { enEdition.value = false }

function save() {
  const e = courant.value
  if (!e) return
  const f = fonctions.parId(form.value.fonctionId)
  const ent = entites.parId(form.value.entiteId)
  Object.assign(e, {
    ...form.value,
    nomComplet: `${form.value.prenom} ${form.value.nom}`,
    fonctionLibelle: f?.libelle ?? e.fonctionLibelle,
    entiteNom: ent?.nom ?? e.entiteNom,
    conduit: f ? f.conduit : e.conduit,
  })
  enEdition.value = false
}

/* ── Données liées ──────────────────────────────────────────── */
const mesDocs = computed(() => (courant.value ? docs.parPersonnel(courant.value.id) : []))
const manquantes = computed(() => (courant.value ? docs.piecesManquantes(courant.value.id) : []))
const responsabilites = computed(() =>
  courant.value ? fonctions.parId(courant.value.fonctionId)?.responsabilites ?? [] : [],
)
const mesDemandes = computed(() => (courant.value ? absences.mesDemandes(courant.value.id) : []))
const monSolde = computed(() => (courant.value ? absences.monSolde(courant.value.id) : null))

const pageTitle = computed(() =>
  courant.value ? `${courant.value.matricule} · ${courant.value.nomComplet}` : '',
)

const lecture = 'text-[13px] text-foreground bg-background border border-border rounded-md px-2.5 h-[38px] flex items-center'
</script>

<template>
  <CardModalShell
    v-if="courant"
    :page-title="pageTitle"
    :page-number="courant.matricule"
    banner-label="Fiche employé"
    :is-edit-mode="enEdition"
    :show-edit="true"
    :show-title-new-button="false"
    :sidebar-items="sidebarItems"
    :current-no="currentNo"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :has-unsaved-changes="enEdition"
    hide-action-bar
    @close="emit('close')"
    @enter-edit="enterEdit"
    @cancel-edit="cancelEdit"
    @save="save"
    @go-prev="goPrev"
    @go-next="goNext"
    @select-sidebar="selectSidebar"
  >
    <template #title-badges>
      <StatusPill :statut="courant.statut" />
      <StatusPill v-if="courant.conduit" :statut="courant.habilite ? 'habilite' : 'non_habilite'" />
    </template>

    <template #form>
      <!-- Le contenu de la fiche est centré dans la superposition -->
      <div class="px-6 py-5 max-w-4xl mx-auto">

        <FormSection title="Identité" :recaps="[courant.nomComplet, courant.cin]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Prénom</label>
              <input v-if="enEdition" v-model="form.prenom" :class="cls.fieldInput" />
              <div v-else :class="lecture">
                <UserAvatar :nom="courant.nomComplet" taille="sm" class="mr-2" />{{ courant.prenom }}
              </div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Nom</label>
              <input v-if="enEdition" v-model="form.nom" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.nom }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Date de naissance</label>
              <input v-if="enEdition" type="date" v-model="form.dateNaissance" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ formatDate(courant.dateNaissance) }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">CIN</label>
              <input v-if="enEdition" v-model="form.cin" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.cin }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Téléphone</label>
              <input v-if="enEdition" type="tel" v-model="form.telephone" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.telephone }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Courriel</label>
              <input v-if="enEdition" type="email" v-model="form.email" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.email || '-' }}</div>
            </div>
          </div>
        </FormSection>

        <FormSection title="Affectation" :recaps="[courant.fonctionLibelle, courant.entiteNom]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Fonction</label>
              <SearchableDropdown v-if="enEdition" v-model="form.fonctionId" :items="optFonctions" placeholder="Sélectionner…" />
              <div v-else :class="lecture">{{ courant.fonctionLibelle }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Entité</label>
              <SearchableDropdown v-if="enEdition" v-model="form.entiteId" :items="optEntites" placeholder="Sélectionner…" />
              <div v-else :class="lecture">{{ courant.entiteNom }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Site</label>
              <input v-if="enEdition" v-model="form.site" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.site }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Type de contrat</label>
              <select v-if="enEdition" v-model="form.contrat" :class="cls.fieldSelect">
                <option v-for="c in CONTRATS" :key="c" :value="c">{{ c }}</option>
              </select>
              <div v-else :class="lecture">{{ courant.contrat }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Date d'entrée</label>
              <input v-if="enEdition" type="date" v-model="form.dateEntree" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ formatDate(courant.dateEntree) }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Statut</label>
              <select v-if="enEdition" v-model="form.statut" :class="cls.fieldSelect">
                <option v-for="(l, v) in STATUTS" :key="v" :value="v">{{ l }}</option>
              </select>
              <div v-else :class="lecture"><StatusPill :statut="courant.statut" /></div>
            </div>
          </div>
        </FormSection>

        <!-- Congés : soldes et demandes -->
        <FormSection
          title="Congés"
          :default-open="false"
          :recaps="monSolde ? [`${monSolde.congeAnnuel} j annuels`, `${mesDemandes.length} demande(s)`] : []"
        >
          <div v-if="monSolde" class="grid grid-cols-4 gap-3 mb-4 max-sm:grid-cols-2">
            <div class="bg-background rounded-lg p-3 text-center border border-border">
              <div class="text-xl font-bold">{{ monSolde.congeAnnuel }} j</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">Congé annuel</div>
            </div>
            <div class="bg-background rounded-lg p-3 text-center border border-border">
              <div class="text-xl font-bold">{{ monSolde.recuperation }} j</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">Récupération</div>
            </div>
            <div class="bg-background rounded-lg p-3 text-center border border-border">
              <div class="text-xl font-bold">{{ monSolde.maladie }} j</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">Congé maladie</div>
            </div>
            <div class="bg-background rounded-lg p-3 text-center border border-border">
              <div class="text-xl font-bold">{{ monSolde.permission }} j</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">Permission</div>
            </div>
          </div>
          <p v-else class="text-[13px] text-muted-foreground">Aucun solde suivi pour cette personne.</p>

          <table v-if="mesDemandes.length" class="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th class="px-2.5 py-2 text-left text-xs font-semibold bg-background border-b border-border">Type</th>
                <th class="px-2.5 py-2 text-left text-xs font-semibold bg-background border-b border-border">Période</th>
                <th class="px-2.5 py-2 text-center text-xs font-semibold bg-background border-b border-border">Jours</th>
                <th class="px-2.5 py-2 text-left text-xs font-semibold bg-background border-b border-border">Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in mesDemandes" :key="d.id">
                <td class="px-2.5 py-2 border-b border-border">{{ d.type }}</td>
                <td class="px-2.5 py-2 border-b border-border tabular-nums">{{ d.debut }} → {{ d.fin }}</td>
                <td class="px-2.5 py-2 border-b border-border text-center">{{ d.jours }}</td>
                <td class="px-2.5 py-2 border-b border-border">{{ d.statut }}</td>
              </tr>
            </tbody>
          </table>
        </FormSection>

        <!-- Pièces : module 9 du cahier des charges -->
        <FormSection
          title="Pièces"
          :default-open="false"
          :recaps="[`${mesDocs.length} déposée(s)`, manquantes.length ? `${manquantes.length} manquante(s)` : null]"
        >
          <table class="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th class="px-2.5 py-2 text-left text-xs font-semibold bg-background border-b border-border">Pièce</th>
                <th class="px-2.5 py-2 text-left text-xs font-semibold bg-background border-b border-border">Référence</th>
                <th class="px-2.5 py-2 text-left text-xs font-semibold bg-background border-b border-border">Expiration</th>
                <th class="px-2.5 py-2 text-left text-xs font-semibold bg-background border-b border-border">État</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in mesDocs" :key="d.id">
                <td class="px-2.5 py-2 border-b border-border font-medium">
                  {{ d.libelle }}
                  <span v-if="d.categorie" class="ml-1.5 text-[10px] bg-neutral-bg text-neutral px-1.5 py-0.5 rounded font-semibold">
                    {{ d.categorie }}
                  </span>
                </td>
                <td class="px-2.5 py-2 border-b border-border font-mono text-xs text-muted-foreground">{{ d.reference || '-' }}</td>
                <td class="px-2.5 py-2 border-b border-border">{{ d.dateExpiration ? formatDate(d.dateExpiration) : 'Sans échéance' }}</td>
                <td class="px-2.5 py-2 border-b border-border">
                  <StatusPill v-if="d.dateExpiration" :statut="docs.etat(d)" />
                  <span v-else class="text-xs text-muted-foreground">·</span>
                </td>
              </tr>
              <tr v-for="t in manquantes" :key="t" class="bg-danger-bg/40">
                <td class="px-2.5 py-2 border-b border-border font-medium text-danger">{{ LIBELLE_TYPE_DOC[t] }}</td>
                <td class="px-2.5 py-2 border-b border-border text-danger text-xs" colspan="2">
                  Pièce obligatoire non déposée pour cette fonction
                </td>
                <td class="px-2.5 py-2 border-b border-border"><StatusPill statut="absent" /></td>
              </tr>
            </tbody>
          </table>
        </FormSection>

        <!-- Responsabilités : reprises de la SOP -->
        <FormSection title="Responsabilités" :default-open="false" :recaps="[`${responsabilites.length} au poste`]">
          <ul class="flex flex-col gap-1.5">
            <li v-for="(r, i) in responsabilites" :key="i" class="flex gap-2 text-[13px] leading-snug">
              <span class="text-primary shrink-0">•</span><span>{{ r }}</span>
            </li>
          </ul>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
