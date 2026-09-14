<template>
  <CreateModalShell
    v-if="ouvert"
    title="Nouvelle entité"
    banner-label="Entités · Création"
    create-label="Créer l'entité"
    :save-error="erreur || null"
    @close="fermer"
    @create="creer"
  >
    <template #form>
      <div class="max-w-2xl mx-auto w-full px-6 py-6">
        <FormSection title="Identification">
          <div class="grid grid-cols-2 gap-x-5 gap-y-3.5 max-sm:grid-cols-1">
            <div :class="F.field">
              <label :class="F.fieldLabel">Code *</label>
              <input v-model="form.code" :class="F.fieldInput" placeholder="Ex. QHSE" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Type *</label>
              <select v-model="form.type" :class="F.fieldSelect">
                <option value="direction">Direction</option>
                <option value="service">Service</option>
                <option value="equipe">Équipe</option>
              </select>
            </div>

            <div :class="[F.field, 'col-span-2']">
              <label :class="F.fieldLabel">Nom *</label>
              <input v-model="form.nom" :class="F.fieldInput" placeholder="Ex. Service Qualité et Sécurité" />
            </div>

            <div :class="F.field">
              <label :class="F.fieldLabel">Rattachée à</label>
              <SearchableDropdown v-model="form.parentId" :items="optEntites" placeholder="Aucune (entité racine)" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Site</label>
              <select v-model="form.site" :class="F.fieldSelect">
                <option v-for="s in params.sites" :key="s.id" :value="s.nom">{{ s.nom }}</option>
              </select>
            </div>

            <div :class="[F.field, 'col-span-2']">
              <label :class="F.fieldLabel">Description</label>
              <textarea v-model="form.description" rows="2" :class="F.fieldTextarea" placeholder="Rôle de l'entité…"></textarea>
            </div>
          </div>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import CreateModalShell from './shared/CreateModalShell.vue'
import FormSection from './ui/form-field/FormSection.vue'
import SearchableDropdown from './ui/SearchableDropdown.vue'
import type { DropdownItem } from './ui/SearchableDropdown.vue'
import * as F from '../lib/formClasses'
import { useEntiteStore } from '../stores/entites'
import { useParametresStore } from '../stores/parametres'
import type { TypeEntite } from '../types'

const props = defineProps<{ ouvert: boolean }>()
const emit = defineEmits<{ fermer: []; cree: [id: string] }>()

const entites = useEntiteStore()
const params = useParametresStore()

const vide = () => ({
  code: '', nom: '', type: 'service' as TypeEntite, parentId: entites.racine?.id ?? '',
  site: params.sites[0]?.nom ?? '', description: '',
})
const form = ref(vide())
const erreur = ref('')

const optEntites = computed<DropdownItem[]>(() =>
  entites.liste.map(e => ({ id: e.id, label: e.nom, sublabel: e.code })))

watch(() => props.ouvert, o => { if (o) { form.value = vide(); erreur.value = '' } })

function fermer() { emit('fermer') }

function creer() {
  erreur.value = ''
  const f = form.value
  if (!f.code.trim() || !f.nom.trim()) { erreur.value = 'Le code et le nom sont obligatoires.'; return }
  if (entites.liste.some(e => e.code.toLowerCase() === f.code.trim().toLowerCase())) {
    erreur.value = 'Ce code est déjà utilisé par une autre entité.'
    return
  }

  const id = entites.creer({
    code: f.code.trim().toUpperCase(),
    nom: f.nom.trim(),
    type: f.type,
    parentId: f.parentId || null,
    site: f.site,
    description: f.description.trim(),
    effectif: 0,
    statut: 'validee',
  })

  emit('cree', id)
  fermer()
}
</script>
