<script setup lang="ts">
import { maintenant } from '../../utils/horloge'
/** Déclaration d'une indisponibilité hors ordre de travail. */
import { ref, computed } from 'vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useCodificationIndispoStore } from '../../stores/codificationIndispo'
import { useVehiculeStore } from '../../stores/vehicules'
import { LIB_FAMILLE_INDISPO } from '../../types/maintenance'
import * as F from '../../lib/formClasses'

const emit = defineEmits<{ close: []; cree: [id: string] }>()

const store = useMaintenanceStore()
const codif = useCodificationIndispoStore()
const vehiculesStore = useVehiculeStore()

const maintenantLocal = () => { const d = maintenant(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const form = ref({ vehiculeId: '', code: '', debut: maintenantLocal(), commentaire: '' })
const erreur = ref('')
const optVehicules = computed<DropdownItem[]>(() => vehiculesStore.auParc.map(v => ({ id: v.id, label: v.immatriculation, sublabel: `${v.marque} ${v.modele}` })))
const optCodes = computed<DropdownItem[]>(() => codif.codes.map(c => ({ id: c.code, label: `${c.code} · ${c.libelle}`, sublabel: LIB_FAMILLE_INDISPO[c.famille] })))

function declarer() {
  const v = vehiculesStore.liste.find(x => x.id === form.value.vehiculeId)
  if (!v) { erreur.value = 'Indiquez le véhicule, la cause et le début.'; return }
  const r = store.declarerIndispo({ vehiculeId: v.id, vehiculePlaque: v.immatriculation, code: form.value.code, debut: form.value.debut, commentaire: form.value.commentaire.trim() || undefined })
  if (!r.ok || !r.id) { erreur.value = r.motif ?? ''; return }
  emit('cree', r.id)
}
</script>

<template>
  <CreateModalShell
    title="Déclarer une indisponibilité"
    banner-label="Maintenance · Indisponibilités"
    create-label="Enregistrer"
    :save-error="erreur || null"
    @close="emit('close')"
    @create="declarer"
  >
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <FormSection title="Indisponibilité">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Véhicule *</label><SearchableDropdown v-model="form.vehiculeId" :items="optVehicules" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Cause *</label><SearchableDropdown v-model="form.code" :items="optCodes" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Début *</label><input v-model="form.debut" type="datetime-local" :class="F.fieldInput" /></div>
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Commentaire</label><textarea v-model="form.commentaire" rows="3" :class="F.fieldTextarea"></textarea></div>
          </div>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
