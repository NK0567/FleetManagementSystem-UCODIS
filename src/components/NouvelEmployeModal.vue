<template>
  <CreateModalShell
    v-if="ouvert"
    title="Nouvel employé"
    banner-label="Employés · Création"
    create-label="Créer l'employé"
    :save-error="erreur || null"
    @close="fermer"
    @create="creer"
  >
    <template #form>
      <div class="max-w-3xl mx-auto w-full px-6 py-6">

        <FormSection title="Identité" :recaps="[form.prenom && form.nom ? `${form.prenom} ${form.nom}` : null]">
          <div class="grid grid-cols-2 gap-x-5 gap-y-3.5 max-sm:grid-cols-1">
            <div :class="F.field">
              <label :class="F.fieldLabel">Matricule</label>
              <input v-model="form.matricule" :class="F.fieldInput" :placeholder="matriculeParDefaut" />
            </div>
            <div></div>

            <div :class="F.field">
              <label :class="F.fieldLabel">Prénom *</label>
              <input v-model="form.prenom" :class="F.fieldInput" placeholder="Ex. Solofo" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Nom *</label>
              <input v-model="form.nom" :class="F.fieldInput" placeholder="Ex. Rakotomanga" />
            </div>

            <div :class="F.field">
              <label :class="F.fieldLabel">CIN *</label>
              <input v-model="form.cin" :class="F.fieldInput" placeholder="101 234 567 0XX" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Type de pièce</label>
              <select v-model="form.typePieceIdentite" :class="F.fieldSelect">
                <option v-for="t in TYPES_PIECE" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>

            <div :class="F.field">
              <label :class="F.fieldLabel">Téléphone *</label>
              <input v-model="form.telephone" :class="F.fieldInput" placeholder="034 12 345 XX" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Courriel</label>
              <input v-model="form.email" type="email" :class="F.fieldInput" placeholder="prenom.nom@ucodis.mg" />
            </div>

            <div :class="F.field">
              <label :class="F.fieldLabel">Genre</label>
              <select v-model="form.genre" :class="F.fieldSelect">
                <option value="">Non précisé</option>
                <option value="M">Homme</option>
                <option value="F">Femme</option>
              </select>
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Situation familiale</label>
              <select v-model="form.situationFamiliale" :class="F.fieldSelect">
                <option value="">Non précisée</option>
                <option v-for="s in SITUATIONS" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <div :class="F.field">
              <label :class="F.fieldLabel">Date de naissance *</label>
              <input v-model="form.dateNaissance" type="date" :class="F.fieldInput" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Lieu de naissance</label>
              <input v-model="form.lieuNaissance" :class="F.fieldInput" placeholder="Ex. Antananarivo" />
            </div>
          </div>
          <p class="text-[11px] text-muted-foreground mt-3">
            Genre, situation familiale et lieu de naissance ne sont exigés par aucun document
            UCODIS : ils restent optionnels, comme sur les fiches d'identité des projets de
            flotte précédents.
          </p>
        </FormSection>

        <FormSection title="Affectation" :recaps="[fonctionChoisie?.libelle, entiteChoisie?.nom]">
          <div class="grid grid-cols-2 gap-x-5 gap-y-3.5 max-sm:grid-cols-1">
            <div :class="F.field">
              <label :class="F.fieldLabel">Fonction *</label>
              <SearchableDropdown :model-value="form.fonctionId" :items="optFonctions" placeholder="Sélectionner…"
                                   @update:model-value="choisirFonction" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Entité *</label>
              <SearchableDropdown v-model="form.entiteId" :items="optEntites" placeholder="Sélectionner…" />
            </div>

            <div :class="[F.field, 'col-span-2']">
              <label :class="F.fieldLabel">Catégorie *</label>
              <select v-model="form.categorieId" :class="F.fieldSelect">
                <option value="" disabled>Sélectionner…</option>
                <option v-for="c in classification.categories" :key="c.id" :value="c.id">{{ c.libelle }}</option>
              </select>
              <span :class="F.fieldHint">Déterminée par la fonction, modifiable si besoin.</span>
            </div>

            <div :class="F.field">
              <label :class="F.fieldLabel">Site *</label>
              <select v-model="form.site" :class="F.fieldSelect">
                <option v-for="s in params.sites" :key="s.id" :value="s.nom">{{ s.nom }}</option>
              </select>
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Type de contrat *</label>
              <select v-model="form.contrat" :class="F.fieldSelect">
                <option v-for="c in CONTRATS" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>

            <div :class="F.field">
              <label :class="F.fieldLabel">Date d'entrée *</label>
              <input v-model="form.dateEntree" type="date" :class="F.fieldInput" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Statut</label>
              <select v-model="form.statut" :class="F.fieldSelect">
                <option v-for="(l, v) in STATUTS" :key="v" :value="v">{{ l }}</option>
              </select>
            </div>

            <div :class="[F.field, 'col-span-2']">
              <label :class="F.fieldLabel">
                Responsable direct
                <span class="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-background border border-border rounded-full px-1.5 py-px ml-1.5 align-middle">
                  <Lock class="w-2.5 h-2.5" /> Automatique
                </span>
              </label>
              <div class="h-9 px-2.5 flex items-center border border-border rounded-md bg-background text-[13px]"
                   :class="responsableDirect ? 'text-foreground' : 'text-muted-foreground italic'">
                <template v-if="responsableDirect">
                  <span class="font-medium">{{ responsableDirect }}</span>
                  <span class="text-muted-foreground text-xs ml-1.5">· Responsable de l'entité</span>
                </template>
                <span v-else class="text-xs">Sélectionnez une entité pour voir le responsable</span>
              </div>
            </div>
          </div>

          <div v-if="fonctionChoisie?.conduit" class="flex items-start gap-2 mt-3.5 bg-warning-bg border border-warning/20 rounded-md px-3 py-2.5">
            <TriangleAlert class="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p class="text-[12px] text-warning/90 leading-relaxed">
              Cette fonction conduit un camion. L'habilitation et les pièces (permis, visite
              médicale) se gèrent depuis la fiche, une fois l'employé créé.
            </p>
          </div>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Lock, TriangleAlert } from '@lucide/vue'
