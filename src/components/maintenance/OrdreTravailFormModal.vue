<script setup lang="ts">
/** Déclaration d'une panne : ouvre un ordre de travail (FMS-MA-03). */
import { ref, computed } from 'vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useVehiculeStore } from '../../stores/vehicules'
import { useAuthStore } from '../../stores/auth'
import { LIB_GRAVITE_OT, LIB_ORIGINE_OT } from '../../types/maintenance'
import type { GraviteOT, OrigineOT } from '../../types/maintenance'
import * as F from '../../lib/formClasses'

const emit = defineEmits<{ close: []; cree: [id: string] }>()

const store = useMaintenanceStore()
const vehicules = useVehiculeStore()
const auth = useAuthStore()

const form = ref({ vehiculeId: '', symptome: '', gravite: 'mineure' as GraviteOT, origine: 'remontee_chauffeur' as OrigineOT })
const erreur = ref('')
const optVehicules = computed<DropdownItem[]>(() => vehicules.liste.map(v => ({ id: v.id, label: v.immatriculation, sublabel: `${v.marque} ${v.modele}` })))
const optGravite: DropdownItem[] = Object.entries(LIB_GRAVITE_OT).map(([id, v]) => ({ id, label: v.label }))
const optOrigine: DropdownItem[] = Object.entries(LIB_ORIGINE_OT).map(([id, label]) => ({ id, label }))

/** Un véhicule qui a déjà un ordre ouvert pour le même symptôme n'en reçoit pas un second. */
function declarer() {
  const v = vehicules.parId(form.value.vehiculeId)
  const symptome = form.value.symptome.trim()
  if (!v || !symptome) { erreur.value = 'Indiquez le véhicule et le symptôme constaté.'; return }
  const doublon = store.ordres.find(o => o.vehiculeId === v.id && o.statut !== 'cloture' && o.statut !== 'annule'
    && o.symptome.trim().toLowerCase() === symptome.toLowerCase())
  if (doublon) { erreur.value = `Un ordre ouvert existe déjà pour ce symptôme sur ${v.immatriculation} : ${doublon.reference}.`; return }
  const id = store.creerOT({
    vehiculeId: v.id, vehiculePlaque: v.immatriculation,
    origine: form.value.origine, declarePar: auth.user?.nom ?? 'Responsable flotte', declareLe: new Date().toISOString(),
    symptome, gravite: form.value.gravite, typeMaintenance: 'correctif', kilometrage: v.kilometrage,
  })
  emit('cree', id)
}
</script>

<template>
  <CreateModalShell
    title="Déclarer une panne"
    banner-label="Maintenance · Ordres de travail"
    create-label="Déclarer"
    :save-error="erreur || null"
    @close="emit('close')"
    @create="declarer"
  >
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <FormSection title="Panne constatée">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Véhicule *</label><SearchableDropdown v-model="form.vehiculeId" :items="optVehicules" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Origine</label><SearchableDropdown v-model="form.origine" :items="optOrigine" placeholder="Sélectionner…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Gravité *</label><SearchableDropdown v-model="form.gravite" :items="optGravite" placeholder="Sélectionner…" /></div>
            <div></div>
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Symptôme constaté *</label><textarea v-model="form.symptome" rows="3" :class="F.fieldTextarea" placeholder="Ce qui a été observé…"></textarea></div>
          </div>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
