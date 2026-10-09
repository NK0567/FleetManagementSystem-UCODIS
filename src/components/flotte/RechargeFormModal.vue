<script setup lang="ts">
/** Enregistrement d'un plein (FMS-CA-01) : au bureau, depuis le téléphone
 *  avec la photo du reçu, ou à partir d'une transaction de carte carburant. */
import { ref, computed, watch } from 'vue'
import { Paperclip, X } from '@lucide/vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useCarburantStore, LIB_CANAL } from '../../stores/carburant'
import { useCartesCarburantStore } from '../../stores/cartesCarburant'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useVoyagesStore } from '../../stores/voyages'
import { useAuthStore } from '../../stores/auth'
import type { CanalRecharge } from '../../types'
import * as F from '../../lib/formClasses'

const props = defineProps<{ transactionId?: string }>()
const emit = defineEmits<{ close: []; cree: [id: string] }>()

const store = useCarburantStore()
const cartes = useCartesCarburantStore()
const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const voyages = useVoyagesStore()
const auth = useAuthStore()

const maintenantLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const transaction = computed(() => props.transactionId ? cartes.transactionParId(props.transactionId) : undefined)
const carte = computed(() => transaction.value ? cartes.getById(transaction.value.carteId) : undefined)

const form = ref({
  canal: (transaction.value ? 'carte' : 'manuelle') as CanalRecharge,
  vehiculeId: carte.value?.vehiculeId ?? '',
  chauffeurId: carte.value?.chauffeurId ?? '',
  voyageId: '',
  date: transaction.value ? transaction.value.date.slice(0, 16) : maintenantLocal(),
  lieu: transaction.value?.station ?? '',
  litres: transaction.value?.litres as number | undefined,
  prixLitre: transaction.value ? Math.round(transaction.value.montantAr / transaction.value.litres) : undefined as number | undefined,
  odometre: undefined as number | undefined,
  pleinComplet: true,
})
const recu = ref<{ nom: string; dataUrl?: string } | null>(null)
const erreur = ref('')

const optCanal = computed<DropdownItem[]>(() => (['manuelle', 'mobile', 'carte'] as CanalRecharge[]).map(c => ({ id: c, label: LIB_CANAL[c] })))
const optVehicules = computed<DropdownItem[]>(() => vehicules.tracteurs.filter(v => v.statut !== 'vendu').map(v => ({ id: v.id, label: v.immatriculation, sublabel: `${v.marque} ${v.modele}` })))
const optChauffeurs = computed<DropdownItem[]>(() => personnel.liste.filter(p => p.fonctionId === 'f-cond').map(p => ({ id: p.id, label: p.nomComplet })))
const optVoyages = computed<DropdownItem[]>(() => voyages.voyages
  .filter(v => v.vehiculeId === form.value.vehiculeId && v.statut !== 'annule')
  .map(v => ({ id: v.id, label: v.reference, sublabel: v.trajetLibelle ?? `${v.origine} → ${v.destination}` })))

// Le choix du véhicule propose le chauffeur affecté ce jour-là et un
// kilométrage de départ ; le choix du voyage reprend son chauffeur.
watch(() => [form.value.vehiculeId, form.value.date], () => {
  const v = vehicules.parId(form.value.vehiculeId)
  if (!v) return
  if (!form.value.chauffeurId) form.value.chauffeurId = vehicules.conducteurAffecteLe(v.id, form.value.date) ?? ''
  if (form.value.voyageId && !optVoyages.value.some(o => o.id === form.value.voyageId)) form.value.voyageId = ''
}, { immediate: true })
watch(() => form.value.voyageId, id => {
  const voy = voyages.voyages.find(v => v.id === id)
  if (voy?.chauffeurId) form.value.chauffeurId = voy.chauffeurId
})
const dernierKm = computed(() => {
  const r = store.rechargesDuVehicule(form.value.vehiculeId).filter(x => x.date < form.value.date).pop()
  return r?.odometre
})
const montant = computed(() => form.value.litres && form.value.prixLitre ? Math.round(form.value.litres * form.value.prixLitre) : 0)

function chargerRecu(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  if (!/^image\/|^application\/pdf$/.test(f.type)) { erreur.value = 'Le reçu doit être une photo ou un PDF.'; return }
  if (f.size > 1_000_000) { erreur.value = 'Le reçu dépasse 1 Mo : reprenez la photo en qualité réduite.'; return }
  const lecteur = new FileReader()
  lecteur.onload = () => { recu.value = { nom: f.name, dataUrl: String(lecteur.result) }; erreur.value = '' }
  lecteur.onerror = () => { erreur.value = 'Le reçu n’a pas pu être lu.' }
  lecteur.readAsDataURL(f)
}

