<script setup lang="ts">
/**
 * Fiche conducteur légère, reprise de la fiche conducteur du socle FMS : identité,
 * score de conduite en jauge circulaire, exploitation, aptitude
 * médicale. Le bouton « Voir la page complète » ouvre le tableau de
 * bord détaillé (ConducteurDashboardView), sur le même principe que
 * le socle FMS distingue une fiche rapide d'une page dédiée.
 */
import { ref, computed } from 'vue'
import { ExternalLink } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import { usePersonnelStore } from '../../stores/personnel'
import { useDocumentsStore } from '../../stores/documentsPersonnel'
import { useEcartsStore } from '../../stores/ecarts'
import { useCarburantStore } from '../../stores/carburant'
import { useVehiculeStore } from '../../stores/vehicules'
import { useScoresConducteursStore } from '../../stores/scoresConducteurs'
import { formatDate, etatEcheance } from '../../utils/helpers'
import * as cls from '../../lib/formClasses'
import type { Personnel } from '../../types'

const props = defineProps<{ conducteurs: Personnel[]; conducteurId: string }>()
const emit = defineEmits<{ close: []; voirPageComplete: [id: string] }>()

const personnel = usePersonnelStore()
const docsPersonnel = useDocumentsStore()
const ecartsStore = useEcartsStore()
const carburantStore = useCarburantStore()
const vehicules = useVehiculeStore()
const scoresStore = useScoresConducteursStore()

const idCourant = ref(props.conducteurId)
const item = computed<Personnel | null>(() => personnel.parId(idCourant.value) ?? null)

const index = computed(() => props.conducteurs.findIndex(c => c.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.conducteurs.length - 1)
const sidebarItems = computed(() => props.conducteurs.map(c => ({ no: c.matricule, label: c.nomComplet })))
function naviguer(delta: number) { const c = props.conducteurs[index.value + delta]; if (c) idCourant.value = c.id }
function selectSidebar(no: string) { const c = props.conducteurs.find(x => x.matricule === no); if (c) idCourant.value = c.id }

function permisDoc(id: string) { return docsPersonnel.parPersonnel(id).find(d => d.type === 'permis') }
function visiteDoc(id: string) { return docsPersonnel.parPersonnel(id).find(d => d.type === 'visite_medicale') }
function classeEcheance(date?: string) {
  const e = etatEcheance(date)
  return e === 'expire' ? 'text-danger' : e === 'proche' ? 'text-warning' : 'text-success'
}

const score = computed(() => (item.value ? scoresStore.scoreGlobal(item.value.id) : 100))
const appreciationScore = computed(() => (score.value >= 80 ? 'Bon conducteur' : score.value >= 60 ? 'À surveiller' : 'Alerte'))
const couleurScore = computed(() => (score.value >= 80 ? '#16a34a' : score.value >= 60 ? '#ca8a04' : '#dc2626'))
const nbEcarts = computed(() => (item.value ? ecartsStore.ecartsDuChauffeur(item.value.id).length : 0))

const consoMoyenne = computed(() => {
  if (!item.value) return 0
  const p = carburantStore.periodesConso.filter(pc => carburantStore.recharges.some(r => r.vehiculeId === pc.vehiculeId && r.chauffeurId === item.value!.id))
  if (!p.length) return 0
  return Math.round((p.reduce((s, x) => s + x.litresPour100km, 0) / p.length) * 10) / 10
})
const tracteurAffecte = computed(() => {
  if (!item.value) return null
  const af = vehicules.affectations.find(a => a.conducteurId === item.value!.id && !a.dateFin)
  return af ? vehicules.parId(af.vehiculeId) : null
})
</script>

<template>
  <CardModalShell
    v-if="item"
    page-title="Fiche conducteur"
    :page-number="item.matricule"
    banner-label="Flotte · Conducteurs"
    :is-edit-mode="false"
    :sidebar-items="sidebarItems"
    :current-no="item.matricule"
    :has-prev="hasPrev"
    :has-next="hasNext"
    hide-action-bar
    @close="emit('close')"
    @go-prev="naviguer(-1)"
    @go-next="naviguer(1)"
    @select-sidebar="selectSidebar"
  >
    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">

        <FormSection title="Identité" :recaps="[item.matricule]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Nom</label><span class="text-sm text-foreground">{{ item.nom }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Prénom</label><span class="text-sm text-foreground">{{ item.prenom }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Matricule</label><span class="text-sm font-mono text-foreground">{{ item.matricule }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Téléphone</label><span class="text-sm text-foreground">{{ item.telephone }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Entité</label><span class="text-sm text-foreground">{{ item.entiteNom }}</span></div>
          </div>
        </FormSection>

        <FormSection title="Score de conduite" :recaps="[`${score}/100`, appreciationScore]">
          <div class="flex items-center gap-4">
            <svg width="70" height="70" viewBox="0 0 70 70">
              <circle cx="35" cy="35" r="30" fill="none" stroke="var(--color-background,#eee)" stroke-width="8" />
              <circle cx="35" cy="35" r="30" fill="none" :stroke="couleurScore" stroke-width="8"
                      :stroke-dasharray="`${(score / 100) * 188.5} 188.5`" stroke-linecap="round" transform="rotate(-90 35 35)" />
              <text x="35" y="40" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor">{{ score }}</text>
            </svg>
            <div>
              <p class="text-sm font-semibold" :style="{ color: couleurScore }">{{ appreciationScore }}</p>
              <p class="text-xs text-muted-foreground">{{ nbEcarts }} écart(s) enregistré(s)</p>
            </div>
          </div>
        </FormSection>

        <FormSection title="Exploitation" :recaps="[tracteurAffecte?.immatriculation]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Tracteur affecté</label><span class="text-sm font-mono text-foreground">{{ tracteurAffecte?.immatriculation ?? 'Aucun' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Conso moyenne</label><span class="text-sm text-foreground">{{ consoMoyenne || '-' }} L/100 km</span></div>
          </div>
        </FormSection>

        <FormSection title="Aptitude médicale" :recaps="[visiteDoc(item.id)?.dateExpiration ? formatDate(visiteDoc(item.id)!.dateExpiration) : null]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Permis</label><span class="text-sm font-mono" :class="classeEcheance(permisDoc(item.id)?.dateExpiration)">{{ permisDoc(item.id)?.dateExpiration ? formatDate(permisDoc(item.id)!.dateExpiration) : '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Visite médicale</label><span class="text-sm font-mono" :class="classeEcheance(visiteDoc(item.id)?.dateExpiration)">{{ visiteDoc(item.id)?.dateExpiration ? formatDate(visiteDoc(item.id)!.dateExpiration) : '-' }}</span></div>
          </div>
        </FormSection>

        <button :class="cls.btnOutline" class="w-full justify-center" @click="emit('voirPageComplete', item.id)">
          <ExternalLink class="w-4 h-4" /> Voir la page complète
        </button>
      </div>
    </template>
  </CardModalShell>
</template>
