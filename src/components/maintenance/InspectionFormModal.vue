<script setup lang="ts">
import { maintenant } from '../../utils/horloge'
/** Réalisation d'une inspection périodique, ou de sa contre-visite (FMS-MA-10). */
import { ref, computed, watch } from 'vue'
import { TriangleAlert } from '@lucide/vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useInspectionsStore, LIB_VERDICT } from '../../stores/inspections'
import { useVehiculeStore } from '../../stores/vehicules'
import { useAuthStore } from '../../stores/auth'
import type { VerdictPoste } from '../../types'
import * as F from '../../lib/formClasses'

const props = defineProps<{ vehiculeId?: string }>()
const emit = defineEmits<{ close: []; cree: [id: string] }>()
const store = useInspectionsStore()
const vehicules = useVehiculeStore()
const auth = useAuthStore()

const maintenantLocal = () => { const d = maintenant(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const form = ref({
  vehiculeId: props.vehiculeId ?? '', date: maintenantLocal(), inspecteur: auth.user?.nom ?? '', signataire: '', commentaire: '',
  resultats: {} as Record<string, { verdict?: VerdictPoste; observation?: string }>,
})
const erreur = ref('')

const optVehicules = computed<DropdownItem[]>(() => vehicules.liste.filter(v => v.statut !== 'sorti').map(v => ({ id: v.id, label: v.immatriculation, sublabel: `${v.marque} ${v.modele}` })))
/** Une inspection non conforme en attente sur ce véhicule fait de la saisie sa contre-visite. */
const enAttente = computed(() => store.enAttenteContreVisite.find(a => a.vehiculeId === form.value.vehiculeId) ?? null)
const parCategorie = computed(() => {
  const m = new Map<string, typeof store.postesActifs>()
  store.postesActifs.forEach(p => m.set(p.categorie, [...(m.get(p.categorie) ?? []), p]))
  return [...m.entries()]
})
const renseignes = computed(() => store.postesActifs.filter(p => form.value.resultats[p.code]?.verdict).length)
const nonConformes = computed(() => store.postesActifs.filter(p => form.value.resultats[p.code]?.verdict === 'non_conforme').length)

function verdict(code: string, v: VerdictPoste) { form.value.resultats[code] = { ...(form.value.resultats[code] ?? {}), verdict: v } }
function toutConforme() { store.postesActifs.forEach(p => { if (!form.value.resultats[p.code]?.verdict) verdict(p.code, 'conforme') }) }
/* Contre-visite : les postes conformes de l'inspection d'origine sont repris, seuls les autres sont à revoir. */
watch(enAttente, a => {
  form.value.resultats = {}
  a?.resultats.forEach(r => { if (r.verdict === 'conforme' && store.postesActifs.some(p => p.code === r.code)) form.value.resultats[r.code] = { verdict: 'conforme' } })
}, { immediate: true })

function enregistrer() {
  const r = store.realiser({ vehiculeId: form.value.vehiculeId, inspecteur: form.value.inspecteur, date: form.value.date, resultats: form.value.resultats,
    signataire: form.value.signataire, commentaire: form.value.commentaire, contreVisiteDe: enAttente.value?.id })
  if (!r.ok) { erreur.value = r.motif ?? ''; return }
  emit('cree', r.id!)
}
</script>

<template>
  <CreateModalShell :title="enAttente ? 'Contre-visite' : 'Nouvelle inspection périodique'" banner-label="Flotte · Contrôles"
    create-label="Signer le rapport" :save-error="erreur || null" @close="emit('close')" @create="enregistrer">
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <div v-if="enAttente" class="flex items-center gap-2 bg-warning-bg text-warning rounded-lg px-3.5 py-2.5 mb-3 text-xs">
          <TriangleAlert class="w-4 h-4 shrink-0" /> Contre-visite de {{ enAttente.reference }} : {{ store.nbNonConformes(enAttente) }} poste(s) non conforme(s) à revoir.
        </div>
        <FormSection title="Identification">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Véhicule *</label><SearchableDropdown v-model="form.vehiculeId" :items="optVehicules" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Date et heure *</label><input v-model="form.date" type="datetime-local" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Inspecteur *</label><input v-model="form.inspecteur" :class="F.fieldInput" /></div>
          </div>
        </FormSection>

        <FormSection title="Grille d'inspection" :recaps="[`${renseignes} / ${store.postesActifs.length} poste(s)`, nonConformes ? `${nonConformes} non conforme(s)` : '']" :default-open="true">
          <div class="flex justify-end mb-1">
            <button type="button" class="text-[12px] text-primary bg-transparent border-0 cursor-pointer p-0" @click="toutConforme">Marquer les postes restants conformes</button>
          </div>
          <div v-for="[cat, postes] in parCategorie" :key="cat" class="mb-2">
            <div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em] pt-2 pb-1">{{ cat }}</div>
            <div v-for="p in postes" :key="p.code" class="py-2 border-b border-border/60 last:border-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-mono text-muted-foreground w-[70px]">{{ p.code }}</span>
                <span class="text-sm flex-1 min-w-[160px]">{{ p.libelle }}</span>
                <button v-for="(lib, v) in LIB_VERDICT" :key="v" type="button" class="px-2 py-1 rounded-md text-[11px] border-0 cursor-pointer"
                  :class="form.resultats[p.code]?.verdict === v ? lib.cls + ' font-semibold' : 'bg-background text-muted-foreground'" @click="verdict(p.code, v)">{{ lib.label }}</button>
              </div>
              <input v-if="form.resultats[p.code]?.verdict && form.resultats[p.code]?.verdict !== 'conforme'" v-model="form.resultats[p.code]!.observation"
                :class="F.fieldInput" class="mt-1.5 !h-[32px] !text-[12px]" placeholder="Observation *" />
            </div>
          </div>
          <p v-if="nonConformes" class="text-[12px] text-danger mt-2 flex items-center gap-1.5"><TriangleAlert class="w-4 h-4" /> Contre-visite dans {{ store.delaiContreVisiteJours }} jours et ordre de travail ouvert ; le véhicule n'est plus apte à charger.</p>
        </FormSection>

        <FormSection title="Rapport" :default-open="true">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Commentaire</label><textarea v-model="form.commentaire" rows="2" :class="F.fieldTextarea"></textarea></div>
            <div :class="F.field"><label :class="F.fieldLabel">Signé par *</label><input v-model="form.signataire" :class="F.fieldInput" /></div>
          </div>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
