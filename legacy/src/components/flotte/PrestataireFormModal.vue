<script setup lang="ts">
/** Création d'un prestataire (FMS-DB-13). */
import { ref, computed } from 'vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { usePrestatairesStore } from '../../stores/prestataires'
import * as F from '../../lib/formClasses'

const emit = defineEmits<{ close: []; cree: [id: string] }>()
const store = usePrestatairesStore()
const form = ref({ nom: '', type: '', contact: '', telephone: '', email: '', adresse: '' })
const erreur = ref('')
const optTypes = computed<DropdownItem[]>(() => store.types.map(t => ({ id: t.code, label: t.libelle })))
function creer() {
  const f = form.value
  const r = store.creer({ nom: f.nom, type: f.type, contact: f.contact.trim() || undefined, telephone: f.telephone.trim() || undefined,
    email: f.email.trim() || undefined, adresse: f.adresse.trim() || undefined, autorise: true, source: 'saisie' })
  if (!r.ok) { erreur.value = r.motif ?? ''; return }
  emit('cree', r.id!)
}
</script>

<template>
  <CreateModalShell title="Nouveau prestataire" banner-label="Flotte · Prestataires" create-label="Créer le prestataire" :save-error="erreur || null" @close="emit('close')" @create="creer">
    <template #form>
      <div class="max-w-2xl mx-auto w-full px-6 py-6">
        <FormSection title="Identification">
          <div class="grid grid-cols-2 gap-x-5 gap-y-3.5 max-sm:grid-cols-1">
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Nom *</label><input v-model="form.nom" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Type *</label><SearchableDropdown v-model="form.type" :items="optTypes" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Contact</label><input v-model="form.contact" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Téléphone</label><input v-model="form.telephone" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">E-mail</label><input v-model="form.email" type="email" :class="F.fieldInput" /></div>
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Adresse</label><input v-model="form.adresse" :class="F.fieldInput" /></div>
          </div>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
