<template>
  <CreateModalShell
    v-if="ouvert"
    title="Nouveau véhicule"
    banner-label="Véhicules · Création"
    create-label="Créer le véhicule"
    :save-error="erreur || null"
    @close="fermer"
    @create="creer"
  >
    <template #form>
      <div class="max-w-2xl mx-auto w-full px-6 py-6">
        <FormSection title="Identification">
          <div class="grid grid-cols-2 gap-x-5 gap-y-3.5 max-sm:grid-cols-1">
            <div :class="F.field">
              <label :class="F.fieldLabel">Type *</label>
              <select v-model="form.type" :class="F.fieldSelect">
                <option value="tracteur">Tracteur</option>
                <option value="semi_remorque">Semi-remorque</option>
              </select>
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Immatriculation *</label>
              <input v-model="form.immatriculation" :class="F.fieldInput" placeholder="Ex. 4031 TBA" />
            </div>

            <div :class="F.field">
              <label :class="F.fieldLabel">VIN *</label>
              <input v-model="form.vin" :class="F.fieldInput" placeholder="Numéro de châssis" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Site *</label>
              <select v-model="form.site" :class="F.fieldSelect">
                <option v-for="s in params.sites" :key="s.id" :value="s.nom">{{ s.nom }}</option>
              </select>
            </div>

            <div :class="F.field">
              <label :class="F.fieldLabel">Marque *</label>
              <input v-model="form.marque" :class="F.fieldInput" placeholder="Ex. Sinotruk" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Modèle *</label>
              <input v-model="form.modele" :class="F.fieldInput" placeholder="Ex. Howo A7" />
            </div>

            <div :class="F.field">
              <label :class="F.fieldLabel">Catégorie</label>
              <input v-model="form.categorie" :class="F.fieldInput" placeholder="Ex. Tracteur routier" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Carburant</label>
              <input v-model="form.carburant" :class="F.fieldInput" placeholder="Ex. Diesel" />
            </div>

            <div v-if="form.type === 'semi_remorque'" :class="F.field">
              <label :class="F.fieldLabel">Charge maximale autorisée (kg)</label>
              <input v-model.number="form.chargeMaxKg" type="number" :class="F.fieldInput" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Kilométrage</label>
              <input v-model.number="form.kilometrage" type="number" :class="F.fieldInput" />
            </div>

            <div :class="F.field">
              <label :class="F.fieldLabel">Statut *</label>
              <select v-model="form.statut" :class="F.fieldSelect">
                <option value="actif">Disponible</option>
                <option value="reparation">En réparation</option>
                <option value="hors_service">Hors service</option>
              </select>
            </div>
          </div>
        </FormSection>
        <p class="text-[11px] text-muted-foreground">
          Le véhicule est créé disponible et non attelé. L'attelage et l'affectation à un
          conducteur se font ensuite depuis les écrans dédiés du module Flotte.
        </p>
      </div>
    </template>
  </CreateModalShell>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import CreateModalShell from './shared/CreateModalShell.vue'
import FormSection from './ui/form-field/FormSection.vue'
import * as F from '../lib/formClasses'
import { useVehiculeStore } from '../stores/vehicules'
import { useParametresStore } from '../stores/parametres'
import type { TypeVehicule, StatutVehicule } from '../types'

const props = defineProps<{ ouvert: boolean }>()
const emit = defineEmits<{ fermer: []; cree: [id: string] }>()

const vehicules = useVehiculeStore()
const params = useParametresStore()

const vide = () => ({
  type: 'tracteur' as TypeVehicule, immatriculation: '', vin: '',
  marque: '', modele: '', categorie: '', carburant: 'Diesel',
  chargeMaxKg: undefined as number | undefined, kilometrage: 0,
  site: params.sites[0]?.nom ?? '', statut: 'actif' as StatutVehicule,
})
const form = ref(vide())
const erreur = ref('')

watch(() => props.ouvert, o => { if (o) { form.value = vide(); erreur.value = '' } })

function fermer() { emit('fermer') }

function creer() {
  erreur.value = ''
  const f = form.value
  if (!f.immatriculation.trim() || !f.vin.trim()) { erreur.value = "L'immatriculation et le VIN sont obligatoires."; return }
  if (!f.marque.trim() || !f.modele.trim()) { erreur.value = 'La marque et le modèle sont obligatoires.'; return }
  if (vehicules.liste.some(v => v.immatriculation.toLowerCase() === f.immatriculation.trim().toLowerCase())) {
    erreur.value = 'Cette immatriculation est déjà utilisée.'
    return
  }

  const id = vehicules.creer({
    immatriculation: f.immatriculation.trim(), vin: f.vin.trim(), type: f.type,
    marque: f.marque.trim(), modele: f.modele.trim(),
    categorie: f.categorie.trim() || (f.type === 'tracteur' ? 'Tracteur routier' : 'Semi-remorque'),
    carburant: f.type === 'tracteur' ? (f.carburant.trim() || 'Diesel') : 'Sans objet',
    chargeMaxKg: f.type === 'semi_remorque' ? f.chargeMaxKg : undefined,
    site: f.site, statut: f.statut, kilometrage: f.kilometrage || 0,
  })

  emit('cree', id)
  fermer()
}
</script>
