<script setup lang="ts">
import { maintenant } from '../../utils/horloge'
/** Déclaration d'un accident ou d'un incident (FMS-SC-06). */
import { ref, computed, watch } from 'vue'
import { Paperclip, X } from '@lucide/vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useAssurancesStore, LIB_GRAVITE_SINISTRE } from '../../stores/assurances'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useAuthStore } from '../../stores/auth'
import type { GraviteSinistre, PieceJointe } from '../../types'
import * as F from '../../lib/formClasses'

const emit = defineEmits<{ close: []; cree: [id: string] }>()
const store = useAssurancesStore()
const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const auth = useAuthStore()

const dateLocale = () => { const d = maintenant(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const form = ref({ nature: 'accident' as 'accident' | 'incident', vehiculeId: '', chauffeurId: '', date: dateLocale(), lieu: '', circonstances: '', tiers: '',
  gravite: 'materiel_leger' as GraviteSinistre, montant: undefined as number | undefined, kilometrage: undefined as number | undefined, responsabilite: 'a_determiner' as 'entreprise' | 'tiers' | 'a_determiner' })
const photos = ref<PieceJointe[]>([])
const erreur = ref('')
const optNature: DropdownItem[] = [{ id: 'accident', label: 'Accident' }, { id: 'incident', label: 'Incident' }]
const optVehicules = computed<DropdownItem[]>(() => vehicules.liste.filter(v => v.statut !== 'sorti').map(v => ({ id: v.id, label: v.immatriculation, sublabel: `${v.marque} ${v.modele}` })))
const optChauffeurs = computed<DropdownItem[]>(() => personnel.conducteurs.map(p => ({ id: p.id, label: p.nomComplet })))
const optGravite: DropdownItem[] = Object.entries(LIB_GRAVITE_SINISTRE).map(([id, v]) => ({ id, label: v.label }))
const optResp: DropdownItem[] = [{ id: 'a_determiner', label: 'À déterminer' }, { id: 'entreprise', label: "L'entreprise" }, { id: 'tiers', label: 'Un tiers' }]
watch(() => [form.value.vehiculeId, form.value.date], () => {
  const v = vehicules.parId(form.value.vehiculeId); if (!v) return
  form.value.kilometrage ??= v.kilometrage
  if (!form.value.chauffeurId) form.value.chauffeurId = vehicules.conducteurAffecteLe(v.id, form.value.date) ?? ''
})
function ajouterPhoto(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  if (!f.type.startsWith('image/')) { erreur.value = 'La photo doit être une image.'; return }
  if (f.size > 1_500_000) { erreur.value = 'La photo dépasse 1,5 Mo.'; return }
  const lecteur = new FileReader()
  lecteur.onload = () => { photos.value.push({ nom: f.name, dataUrl: String(lecteur.result) }); erreur.value = '' }
  lecteur.readAsDataURL(f)
}
function declarer() {
  const f = form.value
  const v = vehicules.parId(f.vehiculeId)
  const ch = personnel.parId(f.chauffeurId)
  const r = store.declarer({ nature: f.nature, vehiculeId: v?.id ?? '', vehiculePlaque: v?.immatriculation ?? '', date: f.date, lieu: f.lieu, circonstances: f.circonstances,
    tiersImpliques: f.tiers.trim() || undefined, gravite: f.gravite, chauffeurId: ch?.id, chauffeurNom: ch?.nomComplet, montantDommagesAr: f.montant, kilometrage: f.kilometrage,
    responsabiliteEntreprise: f.responsabilite === 'a_determiner' ? undefined : f.responsabilite === 'entreprise', photos: [...photos.value] }, auth.user?.nom ?? 'Responsable')
  if (!r.ok) { erreur.value = r.motif ?? ''; return }
  emit('cree', r.id!)
}
</script>

<template>
  <CreateModalShell title="Déclarer un accident ou un incident" banner-label="Flotte · Accidents et incidents" create-label="Déclarer" :save-error="erreur || null" @close="emit('close')" @create="declarer">
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <FormSection title="Événement">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Nature *</label><SearchableDropdown v-model="form.nature" :items="optNature" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Date et heure *</label><input v-model="form.date" type="datetime-local" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Véhicule *</label><SearchableDropdown v-model="form.vehiculeId" :items="optVehicules" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Conducteur</label><SearchableDropdown v-model="form.chauffeurId" :items="optChauffeurs" placeholder="Choisir…" /></div>
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Lieu *</label><input v-model="form.lieu" :class="F.fieldInput" placeholder="ex. RN2, PK 84" /></div>
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Description *</label><textarea v-model="form.circonstances" rows="3" :class="F.fieldTextarea"></textarea></div>
            <div :class="F.field"><label :class="F.fieldLabel">Gravité</label><SearchableDropdown v-model="form.gravite" :items="optGravite" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Responsabilité</label><SearchableDropdown v-model="form.responsabilite" :items="optResp" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Dommages estimés ({{ $devise() }})</label><input v-model.number="form.montant" type="number" min="0" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Kilométrage</label><input v-model.number="form.kilometrage" type="number" min="0" :class="F.fieldInput" /></div>
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Tiers impliqués</label><input v-model="form.tiers" :class="F.fieldInput" /></div>
          </div>
        </FormSection>
        <FormSection title="Photos">
          <div class="flex gap-2 flex-wrap mb-2">
            <div v-for="(p, i) in photos" :key="i" class="relative"><img :src="p.dataUrl" :alt="p.nom" class="w-20 h-20 object-cover rounded-md border border-border" />
              <button class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center cursor-pointer" title="Retirer la photo" @click="photos.splice(i, 1)"><X class="w-3 h-3" /></button></div>
          </div>
          <label :class="F.btnOutline" class="w-fit cursor-pointer"><Paperclip class="w-4 h-4" /> Ajouter une photo<input type="file" accept="image/*" capture="environment" class="hidden" @change="ajouterPhoto" /></label>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
