<script setup lang="ts">
import { maintenant } from '../../utils/horloge'
/** Saisie d'une infraction de conduite (FMS-SC-05). */
import { ref, computed, watch } from 'vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useInfractionsStore, LIB_GRAVITE_INFRACTION, type GraviteInfraction } from '../../stores/infractions'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useAuthStore } from '../../stores/auth'
import * as F from '../../lib/formClasses'

const emit = defineEmits<{ close: []; cree: [id: string] }>()
const store = useInfractionsStore()
const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const auth = useAuthStore()
const dateLocale = () => { const d = maintenant(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const form = ref({ type: '', vehiculeId: '', conducteurId: '', date: dateLocale(), lieu: '', detail: '', gravite: 'majeure' as GraviteInfraction, amende: undefined as number | undefined })
const erreur = ref('')
const optTypes = computed<DropdownItem[]>(() => store.types.filter(t => t.actif).map(t => ({ id: t.code, label: t.libelle })))
const optVehicules = computed<DropdownItem[]>(() => vehicules.tracteurs.filter(v => v.statut !== 'sorti').map(v => ({ id: v.id, label: v.immatriculation })))
const optConducteurs = computed<DropdownItem[]>(() => personnel.conducteurs.map(p => ({ id: p.id, label: p.nomComplet })))
const optGravite: DropdownItem[] = Object.entries(LIB_GRAVITE_INFRACTION).map(([id, v]) => ({ id, label: v.label }))
watch(() => form.value.type, c => { const t = store.types.find(x => x.code === c); if (t) form.value.gravite = t.gravite })
watch(() => [form.value.vehiculeId, form.value.date], () => { if (!form.value.conducteurId && form.value.vehiculeId) form.value.conducteurId = vehicules.conducteurAffecteLe(form.value.vehiculeId, form.value.date) ?? '' })
function enregistrer() {
  const f = form.value
  const v = vehicules.parId(f.vehiculeId); const c = personnel.parId(f.conducteurId)
  const r = store.enregistrer({ type: f.type, vehiculeId: v?.id ?? '', vehiculePlaque: v?.immatriculation ?? '', conducteurId: c?.id, conducteurNom: c?.nomComplet,
    date: f.date, lieu: f.lieu, detail: f.detail.trim(), gravite: f.gravite, montantAmendeAr: f.amende, source: 'saisie' }, auth.user?.nom ?? 'Responsable')
  if (!r.ok) { erreur.value = r.motif ?? ''; return }
  emit('cree', r.id!)
}
</script>

<template>
  <CreateModalShell title="Nouvelle infraction" banner-label="Flotte · Infractions" create-label="Enregistrer" :save-error="erreur || null" @close="emit('close')" @create="enregistrer">
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <FormSection title="Infraction">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Type *</label><SearchableDropdown v-model="form.type" :items="optTypes" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Date et heure *</label><input v-model="form.date" type="datetime-local" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Véhicule *</label><SearchableDropdown v-model="form.vehiculeId" :items="optVehicules" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Conducteur</label><SearchableDropdown v-model="form.conducteurId" :items="optConducteurs" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Lieu *</label><input v-model="form.lieu" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Gravité</label><SearchableDropdown v-model="form.gravite" :items="optGravite" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Amende ({{ $devise() }})</label><input v-model.number="form.amende" type="number" min="0" :class="F.fieldInput" /></div>
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Détail</label><textarea v-model="form.detail" rows="2" :class="F.fieldTextarea" placeholder="ex. procès-verbal, vitesse relevée…"></textarea></div>
          </div>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