function enregistrer() {
  const f = form.value
  const v = vehicules.parId(f.vehiculeId)
  if (!v) { erreur.value = 'Choisissez le véhicule.'; return }
  if (!f.lieu.trim()) { erreur.value = 'Indiquez la station.'; return }
  if (!f.litres || !f.prixLitre) { erreur.value = 'Indiquez le volume et le prix au litre.'; return }
  if (f.canal === 'mobile' && !recu.value) { erreur.value = 'Une saisie depuis le téléphone se fait avec la photo du reçu.'; return }
  const ch = personnel.liste.find(p => p.id === f.chauffeurId)
  const voy = voyages.voyages.find(x => x.id === f.voyageId)
  const r = store.creer({
    date: f.date, vehiculeId: v.id, vehiculePlaque: v.immatriculation,
    chauffeurId: ch?.id, chauffeurNom: ch?.nomComplet, voyageId: voy?.id, voyageRef: voy?.reference,
    litres: f.litres, prixLitre: f.prixLitre, montant: montant.value, odometre: f.odometre ?? 0,
    pleinComplet: f.pleinComplet, lieu: f.lieu.trim(), lat: -18.8792, lng: 47.5079, canal: f.canal,
    recu: recu.value ?? undefined, saisiPar: auth.user?.nom, saisiLe: new Date().toISOString(),
  })
  if (!r.ok) { erreur.value = r.motif ?? ''; return }
  if (props.transactionId) cartes.rapprocher(props.transactionId, r.id!)
  emit('cree', r.id!)
}
</script>

<template>
  <CreateModalShell
    title="Nouveau plein"
    banner-label="Flotte · Carburant"
    create-label="Enregistrer le plein"
    :save-error="erreur || null"
    @close="emit('close')"
    @create="enregistrer"
  >
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <FormSection title="Le plein">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Saisie *</label><SearchableDropdown v-model="form.canal" :items="optCanal" placeholder="Sélectionner…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Date et heure *</label><input v-model="form.date" type="datetime-local" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Véhicule *</label><SearchableDropdown v-model="form.vehiculeId" :items="optVehicules" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Chauffeur</label><SearchableDropdown v-model="form.chauffeurId" :items="optChauffeurs" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Voyage</label><SearchableDropdown v-model="form.voyageId" :items="optVoyages" :placeholder="form.vehiculeId ? (optVoyages.length ? 'Choisir…' : 'Aucun voyage pour ce véhicule') : 'Choisir d\'abord le véhicule'" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Station *</label><input v-model="form.lieu" :class="F.fieldInput" placeholder="ex. Station Toamasina" /></div>
          </div>
        </FormSection>
        <FormSection title="Quantités">
          <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Volume (L) *</label><input v-model.number="form.litres" type="number" min="0" step="0.1" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Prix au litre (Ar) *</label><input v-model.number="form.prixLitre" type="number" min="0" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Montant</label><span class="text-sm font-semibold text-foreground py-2">{{ montant ? montant.toLocaleString('fr-FR') + ' Ar' : '-' }}</span></div>
            <div :class="F.field"><label :class="F.fieldLabel">Kilométrage au compteur *</label><input v-model.number="form.odometre" type="number" min="0" :class="F.fieldInput" :placeholder="dernierKm ? `dernier plein : ${dernierKm.toLocaleString('fr-FR')}` : ''" /></div>
            <label class="flex items-center gap-2 text-[13px] text-foreground cursor-pointer col-span-2 max-sm:col-span-1 self-end pb-2"><input v-model="form.pleinComplet" type="checkbox" class="accent-primary" /> Plein complet (réservoir rempli jusqu'au bouchon)</label>
          </div>
        </FormSection>
        <FormSection title="Reçu">
          <div v-if="recu" class="flex items-center gap-3">
            <img v-if="recu.dataUrl?.startsWith('data:image')" :src="recu.dataUrl" alt="Reçu" class="w-20 h-20 object-cover rounded-md border border-border" />
            <span class="text-sm text-foreground flex-1 truncate">{{ recu.nom }}</span>
            <button class="w-8 h-8 flex items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:text-danger hover:bg-danger-bg cursor-pointer" title="Retirer le reçu" @click="recu = null"><X class="w-4 h-4" /></button>
          </div>
          <label v-else class="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
            <Paperclip class="w-4 h-4 text-muted-foreground" />
            <span class="text-xs text-muted-foreground">Photo ou PDF du reçu{{ form.canal === 'mobile' ? ' *' : '' }}</span>
            <input type="file" accept="image/*,application/pdf" capture="environment" class="hidden" @change="chargerRecu" />
          </label>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
