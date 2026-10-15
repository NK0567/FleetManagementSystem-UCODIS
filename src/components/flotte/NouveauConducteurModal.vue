<script setup lang="ts">
/** Nouvelle personne saisie directement dans le FMS : conducteur, aide ou personnel technique (FMS-DB-08). */
import { ref, computed } from 'vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { usePersonnelStore } from '../../stores/personnel'
import { useFonctionStore } from '../../stores/fonctions'
import { useEntiteStore } from '../../stores/entites'
import { useAuthStore } from '../../stores/auth'
import { useConfigurationStore } from '../../stores/configuration'
import { aujourdhuiISO } from '../../utils/horloge'
import type { TypeContrat } from '../../types'
import * as F from '../../lib/formClasses'

const emit = defineEmits<{ close: []; cree: [id: string] }>()
const personnel = usePersonnelStore()
const fonctions = useFonctionStore()
const entites = useEntiteStore()
const auth = useAuthStore()

const form = ref({ prenom: '', nom: '', fonctionId: fonctions.fonctionsConduite[0]?.id ?? fonctions.liste[0]?.id ?? '', telephone: '', cin: '', dateNaissance: '', dateEntree: aujourdhuiISO(), contrat: (useConfigurationStore().parametres.typesContrat[0] ?? '') as TypeContrat, habilite: false })
const erreur = ref('')
const optFonctions = computed<DropdownItem[]>(() => fonctions.liste.map(f => ({ id: f.id, label: f.libelle })))
const fonctionConduit = computed(() => !!fonctions.parId(form.value.fonctionId)?.conduit)
const config = useConfigurationStore()
const optContrats = computed<DropdownItem[]>(() => config.parametres.typesContrat.map(c => ({ id: c, label: c })))

function creer() {
  const f = form.value
  if (!f.prenom.trim() || !f.nom.trim()) { erreur.value = 'Indiquez le prénom et le nom.'; return }
  const fn = fonctions.parId(f.fonctionId)
  if (!fn) { erreur.value = 'Choisissez la fonction.'; return }
  if (!f.telephone.trim()) { erreur.value = 'Indiquez le téléphone.'; return }
  if (!f.cin.trim()) { erreur.value = "Indiquez le numéro de la pièce d'identité."; return }
  if (personnel.liste.some(p => p.cin === f.cin.trim())) { erreur.value = "Cette pièce d'identité est déjà enregistrée."; return }
  if (!f.dateEntree || f.dateEntree > aujourdhuiISO()) { erreur.value = "La date d'entrée doit être passée ou du jour."; return }
  const entite = entites.parId(fn.entiteId)
  const id = personnel.creer({ prenom: f.prenom.trim(), nom: f.nom.trim().toUpperCase(), fonctionId: fn.id, fonctionLibelle: fn.libelle,
    entiteId: fn.entiteId, entiteNom: entite?.nom ?? '', site: '', telephone: f.telephone.trim(), cin: f.cin.trim(), dateNaissance: f.dateNaissance,
    contrat: f.contrat, dateEntree: f.dateEntree, conduit: fn.conduit })
  if (fn.conduit && f.habilite) personnel.basculerHabilitation(id, auth.user?.nom ?? 'Utilisateur')
  emit('cree', id)
}
</script>

<template>
  <CreateModalShell title="Nouvelle personne" banner-label="Flotte · Conducteurs" create-label="Enregistrer" :save-error="erreur || null" @close="emit('close')" @create="creer">
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <FormSection title="Identité">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Prénom *</label><input v-model="form.prenom" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Nom *</label><input v-model="form.nom" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Fonction *</label><SearchableDropdown v-model="form.fonctionId" :items="optFonctions" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Téléphone *</label><input v-model="form.telephone" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">N° de pièce d'identité *</label><input v-model="form.cin" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Date de naissance</label><input v-model="form.dateNaissance" type="date" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Contrat</label><SearchableDropdown v-model="form.contrat" :items="optContrats" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Date d'entrée *</label><input v-model="form.dateEntree" type="date" :class="F.fieldInput" /></div>
            <label v-if="fonctionConduit" class="flex items-center gap-2 text-[13px] col-span-2 max-sm:col-span-1"><input v-model="form.habilite" type="checkbox" class="accent-primary" /> Habilité à conduire</label>
          </div>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
