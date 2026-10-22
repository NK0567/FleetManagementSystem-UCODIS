<script setup lang="ts">
/** Ajout d'un document à un véhicule ou à une personne (FMS-SC-01), avec son scan. */
import { ref, computed, watch } from 'vue'
import { Paperclip, X } from '@lucide/vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useTypesDocumentsStore } from '../../stores/typesDocuments'
import { useDocumentsVehiculeStore } from '../../stores/documentsVehicule'
import { useDocumentsStore } from '../../stores/documentsPersonnel'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { aujourdhuiISO } from '../../utils/horloge'
import type { PieceJointe } from '../../types'
import * as F from '../../lib/formClasses'

const props = defineProps<{ source?: 'vehicule' | 'personne'; entityId?: string; typeCode?: string }>()
const emit = defineEmits<{ close: []; cree: [cle: string] }>()
const types = useTypesDocumentsStore()
const docsV = useDocumentsVehiculeStore()
const docsP = useDocumentsStore()
const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()

const form = ref({
  source: props.source ?? 'vehicule' as 'vehicule' | 'personne',
  entityId: props.entityId ?? '', type: props.typeCode ?? '', nom: '', numero: '',
  dateEmission: aujourdhuiISO(), dateFin: '', delai: undefined as number | undefined,
})
const scan = ref<PieceJointe | null>(null)
const erreur = ref('')

const optSource: DropdownItem[] = [{ id: 'vehicule', label: 'Véhicule' }, { id: 'personne', label: 'Personne' }]
const optEntites = computed<DropdownItem[]>(() => form.value.source === 'vehicule'
  ? vehicules.liste.filter(v => v.statut !== 'sorti').map(v => ({ id: v.id, label: v.immatriculation, sublabel: `${v.marque} ${v.modele}` }))
  : personnel.actifs.map(p => ({ id: p.id, label: p.nomComplet, sublabel: `${p.matricule} · ${p.fonctionLibelle}` })))
const sousCible = computed(() => form.value.source === 'vehicule'
  ? vehicules.parId(form.value.entityId)?.type ?? ''
  : personnel.parId(form.value.entityId)?.conduit ? 'roulant' : 'sedentaire')
const optTypes = computed<DropdownItem[]>(() => (form.value.entityId ? types.applicables(form.value.source, sousCible.value) : types.deCible(form.value.source))
  .map(t => ({ id: t.code, label: t.libelle, sublabel: `${t.obligatoire ? 'Obligatoire' : 'Facultatif'} · ${t.validite === 'illimitee' ? 'validité illimitée' : 'validité limitée'}` })))
const def = computed(() => types.get(form.value.type))

watch(() => form.value.source, () => { if (!props.entityId) form.value.entityId = ''; form.value.type = '' })
watch(() => [form.value.type, form.value.dateEmission], () => {
  const d = def.value
  if (!d) return
  form.value.delai = d.delaiNotificationJours
  if (d.validite === 'limitee' && d.dureeMois && form.value.dateEmission) {
    const fin = new Date(form.value.dateEmission); fin.setMonth(fin.getMonth() + d.dureeMois)
    form.value.dateFin = fin.toISOString().slice(0, 10)
  } else if (d.validite === 'illimitee') form.value.dateFin = ''
}, { immediate: true })

function chargerScan(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  if (!/^image\/|^application\/pdf$/.test(f.type)) { erreur.value = 'Le scan doit être une image ou un PDF.'; return }
  if (f.size > 1_500_000) { erreur.value = 'Le scan dépasse 1,5 Mo : réduisez sa taille.'; return }
  const lecteur = new FileReader()
  lecteur.onload = () => { scan.value = { nom: f.name, dataUrl: String(lecteur.result) }; erreur.value = '' }
  lecteur.readAsDataURL(f)
}

function enregistrer() {
  const f = form.value
  if (!f.entityId) { erreur.value = form.value.source === 'vehicule' ? 'Choisissez le véhicule.' : 'Choisissez la personne.'; return }
  if (!def.value) { erreur.value = 'Choisissez le type de document.'; return }
  if (f.source === 'vehicule') {
    const r = docsV.creer({ vehiculeId: f.entityId, type: f.type, nom: f.nom.trim() || undefined, numero: f.numero.trim() || undefined,
      dateEmission: f.dateEmission || undefined, echeance: def.value.validite === 'limitee' ? f.dateFin || undefined : undefined,
      delaiNotificationJours: f.delai, scan: scan.value ?? undefined })
    if (!r.ok) { erreur.value = r.motif ?? ''; return }
    emit('cree', `veh:${r.id}`)
  } else {
    const r = docsP.creerVerifie({ personnelId: f.entityId, type: f.type, libelle: f.nom.trim() || def.value.libelle, reference: f.numero.trim() || undefined,
      dateDelivrance: f.dateEmission, dateExpiration: def.value.validite === 'limitee' ? f.dateFin || undefined : undefined,
      delaiNotificationJours: f.delai, scan: scan.value ?? undefined, fichier: scan.value?.nom })
    if (!r.ok) { erreur.value = r.motif ?? ''; return }
    emit('cree', `per:${r.id}`)
  }
}
</script>

<template>
  <CreateModalShell title="Nouveau document" banner-label="Flotte · Documents" create-label="Enregistrer le document" :save-error="erreur || null" @close="emit('close')" @create="enregistrer">
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <FormSection title="Document">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Document de *</label><SearchableDropdown v-model="form.source" :items="optSource" placeholder="Sélectionner…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">{{ form.source === 'vehicule' ? 'Véhicule' : 'Personne' }} *</label><SearchableDropdown v-model="form.entityId" :items="optEntites" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Type de document *</label><SearchableDropdown v-model="form.type" :items="optTypes" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Nom</label><input v-model="form.nom" :class="F.fieldInput" :placeholder="def?.libelle ?? ''" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Numéro</label><input v-model="form.numero" :class="F.fieldInput" /></div>
          </div>
        </FormSection>
        <FormSection title="Validité">
          <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Date d'émission</label><input v-model="form.dateEmission" type="date" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Validité</label><span class="text-sm text-foreground py-2">{{ def ? (def.validite === 'illimitee' ? 'Illimitée' : 'Limitée') : '-' }}</span></div>
            <div v-if="def?.validite === 'limitee'" :class="F.field"><label :class="F.fieldLabel">Fin de validité *</label><input v-model="form.dateFin" type="date" :class="F.fieldInput" /></div>
            <div v-if="def?.validite === 'limitee'" :class="F.field"><label :class="F.fieldLabel">Notification avant expiration (jours)</label><input v-model.number="form.delai" type="number" min="0" :class="F.fieldInput" /></div>
          </div>
        </FormSection>
        <FormSection title="Scan du document">
          <div v-if="scan" class="flex items-center gap-3">
            <img v-if="scan.dataUrl?.startsWith('data:image')" :src="scan.dataUrl" alt="Scan" class="w-20 h-20 object-cover rounded-md border border-border" />
            <span class="text-sm text-foreground flex-1 truncate">{{ scan.nom }}</span>
            <button class="w-8 h-8 flex items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:text-danger hover:bg-danger-bg cursor-pointer" title="Retirer le scan" @click="scan = null"><X class="w-4 h-4" /></button>
          </div>
          <label v-else class="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
            <Paperclip class="w-4 h-4 text-muted-foreground" /><span class="text-xs text-muted-foreground">Image ou PDF du document</span>
            <input type="file" accept="image/*,application/pdf" class="hidden" @change="chargerScan" />
          </label>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