import CreateModalShell from './shared/CreateModalShell.vue'
import FormSection from './ui/form-field/FormSection.vue'
import SearchableDropdown from './ui/SearchableDropdown.vue'
import type { DropdownItem } from './ui/SearchableDropdown.vue'
import * as F from '../lib/formClasses'
import { usePersonnelStore } from '../stores/personnel'
import { useFonctionStore } from '../stores/fonctions'
import { useEntiteStore } from '../stores/entites'
import { useClassificationStore } from '../stores/classification'
import { useParametresStore } from '../stores/parametres'
import { aujourdhuiISO } from '../utils/horloge'
import type { Personnel, StatutPersonnel, TypeContrat } from '../types'

const props = defineProps<{ ouvert: boolean }>()
const emit = defineEmits<{ fermer: []; cree: [id: string] }>()

const personnel = usePersonnelStore()
const fonctions = useFonctionStore()
const entites = useEntiteStore()
const classification = useClassificationStore()
const params = useParametresStore()

const CONTRATS: TypeContrat[] = ['CDI', 'CDD', 'Journalier', 'Stage']
const TYPES_PIECE: NonNullable<Personnel['typePieceIdentite']>[] = ['CIN', 'Passeport', 'Permis de séjour']
const SITUATIONS: NonNullable<Personnel['situationFamiliale']>[] = ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve']
const STATUTS: Record<StatutPersonnel, string> = { actif: 'Actif', conge: 'En congé', suspendu: 'Suspendu', archive: 'Archivé' }

const vide = () => ({
  matricule: '',
  prenom: '', nom: '', fonctionId: '', entiteId: '', categorieId: '', cin: '', dateNaissance: '',
  telephone: '', email: '', genre: '' as Personnel['genre'] | '', lieuNaissance: '',
  situationFamiliale: '' as Personnel['situationFamiliale'] | '',
  typePieceIdentite: 'CIN' as NonNullable<Personnel['typePieceIdentite']>,
  site: params.sites[0]?.nom ?? '', contrat: 'CDI' as TypeContrat,
  dateEntree: aujourdhuiISO(), statut: 'actif' as StatutPersonnel,
})
const form = ref(vide())
const erreur = ref('')

watch(() => props.ouvert, o => { if (o) { form.value = vide(); erreur.value = '' } })

const matriculeParDefaut = computed(() => personnel.apercuProchainMatricule())

const optFonctions = computed<DropdownItem[]>(() =>
  fonctions.liste.map(f => ({ id: f.id, label: f.libelle, sublabel: f.code })))
const optEntites = computed<DropdownItem[]>(() =>
  entites.liste.map(e => ({ id: e.id, label: e.nom, sublabel: e.code })))

const fonctionChoisie = computed(() => fonctions.parId(form.value.fonctionId))
const entiteChoisie = computed(() => entites.parId(form.value.entiteId))
const responsableDirect = computed(() => entiteChoisie.value?.responsableNom ?? null)

/** Choisir la fonction propose l'entité et la catégorie qui la porte, sans forcer. */
function choisirFonction(id: string) {
  form.value.fonctionId = id
  const f = fonctions.parId(id)
  if (f && !form.value.entiteId) form.value.entiteId = f.entiteId
  if (!form.value.categorieId) {
    const cat = classification.categorieParDefaut(id)
    if (cat) form.value.categorieId = cat
  }
}

function fermer() { emit('fermer') }

function creer() {
  erreur.value = ''
  const f = form.value
  if (!f.prenom.trim() || !f.nom.trim()) { erreur.value = 'Le prénom et le nom sont obligatoires.'; return }
  if (!f.fonctionId) { erreur.value = 'Choisissez une fonction.'; return }
  if (!f.entiteId) { erreur.value = 'Choisissez une entité.'; return }
  if (!f.categorieId) { erreur.value = 'Choisissez une catégorie.'; return }
  if (!f.cin.trim()) { erreur.value = 'Le CIN est obligatoire.'; return }
  if (!f.telephone.trim()) { erreur.value = 'Le téléphone est obligatoire.'; return }
  if (!f.dateNaissance) { erreur.value = 'La date de naissance est obligatoire.'; return }
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
    erreur.value = 'Le format du courriel est invalide.'
    return
  }

  const fonction = fonctions.parId(f.fonctionId)!
  const entite = entites.parId(f.entiteId)!

  const id = personnel.creer({
    matricule: f.matricule.trim() || undefined,
    prenom: f.prenom.trim(), nom: f.nom.trim(),
    fonctionId: f.fonctionId, fonctionLibelle: fonction.libelle,
    entiteId: f.entiteId, entiteNom: entite.nom, categorieId: f.categorieId,
    site: f.site, telephone: f.telephone.trim(), email: f.email.trim() || undefined,
    cin: f.cin.trim(), dateNaissance: f.dateNaissance,
    genre: f.genre || undefined, lieuNaissance: f.lieuNaissance.trim() || undefined,
    situationFamiliale: f.situationFamiliale || undefined,
    typePieceIdentite: f.typePieceIdentite,
    contrat: f.contrat, dateEntree: f.dateEntree, statut: f.statut,
    conduit: fonction.conduit,
  })

  emit('cree', id)
  fermer()
}
</script>
