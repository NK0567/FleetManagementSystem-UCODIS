<script setup lang="ts">
/** Demande d'autorisation de départ pour un voyage (FMS-SC-04). */
import { ref, computed } from 'vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useDepartsStore } from '../../stores/departs'
import { useVoyagesStore } from '../../stores/voyages'
import { useAuthStore } from '../../stores/auth'
import * as F from '../../lib/formClasses'

const emit = defineEmits<{ close: []; cree: [id: string] }>()
const store = useDepartsStore()
const voyages = useVoyagesStore()
const auth = useAuthStore()
const voyageId = ref('')
const erreur = ref('')
const optVoyages = computed<DropdownItem[]>(() => voyages.voyages
  .filter(v => ['planifie', 'confirme', 'pret', 'affecte'].includes(v.statut) && v.vehiculeId && v.chauffeurId)
  .filter(v => !store.autorisations.some(a => a.voyageId === v.id && (!a.decideLe || a.accordee)))
  .map(v => ({ id: v.id, label: `${v.reference} · ${v.vehiculePlaque}`, sublabel: `${v.chauffeurNom ?? ''} · ${v.trajetLibelle ?? `${v.origine} → ${v.destination}`}` })))
function demander() {
  if (!voyageId.value) { erreur.value = 'Choisissez le voyage.'; return }
  const r = store.demander(voyageId.value, auth.user?.nom ?? 'Responsable flotte')
  if (!r.ok) { erreur.value = r.motif ?? ''; return }
  emit('cree', r.id!)
}
</script>

<template>
  <CreateModalShell title="Demande d'autorisation de départ" banner-label="Flotte · Départs" create-label="Créer la demande" :save-error="erreur || null" @close="emit('close')" @create="demander">
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <FormSection title="Voyage">
          <div :class="F.field"><label :class="F.fieldLabel">Voyage à faire partir *</label>
            <SearchableDropdown v-model="voyageId" :items="optVoyages" :placeholder="optVoyages.length ? 'Choisir…' : 'Aucun voyage en attente de départ'" /></div>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
