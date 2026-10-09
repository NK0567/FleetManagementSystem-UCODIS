<script setup lang="ts">
/** Enregistrement d'un pneu à l'achat (FMS-MA-14). */
import { ref, computed } from 'vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { usePneusStore } from '../../stores/pneus'
import { usePrestatairesStore } from '../../stores/prestataires'
import * as F from '../../lib/formClasses'

const emit = defineEmits<{ close: []; cree: [id: string] }>()

const store = usePneusStore()
const prestataires = usePrestatairesStore()

const form = ref({ numeroSerie: '', marque: '', taille: '', profil: '', indiceChargeVitesse: '', dateFabrication: '', fournisseurId: '', prixAr: undefined as number | undefined, dateAchat: new Date().toISOString().slice(0, 10), etat: 'neuf' })
const erreur = ref('')
const optFournisseurs = computed<DropdownItem[]>(() => prestataires.autorisesDeType('fournisseur_pneus').map(p => ({ id: p.id, label: p.nom })))
const optEtat: DropdownItem[] = [{ id: 'neuf', label: 'Neuf' }, { id: 'rechape', label: 'Rechapé' }]

function enregistrer() {
  const f = form.value
  if (f.dateFabrication && !/^\d{4}$/.test(f.dateFabrication.trim())) { erreur.value = 'La date de fabrication se note en 4 chiffres : semaine puis année, ex. 3324.'; return }
  const res = store.creer({ numeroSerie: f.numeroSerie, marque: f.marque.trim(), taille: f.taille.trim(), profil: f.profil.trim() || undefined,
    indiceChargeVitesse: f.indiceChargeVitesse.trim() || undefined, dateFabrication: f.dateFabrication.trim() || undefined,
    fournisseur: prestataires.getById(f.fournisseurId)?.nom, prixAr: f.prixAr ?? 0, dateAchat: f.dateAchat, neuf: f.etat === 'neuf' })
  if (!res.ok || !res.id) { erreur.value = res.motif ?? ''; return }
  emit('cree', res.id)
}
</script>

<template>
  <CreateModalShell
    title="Nouveau pneu"
    banner-label="Maintenance · Pneumatique"
    create-label="Mettre en stock"
    :save-error="erreur || null"
    @close="emit('close')"
    @create="enregistrer"
  >
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <FormSection title="Identification">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Numéro de série *</label><input v-model="form.numeroSerie" :class="F.fieldInput" class="font-mono" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Marque *</label><input v-model="form.marque" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Taille *</label><input v-model="form.taille" :class="F.fieldInput" placeholder="ex. 315/80R22,5" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Profil</label><input v-model="form.profil" :class="F.fieldInput" placeholder="ex. Pneu traction" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Indice de charge et vitesse</label><input v-model="form.indiceChargeVitesse" :class="F.fieldInput" placeholder="ex. 156/150K" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Date de fabrication</label><input v-model="form.dateFabrication" :class="F.fieldInput" placeholder="Semaine et année, ex. 3324" maxlength="4" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">État</label><SearchableDropdown v-model="form.etat" :items="optEtat" placeholder="Sélectionner…" /></div>
          </div>
        </FormSection>

        <FormSection title="Achat">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Fournisseur</label><SearchableDropdown v-model="form.fournisseurId" :items="optFournisseurs" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Date d'achat *</label><input v-model="form.dateAchat" type="date" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Prix (Ar) *</label><input v-model.number="form.prixAr" type="number" min="0" :class="F.fieldInput" /></div>
          </div>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
