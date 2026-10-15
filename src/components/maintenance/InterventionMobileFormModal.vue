<script setup lang="ts">
/** Déclenchement d'une intervention de l'équipe mobile : camion, position, équipe et heure de départ. */
import { ref, computed } from 'vue'
import { maintenant } from '../../utils/horloge'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useVehiculeStore } from '../../stores/vehicules'
import type { InterventionMobile } from '../../types/maintenance'
import * as F from '../../lib/formClasses'

const emit = defineEmits<{ close: []; cree: [id: string] }>()

const store = useMaintenanceStore()
const vehiculesStore = useVehiculeStore()

const maintenantLocal = () => { const d = maintenant(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const form = ref({ type: (store.typesMissionActifs[0]?.code ?? '') as InterventionMobile['type'], vehiculeId: '', lieu: '', equipe: '', departLe: maintenantLocal() })
const erreur = ref('')
const optTypes = computed<DropdownItem[]>(() => store.typesMissionActifs.map(t => ({ id: t.code, label: t.libelle, sublabel: t.controle ? 'Mission de contrôle' : undefined })))
const optVehicules = computed<DropdownItem[]>(() => vehiculesStore.auParc.map(v => ({ id: v.id, label: v.immatriculation, sublabel: `${v.marque} ${v.modele}` })))

function declencher() {
  const v = vehiculesStore.liste.find(x => x.id === form.value.vehiculeId)
  const res = store.declencherMobile({ type: form.value.type, vehiculeId: v?.id ?? '', vehiculePlaque: v?.immatriculation ?? '', lieu: form.value.lieu, departLe: form.value.departLe,
    equipe: [...new Set(form.value.equipe.split('\n').map(x => x.trim()).filter(Boolean))] })
  if (!res.ok || !res.id) { erreur.value = res.motif ?? ''; return }
  emit('cree', res.id)
}
</script>

<template>
  <CreateModalShell
    title="Déclencher une intervention"
    banner-label="Maintenance · Équipe mobile"
    create-label="Déclencher"
    :save-error="erreur || null"
    @close="emit('close')"
    @create="declencher"
  >
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <FormSection title="Intervention">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Type *</label><SearchableDropdown v-model="form.type" :items="optTypes" placeholder="Sélectionner…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Camion concerné *</label><SearchableDropdown v-model="form.vehiculeId" :items="optVehicules" placeholder="Choisir…" /></div>
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Position du camion *</label><input v-model="form.lieu" :class="F.fieldInput" placeholder="ex. RN7, PK 42 après Ambatolampy" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Départ *</label><input v-model="form.departLe" type="datetime-local" :class="F.fieldInput" /></div>
          </div>
        </FormSection>
        <FormSection title="Équipe envoyée">
          <div :class="F.field"><label :class="F.fieldLabel">Une personne par ligne *</label><textarea v-model="form.equipe" rows="4" :class="F.fieldTextarea" placeholder="Responsable de mission&#10;Mécanicien"></textarea></div>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
