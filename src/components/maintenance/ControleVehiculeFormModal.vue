<script setup lang="ts">
/** Saisie d'un nouveau contrôle du véhicule (FMS-MA-09). */
import { ref, computed, watch } from 'vue'
import { TriangleAlert } from '@lucide/vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useControlesVehiculeStore, LIB_MOMENT_CONTROLE, type MomentControle, type ResultatPoint } from '../../stores/controlesVehicule'
import { useVehiculeStore } from '../../stores/vehicules'
import { useAuthStore } from '../../stores/auth'
import * as F from '../../lib/formClasses'

const emit = defineEmits<{ close: []; cree: [id: string] }>()

const store = useControlesVehiculeStore()
const vehiculesStore = useVehiculeStore()
const auth = useAuthStore()

const maintenantLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const form = ref({ moment: 'retour_voyage' as MomentControle, vehiculeId: '', date: maintenantLocal(), kilometrage: undefined as number | undefined, commentaire: '', resultats: {} as Record<string, ResultatPoint> })
const erreur = ref('')

const optVehicules = computed<DropdownItem[]>(() => vehiculesStore.liste.map(v => ({ id: v.id, label: v.immatriculation, sublabel: `${v.marque} ${v.modele}` })))
const optMoments: DropdownItem[] = Object.entries(LIB_MOMENT_CONTROLE).map(([id, label]) => ({ id, label }))
const points = computed(() => store.points[form.value.moment])
const bloquantsSaisis = computed(() => points.value.filter(p => p.bloquant && form.value.resultats[p.code] === 'anomalie'))

watch(() => form.value.moment, () => { form.value.resultats = {} })
// Le kilométrage connu du véhicule pré-remplit la saisie ; il reste modifiable.
watch(() => form.value.vehiculeId, id => { const v = vehiculesStore.liste.find(x => x.id === id); if (v) form.value.kilometrage = v.kilometrage })

function toutConforme() { points.value.forEach(p => { if (!form.value.resultats[p.code]) form.value.resultats[p.code] = 'conforme' }) }

function enregistrer() {
  erreur.value = ''
  const v = vehiculesStore.liste.find(x => x.id === form.value.vehiculeId)
  if (!v || !form.value.date) { erreur.value = 'Indiquez le véhicule et la date du contrôle.'; return }
  if (new Date(form.value.date).getTime() > Date.now() + 60_000) { erreur.value = 'La date du contrôle ne peut pas être dans le futur.'; return }
  if (!points.value.length) { erreur.value = "Aucun point de contrôle n'est défini pour ce moment : renseignez-les dans Paramètres de l'atelier."; return }
  const manquants = points.value.filter(p => !form.value.resultats[p.code])
  if (manquants.length) { erreur.value = `Renseignez tous les points : ${manquants.map(p => p.libelle).join(', ')}.`; return }
  if (form.value.kilometrage != null && form.value.kilometrage < 0) { erreur.value = 'Le kilométrage ne peut pas être négatif.'; return }
  const c = store.enregistrer({ moment: form.value.moment, vehiculeId: v.id, vehiculePlaque: v.immatriculation, date: form.value.date,
    controlePar: auth.user?.nom ?? 'Maintenancier', kilometrage: form.value.kilometrage, resultats: { ...form.value.resultats },
    commentaire: form.value.commentaire.trim() || undefined })
  emit('cree', c.id)
}
</script>

<template>
  <CreateModalShell
    title="Nouveau contrôle"
    banner-label="Maintenance · Contrôles du véhicule"
    create-label="Enregistrer le contrôle"
    :save-error="erreur || null"
    @close="emit('close')"
    @create="enregistrer"
  >
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <FormSection title="Identification">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Moment *</label><SearchableDropdown v-model="form.moment" :items="optMoments" placeholder="Sélectionner…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Véhicule *</label><SearchableDropdown v-model="form.vehiculeId" :items="optVehicules" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Date et heure *</label><input v-model="form.date" type="datetime-local" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Kilométrage</label><input v-model.number="form.kilometrage" type="number" min="0" :class="F.fieldInput" /></div>
          </div>
        </FormSection>

        <FormSection title="Points de contrôle" :recaps="[`${Object.keys(form.resultats).length} / ${points.length} renseigné(s)`]" :default-open="true">
          <div class="flex justify-end mb-1">
            <button type="button" class="text-[12px] text-primary bg-transparent border-0 cursor-pointer p-0" @click="toutConforme">Marquer les points restants conformes</button>
          </div>
          <div v-for="p in points" :key="p.code" class="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
            <span class="text-sm flex-1">{{ p.libelle }} <span v-if="p.bloquant" class="text-[10px] text-danger font-semibold ml-1">BLOQUANT</span></span>
            <button type="button" class="px-2.5 py-1 rounded-md text-[12px] border-0 cursor-pointer" :class="form.resultats[p.code] === 'conforme' ? 'bg-success-bg text-success font-semibold' : 'bg-background text-muted-foreground'" @click="form.resultats[p.code] = 'conforme'">Conforme</button>
            <button type="button" class="px-2.5 py-1 rounded-md text-[12px] border-0 cursor-pointer" :class="form.resultats[p.code] === 'anomalie' ? 'bg-danger-bg text-danger font-semibold' : 'bg-background text-muted-foreground'" @click="form.resultats[p.code] = 'anomalie'">Anomalie</button>
          </div>
          <p v-if="!points.length" class="text-xs text-muted-foreground">Aucun point défini pour ce moment.</p>
          <p v-if="bloquantsSaisis.length" class="text-[12px] text-danger mt-3 flex items-center gap-1.5"><TriangleAlert class="w-4 h-4" /> Anomalie bloquante : un ordre de travail sera ouvert et le véhicule rendu indisponible.</p>
        </FormSection>

        <FormSection title="Commentaire" :default-open="true">
          <textarea v-model="form.commentaire" rows="3" :class="F.fieldTextarea" placeholder="Observation du maintenancier…"></textarea>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
