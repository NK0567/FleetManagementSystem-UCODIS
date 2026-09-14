<script setup lang="ts">
import { ref, computed } from 'vue'
import { Wrench } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import { useAssurancesStore, LIB_GRAVITE_SINISTRE, LIB_INDEMNISATION } from '../../stores/assurances'
import { formatDate } from '../../utils/helpers'
import { fmtDateHeure } from '../../utils/voyageUtils'
import type { Sinistre } from '../../types'

const props = defineProps<{ sinistres: Sinistre[]; sinistreId: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useAssurancesStore()
const idCourant = ref(props.sinistreId)
const item = computed<Sinistre | null>(() => store.getById(idCourant.value) ?? props.sinistres.find(s => s.id === idCourant.value) ?? null)

const index = computed(() => props.sinistres.findIndex(s => s.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.sinistres.length - 1)
const sidebarItems = computed(() => props.sinistres.map(s => ({ no: s.reference, label: s.vehiculePlaque })))
function naviguer(delta: number) { const s = props.sinistres[index.value + delta]; if (s) idCourant.value = s.id }
function selectSidebar(no: string) { const s = props.sinistres.find(x => x.reference === no); if (s) idCourant.value = s.id }

const police = computed(() => (item.value?.policeId ? store.getPoliceById(item.value.policeId) : null))
const resteACharge = computed(() => item.value ? (item.value.montantDommagesAr ?? 0) - (item.value.montantIndemniseAr ?? 0) : 0)
</script>

<template>
  <CardModalShell
    v-if="item"
    page-title="Sinistre"
    :page-number="item.reference"
    banner-label="Flotte · Assurances"
    :is-edit-mode="false"
    :sidebar-items="sidebarItems"
    :current-no="item.reference"
    :has-prev="hasPrev"
    :has-next="hasNext"
    hide-action-bar
    @close="emit('close')"
    @go-prev="naviguer(-1)"
    @go-next="naviguer(1)"
    @select-sidebar="selectSidebar"
  >
    <template #title-badges>
      <span class="text-xs font-medium px-2.5 py-0.5 rounded-full" :class="LIB_GRAVITE_SINISTRE[item.gravite].cls">{{ LIB_GRAVITE_SINISTRE[item.gravite].label }}</span>
      <span class="text-xs font-medium px-2.5 py-0.5 rounded-full" :class="item.responsabiliteUcodis ? 'bg-danger-bg text-danger' : 'bg-neutral-bg text-neutral'">
        {{ item.responsabiliteUcodis ? 'Responsabilité UCODIS' : 'Tiers responsable' }}
      </span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">

        <FormSection title="Circonstances" :recaps="[item.vehiculePlaque, fmtDateHeure(item.date)]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Référence</label><span class="text-sm font-mono font-medium text-foreground">{{ item.reference }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Date et heure</label><span class="text-sm text-foreground">{{ fmtDateHeure(item.date) }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Véhicule</label><span class="text-sm font-mono text-foreground">{{ item.vehiculePlaque }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Chauffeur au volant</label><span class="text-sm text-foreground">{{ item.chauffeurNom ?? '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Lieu</label><span class="text-sm text-foreground">{{ item.lieu }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Kilométrage</label><span class="text-sm text-foreground">{{ item.kilometrage?.toLocaleString('fr-FR') ?? '-' }} km</span></div>
          </div>
          <div class="flex flex-col gap-1 mt-4">
            <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Circonstances</label>
            <p class="text-sm text-foreground leading-relaxed">{{ item.circonstances }}</p>
          </div>
          <div v-if="item.tiersImpliques" class="flex flex-col gap-1 mt-4">
            <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Tiers impliqués</label>
            <p class="text-sm text-foreground leading-relaxed">{{ item.tiersImpliques }}</p>
          </div>
        </FormSection>

        <FormSection title="Coût et indemnisation" :recaps="[(item.montantDommagesAr ?? 0).toLocaleString('fr-FR') + ' Ar', LIB_INDEMNISATION[item.statutIndemnisation]]" :default-open="true">
          <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Dommages constatés</label><span class="text-lg font-bold text-foreground">{{ item.montantDommagesAr ? item.montantDommagesAr.toLocaleString('fr-FR') + ' Ar' : '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Indemnisation reçue</label><span class="text-lg font-bold" :class="item.montantIndemniseAr ? 'text-success' : 'text-muted-foreground'">{{ item.montantIndemniseAr ? item.montantIndemniseAr.toLocaleString('fr-FR') + ' Ar' : '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Reste à charge</label><span class="text-lg font-bold" :class="resteACharge > 0 ? 'text-danger' : 'text-success'">{{ resteACharge.toLocaleString('fr-FR') }} Ar</span></div>
          </div>
          <div class="flex flex-col gap-1 mt-4">
            <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Suite donnée</label>
            <span class="text-sm font-medium text-foreground">{{ LIB_INDEMNISATION[item.statutIndemnisation] }}</span>
          </div>
          <div v-if="police" class="grid grid-cols-2 gap-x-6 gap-y-4 mt-4">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Police</label><span class="text-sm font-mono text-foreground">{{ police.numeroPolice }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Compagnie</label><span class="text-sm text-foreground">{{ police.compagnie }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Franchise</label><span class="text-sm text-foreground">{{ police.franchiseAr ? police.franchiseAr.toLocaleString('fr-FR') + ' Ar' : '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Échéance de la police</label><span class="text-sm text-foreground">{{ formatDate(police.dateEcheance) }}</span></div>
          </div>
          <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Le suivi de l'indemnisation est distinct du coût de réparation : un sinistre peut être réparé sans être
            encore indemnisé, ou indemnisé partiellement.
          </p>
        </FormSection>

        <FormSection title="Conséquences" :recaps="[item.ordreTravailRef ? 'réparation ouverte' : 'aucune réparation']">
          <div v-if="item.ordreTravailRef" class="flex items-start gap-2.5 bg-info-bg text-info rounded-lg px-3.5 py-2.5 mb-3">
            <Wrench class="w-4 h-4 shrink-0 mt-px" />
            <p class="text-xs leading-relaxed">
              Un ordre de travail a été ouvert : <strong class="font-mono">{{ item.ordreTravailRef }}</strong>.
              Le véhicule est passé en indisponibilité avec le code <strong class="font-mono">ACC</strong>.
            </p>
          </div>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
