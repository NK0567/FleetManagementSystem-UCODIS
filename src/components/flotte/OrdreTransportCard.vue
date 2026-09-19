<script setup lang="ts">
/**
 * Fiche d'un ordre de transport, ouverte par le module Planification.
 * S'ouvre directement en édition à la sortie de la création rapide, le
 * temps de définir le trajet ; redevient une fiche de lecture une fois
 * l'ordre planifié et le trajet figé. Une fois « En cours », la
 * séquence de sites devient un simple suivi de la progression validée
 * par le chauffeur depuis son espace - plus aucune modification n'est
 * possible ici, à dessein : cette fiche pilote la préparation de
 * l'ordre, pas son exécution sur route.
 */
import { ref, computed, watch } from 'vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import SelecteurTrajet from './SelecteurTrajet.vue'
import { CalendarClock, CheckCircle2, Circle, MapPin } from '@lucide/vue'
import * as cls from '../../lib/formClasses'
import { useVoyagesStore } from '../../stores/voyages'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { fmtDateHeure } from '../../utils/voyageUtils'
import type { StatutVoyage, EtapeVoyage } from '../../types'

const props = defineProps<{ voyageId: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useVoyagesStore()
const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()

const idCourant = ref(props.voyageId)
watch(() => props.voyageId, v => { idCourant.value = v; enEdition.value = false })

const courant = computed(() => store.getById(idCourant.value) ?? null)

const STATUTS: Record<StatutVoyage, { label: string; cls: string }> = {
  en_attente: { label: 'En attente', cls: 'bg-warning-bg text-warning' },
  planifie: { label: 'Planifié', cls: 'bg-info-bg text-info' },
  affecte: { label: 'Affecté', cls: 'bg-primary/10 text-primary' },
  en_cours: { label: 'En cours', cls: 'bg-primary/10 text-primary' },
  livre: { label: 'Terminé', cls: 'bg-success-bg text-success' },
  cloture: { label: 'Clôturé', cls: 'bg-neutral-bg text-neutral' },
  litige: { label: 'En litige', cls: 'bg-danger-bg text-danger' },
  annule: { label: 'Annulé', cls: 'bg-danger-bg text-danger' },
}

/** Le trajet ne se modifie qu'avant la confirmation du chauffeur. */
const modifiable = computed(() => courant.value?.statut === 'en_attente' || courant.value?.statut === 'planifie')

const pageTitle = computed(() => courant.value ? `${courant.value.numeroOT || courant.value.reference} · ${courant.value.clientNom}` : '')

/* ── Édition de la section Générale ──────────────────────────────── */
const enEdition = ref(true)
const form = ref({
  vehiculeId: '', clientNom: '', datePlanifiee: '', numeroOT: '', typeProduit: '', poidsChargeKg: 0,
})
watch(courant, v => {
  if (!v) return
  form.value = {
    vehiculeId: v.vehiculeId ?? '', clientNom: v.clientNom, datePlanifiee: v.datePlanifiee,
    numeroOT: v.numeroOT ?? '', typeProduit: v.marchandise.typeProduit, poidsChargeKg: v.marchandise.poidsChargeKg,
  }
}, { immediate: true })

const chauffeur = computed(() => {
  if (!form.value.vehiculeId) return null
  const af = vehicules.affectationActive(form.value.vehiculeId)
  return af ? personnel.parId(af.conducteurId)?.nomComplet ?? null : null
})
const semiRemorque = computed(() => {
  if (!form.value.vehiculeId) return null
  const at = vehicules.attelageActif(form.value.vehiculeId)
  return at ? vehicules.parId(at.semiRemorqueId)?.immatriculation ?? null : null
})
const optVehicules = computed<DropdownItem[]>(() =>
  vehicules.tracteurs.map(t => ({ id: t.id, label: t.immatriculation, sublabel: `${t.marque} ${t.modele}` })))
const optProduits: DropdownItem[] = [
  { id: 'Produits alimentaires secs', label: 'Produits alimentaires secs' },
  { id: 'Produits ménagers', label: 'Produits ménagers' },
  { id: 'Boissons', label: 'Boissons' },
  { id: 'Textile', label: 'Textile' },
  { id: 'Matériaux de construction', label: 'Matériaux de construction' },
]

function enterEdit() { enEdition.value = true }
function cancelEdit() { enEdition.value = false }
function save() {
  if (!courant.value) return
  const v = courant.value
  const vehicule = vehicules.parId(form.value.vehiculeId)
  const af = vehicules.affectationActive(form.value.vehiculeId)
  const at = vehicules.attelageActif(form.value.vehiculeId)
  v.vehiculeId = form.value.vehiculeId
  v.vehiculePlaque = vehicule?.immatriculation
  v.chauffeurId = af?.conducteurId
  v.chauffeurNom = chauffeur.value ?? undefined
  v.semiRemorqueId = at?.semiRemorqueId
  v.semiRemorquePlaque = semiRemorque.value ?? undefined
  v.clientNom = form.value.clientNom
  v.datePlanifiee = form.value.datePlanifiee
  v.numeroOT = form.value.numeroOT || undefined
  v.marchandise.typeProduit = form.value.typeProduit
  v.marchandise.poidsChargeKg = form.value.poidsChargeKg
  enEdition.value = false
}

/* ── Trajet ───────────────────────────────────────────────────────── */
const etapesLocales = ref<EtapeVoyage[]>([])
const trajetIdLocal = ref<string | undefined>(undefined)
watch(courant, v => { etapesLocales.value = v?.etapes ? [...v.etapes] : []; trajetIdLocal.value = v?.trajetId }, { immediate: true })

function enregistrerTrajet() {
  if (!courant.value) return
  store.definirTrajet(courant.value.id, trajetIdLocal.value, etapesLocales.value)
}

/* ── Action : planifier ──────────────────────────────────────────── */
function planifier() {
  if (!courant.value) return
  enregistrerTrajet()
  const res = store.planifier(courant.value.id)
  if (!res.ok) alert(res.motif)
}
</script>

<template>
  <CardModalShell
    v-if="courant"
    :page-title="pageTitle"
    :page-number="courant.numeroOT || courant.reference"
    banner-label="Ordre de transport"
    :is-edit-mode="enEdition"
    :sidebar-items="[]"
    :current-no="null"
    :has-prev="false"
    :has-next="false"
    :show-title-new-button="false"
    hide-action-bar
    :has-unsaved-changes="enEdition"
    @close="emit('close')"
    @enter-edit="enterEdit"
    @cancel-edit="cancelEdit"
    @save="save"
  >
    <template #title-badges>
      <span class="text-[11px] font-medium px-2.5 py-[3px] rounded-full" :class="STATUTS[courant.statut].cls">{{ STATUTS[courant.statut].label }}</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-4xl mx-auto">

        <div v-if="courant.statut === 'en_attente'" class="flex items-center justify-end mb-3.5">
          <button :class="cls.btnPrimary" :disabled="!etapesLocales.length" @click="planifier">
            <CalendarClock class="w-4 h-4" /> Plan
          </button>
        </div>
        <p v-if="courant.statut === 'en_attente' && !etapesLocales.length" class="text-[11px] text-warning text-right -mt-2.5 mb-3.5">
          Définissez le trajet ci-dessous avant de planifier cet ordre.
        </p>

        <!-- GÉNÉRAL -->
        <FormSection title="Général" :recaps="[courant.vehiculePlaque, courant.chauffeurNom]">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Véhicule</label>
              <SearchableDropdown v-if="enEdition && modifiable" v-model="form.vehiculeId" :items="optVehicules" placeholder="Choisir…" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground font-mono">{{ courant.vehiculePlaque ?? '-' }}</div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Chauffeur - déduit de l'affectation</label>
              <div class="h-[38px] px-2.5 rounded-md border flex items-center text-[13px]"
                   :class="(enEdition && modifiable ? chauffeur : courant.chauffeurNom) ? 'bg-primary/5 border-primary/20 text-primary font-medium' : 'bg-background border-border text-muted-foreground'">
                {{ (enEdition && modifiable ? chauffeur : courant.chauffeurNom) ?? 'Aucune affectation sur ce véhicule' }}
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Client</label>
              <input v-if="enEdition && modifiable" v-model="form.clientNom" :class="cls.fieldInput" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground">{{ courant.clientNom }}</div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Date prévue</label>
              <input v-if="enEdition && modifiable" v-model="form.datePlanifiee" type="datetime-local" :class="cls.fieldInput" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground">{{ fmtDateHeure(courant.datePlanifiee) }}</div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">N° ordre de transport</label>
              <input v-if="enEdition && modifiable" v-model="form.numeroOT" :class="cls.fieldInput" placeholder="OT-2026-…" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground font-mono">{{ courant.numeroOT ?? '-' }}</div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Marchandise</label>
              <SearchableDropdown v-if="enEdition && modifiable" v-model="form.typeProduit" :items="optProduits" placeholder="Sélectionner…" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground">{{ courant.marchandise.typeProduit }}</div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Semi-remorque attelée - déduite de l'attelage</label>
              <div class="h-[38px] px-2.5 rounded-md bg-background border border-border flex items-center text-[13px] text-muted-foreground">
                {{ (enEdition && modifiable ? semiRemorque : courant.semiRemorquePlaque) ?? 'Aucun attelage en cours' }}
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Poids chargé (kg)</label>
              <input v-if="enEdition && modifiable" v-model.number="form.poidsChargeKg" type="number" min="0" :class="cls.fieldInput" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground">{{ courant.marchandise.poidsChargeKg }} kg</div>
            </div>
          </div>
        </FormSection>

        <!-- TRAJET -->
        <FormSection title="Trajet" :recaps="[`${courant.etapes.length} site(s)`, courant.trajetLibelle]">
          <template v-if="modifiable">
            <SelecteurTrajet v-model="etapesLocales" @trajet-ref="id => (trajetIdLocal = id)" />
            <button :class="cls.btnOutline" class="mt-3" @click="enregistrerTrajet">Enregistrer le trajet</button>
          </template>
          <template v-else>
            <div v-if="!courant.etapes.length" class="text-xs text-muted-foreground py-2">Aucun site défini.</div>
            <div v-else class="flex flex-col gap-1.5">
              <div v-for="(e, i) in [...courant.etapes].sort((a, b) => a.ordre - b.ordre)" :key="e.id"
                   class="flex items-center gap-2.5 rounded-md px-3 py-2" :class="e.franchi ? 'bg-success-bg' : 'bg-background'">
                <component :is="e.franchi ? CheckCircle2 : Circle" class="w-4 h-4 shrink-0" :class="e.franchi ? 'text-success' : 'text-muted-foreground'" />
                <span class="text-[11px] font-semibold text-muted-foreground w-5">{{ i + 1 }}</span>
                <MapPin class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span class="text-xs text-foreground flex-1">{{ e.siteNom }}</span>
                <span v-if="e.franchi" class="text-[11px] text-success">Validé</span>
              </div>
            </div>
          </template>
        </FormSection>

      </div>
    </template>
  </CardModalShell>
</template>
