<script setup lang="ts">
/** Enregistrement d'une carte carburant, rattachée à un véhicule ou à un chauffeur (FMS-CA-02). */
import { ref, computed } from 'vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useCartesCarburantStore, LIB_RATTACHEMENT, type RattachementCarte } from '../../stores/cartesCarburant'
import { usePrestatairesStore } from '../../stores/prestataires'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useAuthStore } from '../../stores/auth'
import * as F from '../../lib/formClasses'

const emit = defineEmits<{ close: []; cree: [id: string] }>()
const store = useCartesCarburantStore()
const prestataires = usePrestatairesStore()
const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const auth = useAuthStore()

const form = ref({
  numero: '', fournisseurId: '', rattachement: 'vehicule' as RattachementCarte, vehiculeId: '', chauffeurId: '', dateExpiration: '',
  montantMensuelAr: 12_000_000 as number | undefined, volumeMensuelL: 2_000 as number | undefined, transactionsParJour: 3 as number | undefined,
  zones: '', heureDebut: 4 as number | undefined, heureFin: 21 as number | undefined,
})
const erreur = ref('')
const optFournisseurs = computed<DropdownItem[]>(() => prestataires.autorisesDeType('fournisseur_carburant').map(p => ({ id: p.id, label: p.nom })))
const optRattachement: DropdownItem[] = Object.entries(LIB_RATTACHEMENT).map(([id, label]) => ({ id, label }))
const optVehicules = computed<DropdownItem[]>(() => vehicules.tracteurs.filter(v => v.statut !== 'vendu').map(v => ({ id: v.id, label: v.immatriculation, sublabel: `${v.marque} ${v.modele}` })))
const optChauffeurs = computed<DropdownItem[]>(() => personnel.liste.filter(p => p.fonctionId === 'f-cond').map(p => ({ id: p.id, label: p.nomComplet })))
const vide = (n: number | undefined | '') => (n === '' || n == null ? undefined : n)

function enregistrer() {
  const f = form.value
  const r = store.creer({
    numero: f.numero, fournisseurId: f.fournisseurId, rattachement: f.rattachement,
    vehiculeId: f.rattachement === 'vehicule' ? f.vehiculeId || undefined : undefined,
    chauffeurId: f.rattachement === 'chauffeur' ? f.chauffeurId || undefined : undefined,
    dateExpiration: f.dateExpiration,
    limites: {
      montantMensuelAr: vide(f.montantMensuelAr), volumeMensuelL: vide(f.volumeMensuelL), transactionsParJour: vide(f.transactionsParJour),
      zones: f.zones.split(',').map(z => z.trim()).filter(Boolean), heureDebut: vide(f.heureDebut), heureFin: vide(f.heureFin),
    },
  }, auth.user?.nom ?? 'Responsable flotte')
  if (!r.ok) { erreur.value = r.motif ?? ''; return }
  emit('cree', r.id!)
}
</script>

<template>
  <CreateModalShell title="Nouvelle carte carburant" banner-label="Flotte · Cartes carburant" create-label="Enregistrer la carte" :save-error="erreur || null" @close="emit('close')" @create="enregistrer">
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <FormSection title="Carte">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Numéro de carte *</label><input v-model="form.numero" :class="F.fieldInput" class="font-mono" placeholder="ex. 7089 1200 0006 4030" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Fournisseur *</label><SearchableDropdown v-model="form.fournisseurId" :items="optFournisseurs" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Rattachée à *</label><SearchableDropdown v-model="form.rattachement" :items="optRattachement" placeholder="Sélectionner…" /></div>
            <div v-if="form.rattachement === 'vehicule'" :class="F.field"><label :class="F.fieldLabel">Véhicule *</label><SearchableDropdown v-model="form.vehiculeId" :items="optVehicules" placeholder="Choisir…" /></div>
            <div v-else :class="F.field"><label :class="F.fieldLabel">Chauffeur *</label><SearchableDropdown v-model="form.chauffeurId" :items="optChauffeurs" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Date d'expiration *</label><input v-model="form.dateExpiration" type="date" :class="F.fieldInput" /></div>
          </div>
        </FormSection>
        <FormSection title="Limites">
          <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Montant par mois (Ar)</label><input v-model.number="form.montantMensuelAr" type="number" min="0" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Volume par mois (L)</label><input v-model.number="form.volumeMensuelL" type="number" min="0" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Transactions par jour</label><input v-model.number="form.transactionsParJour" type="number" min="0" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Horaire autorisé : début (h)</label><input v-model.number="form.heureDebut" type="number" min="0" max="23" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Horaire autorisé : fin (h)</label><input v-model.number="form.heureFin" type="number" min="0" max="23" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Zone (villes, séparées par une virgule)</label><input v-model="form.zones" :class="F.fieldInput" placeholder="vide : partout" /></div>
          </div>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
