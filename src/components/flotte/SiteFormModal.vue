<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import * as F from '../../lib/formClasses'
import { useSitesStore } from '../../stores/sites'
import type { TypeSiteReseau } from '../../types'

const props = defineProps<{ modelValue: boolean; editId?: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const store = useSitesStore()

const form = reactive({ code: '', nom: '', ville: '', region: '', type: '' as TypeSiteReseau | '', actif: true })
const errors = reactive<Partial<Record<string, string>>>({})
const submitError = ref('')
const submitting = ref(false)

watch(() => props.modelValue, open => {
  if (!open) return
  Object.keys(errors).forEach(k => delete errors[k])
  submitError.value = ''
  if (props.editId) {
    const s = store.getById(props.editId)
    if (s) Object.assign(form, { code: s.code, nom: s.nom, ville: s.ville, region: s.region ?? '', type: s.type, actif: s.actif })
  } else {
    Object.assign(form, { code: '', nom: '', ville: '', region: '', type: '', actif: true })
  }
})

function valider(): boolean {
  let ok = true
  if (!form.code.trim()) { errors.code = 'Le code est obligatoire.'; ok = false } else delete errors.code
  if (!form.type) { errors.type = 'Le type est obligatoire.'; ok = false } else delete errors.type
  if (!form.nom.trim()) { errors.nom = 'Le nom est obligatoire.'; ok = false } else delete errors.nom
  if (!form.ville.trim()) { errors.ville = 'La ville est obligatoire.'; ok = false } else delete errors.ville
  if (!props.editId && store.sites.some(s => s.code === form.code.trim().toUpperCase())) {
    errors.code = 'Ce code existe déjà.'; ok = false
  }
  return ok
}

function handleSubmit() {
  submitError.value = ''
  if (!valider()) return
  submitting.value = true
  const donnees = {
    code: form.code.trim().toUpperCase(), nom: form.nom.trim(), ville: form.ville.trim(),
    region: form.region.trim() || undefined, type: form.type as TypeSiteReseau,
    lat: -18.8792, lng: 47.5079, actif: form.actif,
  }
  if (props.editId) store.modifier(props.editId, donnees)
  else store.creer(donnees)
  submitting.value = false
  emit('saved')
  emit('update:modelValue', false)
}

const optType: DropdownItem[] = [
  { id: 'Dépôt', label: 'Dépôt' },
  { id: 'Entrepôt client', label: 'Entrepôt client' },
  { id: 'Zone à risque', label: 'Zone à risque' },
  { id: 'Point de contrôle', label: 'Point de contrôle' },
  { id: 'Relais', label: 'Relais' },
]
</script>

<template>
  <CreateModalShell
    v-if="modelValue"
    :title="editId ? 'Modifier le site' : 'Nouveau site'"
    :banner-label="editId ? 'Sites & géofences · Modification' : 'Sites & géofences · Création'"
    :create-label="editId ? 'Enregistrer' : 'Créer le site'"
    :is-saving="submitting"
    :save-error="submitError || null"
    @close="$emit('update:modelValue', false)"
    @create="handleSubmit"
  >
    <template #form>
      <div class="flex-1 overflow-y-auto px-8 py-6 max-w-2xl mx-auto">
        <FormSection title="Informations du site">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field">
              <label :class="F.fieldLabel">Code *</label>
              <input v-model="form.code" type="text" placeholder="ex. DEP-TNJ-02" :class="F.fieldInput" class="font-mono" @input="form.code = (form.code as string).toUpperCase()" />
              <p v-if="errors.code" class="text-danger text-[11px]">{{ errors.code }}</p>
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Type *</label>
              <SearchableDropdown v-model="form.type" :items="optType" placeholder="Sélectionner un type" />
              <p v-if="errors.type" class="text-danger text-[11px]">{{ errors.type }}</p>
            </div>
            <div :class="[F.field, 'col-span-2']">
              <label :class="F.fieldLabel">Nom complet *</label>
              <input v-model="form.nom" type="text" placeholder="ex. Entrepôt secondaire Tanjombato" :class="F.fieldInput" />
              <p v-if="errors.nom" class="text-danger text-[11px]">{{ errors.nom }}</p>
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Ville *</label>
              <input v-model="form.ville" type="text" placeholder="ex. Antananarivo" :class="F.fieldInput" />
              <p v-if="errors.ville" class="text-danger text-[11px]">{{ errors.ville }}</p>
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Région</label>
              <input v-model="form.region" type="text" placeholder="ex. Analamanga" :class="F.fieldInput" />
            </div>
            <div class="col-span-2 flex items-center gap-3 pt-1">
              <input id="actifModal" v-model="form.actif" type="checkbox" class="w-4 h-4 rounded" />
              <label for="actifModal" class="text-[13px] font-medium text-foreground cursor-pointer">Site actif</label>
            </div>
          </div>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
