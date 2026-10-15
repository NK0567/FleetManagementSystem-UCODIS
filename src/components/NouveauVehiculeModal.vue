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
                <option v-for="t in typesVeh.types.filter(x => x.actif)" :key="t.code" :value="t.code">{{ t.libelle }}</option>
              </select>
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Immatriculation *</label>
              <input v-model="form.immatriculation" :class="F.fieldInput" placeholder="Ex. 4031 TBA" />
            </div>

            <div :class="F.field">
              <label :class="F.fieldLabel">VIN (numéro de châssis) *</label>
              <input v-model="form.vin" :class="F.fieldInput" placeholder="Numéro de châssis" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Base *</label>
              <select v-model="form.site" :class="F.fieldSelect">
                <option v-for="s in bases" :key="s.id" :value="s.nom">{{ s.nom }}</option>
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
            <div v-if="def?.motorise" :class="F.field">
              <label :class="F.fieldLabel">Carburant</label>
              <input v-model="form.carburant" :class="F.fieldInput" placeholder="Ex. Diesel" />
            </div>
            <div v-if="def?.motorise" :class="F.field">
              <label :class="F.fieldLabel">Capacité du réservoir (L)</label>
              <input v-model.number="form.capaciteReservoirL" type="number" min="0" :class="F.fieldInput" />
            </div>

            <div v-if="def" :class="F.field">
              <label :class="F.fieldLabel">{{ def.porteMarchandise ? 'Charge maximale autorisée (kg)' : 'Charge maximale, poids total roulant autorisé (kg)' }}</label>
              <input v-model.number="form.chargeMaxKg" type="number" :class="F.fieldInput" />
            </div>
            <div v-if="def?.motorise" :class="F.field">
              <label :class="F.fieldLabel">Kilométrage</label>
              <input v-model.number="form.kilometrage" type="number" min="0" :class="F.fieldInput" />
            </div>
          </div>
        </FormSection>
        <FormSection v-if="def?.compartiments" title="Compartiments">
          <div v-for="(c, i) in form.compartiments" :key="i" class="flex items-center gap-2 mb-1.5">
            <span class="text-xs w-28">Compartiment {{ i + 1 }}</span>
            <input v-model.number="c.volumeL" type="number" min="1" :class="F.fieldInput" class="!w-[140px]" />
            <span class="text-xs text-muted-foreground">L</span>
            <button v-if="form.compartiments.length > 1" class="text-[11px] text-danger hover:underline bg-transparent border-0 cursor-pointer" @click="form.compartiments.splice(i, 1)">Retirer</button>
          </div>
          <button :class="F.btnOutline" @click="form.compartiments.push({ volumeL: 0 })">Ajouter un compartiment</button>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import CreateModalShell from './shared/CreateModalShell.vue'
import FormSection from './ui/form-field/FormSection.vue'
import * as F from '../lib/formClasses'
import { useVehiculeStore } from '../stores/vehicules'
import { useSitesStore } from '../stores/sites'
import { useTypesVehiculesStore } from '../stores/typesVehicules'
import type { TypeVehicule } from '../types'

const props = defineProps<{ ouvert: boolean }>()
const emit = defineEmits<{ fermer: []; cree: [id: string] }>()

const vehicules = useVehiculeStore()
const sites = useSitesStore()
const typesVeh = useTypesVehiculesStore()
/** Bases proposées : les sites actifs, quel que soit leur type paramétré. */
const bases = computed(() => [...sites.actifs].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')))

const vide = () => ({
  type: (typesVeh.types.find(t => t.actif)?.code ?? 'tracteur') as TypeVehicule, immatriculation: '', vin: '',
  marque: '', modele: '', categorie: '', carburant: 'Diesel', capaciteReservoirL: undefined as number | undefined,
  chargeMaxKg: undefined as number | undefined, kilometrage: 0,
  site: bases.value[0]?.nom ?? '', compartiments: [{ volumeL: 0 }] as { volumeL: number }[],
})
const def = computed(() => typesVeh.get(form.value.type))
const form = ref(vide())
const erreur = ref('')

watch(() => props.ouvert, o => { if (o) { form.value = vide(); erreur.value = '' } })

function fermer() { emit('fermer') }

function creer() {
  erreur.value = ''
  const f = form.value
  if (!f.immatriculation.trim() || !f.vin.trim()) { erreur.value = "L'immatriculation et le VIN sont obligatoires."; return }
  if (!f.marque.trim() || !f.modele.trim()) { erreur.value = 'La marque et le modèle sont obligatoires.'; return }
  const immat = f.immatriculation.trim().toUpperCase()
  if (vehicules.liste.some(v => v.immatriculation.toUpperCase() === immat || v.historiqueImmatriculations?.some(h => h.ancienne === immat))) {
    erreur.value = 'Cette immatriculation est déjà utilisée.'
    return
  }
  if (vehicules.liste.some(v => v.vin.toUpperCase() === f.vin.trim().toUpperCase())) { erreur.value = 'Ce VIN est déjà enregistré.'; return }
  if (!f.site) { erreur.value = 'Choisissez la base du véhicule.'; return }
  if (f.kilometrage < 0 || (f.chargeMaxKg ?? 0) < 0 || (f.capaciteReservoirL ?? 0) < 0) { erreur.value = 'Les valeurs saisies ne peuvent pas être négatives.'; return }
  const d = def.value
  if (d?.compartiments && f.compartiments.some(c => !(c.volumeL > 0))) { erreur.value = 'Chaque compartiment a un volume positif, en litres.'; return }

  const id = vehicules.creer({
    immatriculation: immat, vin: f.vin.trim().toUpperCase(), type: f.type,
    marque: f.marque.trim(), modele: f.modele.trim(),
    categorie: f.categorie.trim() || typesVeh.libelle(f.type),
    carburant: d?.motorise ? (f.carburant.trim() || 'Diesel') : 'Sans objet',
    capaciteReservoirL: d?.motorise ? f.capaciteReservoirL || undefined : undefined,
    chargeMaxKg: f.chargeMaxKg,
    compartiments: d?.compartiments ? f.compartiments.map((c, i) => ({ numero: i + 1, volumeL: c.volumeL })) : undefined,
    site: f.site, statut: 'disponible', kilometrage: d?.motorise ? f.kilometrage || 0 : 0,
  })

  emit('cree', id)
  fermer()
}
</script>
