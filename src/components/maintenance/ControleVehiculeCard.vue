<script setup lang="ts">
/** Fiche d'un contrôle du véhicule (FMS-MA-09). */
import { ref, computed } from 'vue'
import { TriangleAlert, Wrench } from '@lucide/vue'
import { useRouter } from 'vue-router'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import ChampLecture from './ChampLecture.vue'
import { useControlesVehiculeStore, LIB_MOMENT_CONTROLE, type ControleVehicule } from '../../stores/controlesVehicule'
import { useMaintenanceStore } from '../../stores/maintenance'
import { LIB_STATUT_OT } from '../../types/maintenance'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as F from '../../lib/formClasses'

const props = defineProps<{ controles: ControleVehicule[]; controleId: string }>()
const emit = defineEmits<{ close: []; creer: [] }>()

const store = useControlesVehiculeStore()
const maintenance = useMaintenanceStore()
const router = useRouter()

const idCourant = ref(props.controleId)
const item = computed(() => props.controles.find(c => c.id === idCourant.value) ?? store.controles.find(c => c.id === idCourant.value) ?? null)
const index = computed(() => props.controles.findIndex(c => c.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.controles.length - 1)
const sidebarItems = computed(() => props.controles.map(c => ({ no: c.id, label: c.vehiculePlaque })))
function naviguer(delta: number) { const c = props.controles[index.value + delta]; if (c) idCourant.value = c.id }

function libelle(code: string) {
  const c = item.value
  if (!c) return code
  return c.libelles?.[code] ?? store.points[c.moment]?.find(p => p.code === code)?.libelle ?? code
}
function bloquant(code: string) { return !!item.value && store.points[item.value.moment]?.some(p => p.code === code && p.bloquant) }
const anomalies = computed(() => item.value ? Object.entries(item.value.resultats).filter(([, r]) => r === 'anomalie').map(([c]) => c) : [])
const bloquants = computed(() => item.value ? store.anomaliesBloquantes(item.value) : [])
const ot = computed(() => item.value?.ordreTravailId ? maintenance.getById(item.value.ordreTravailId) : null)

function voirOT() { if (ot.value) router.push({ name: 'maintenance-ordres', query: { ot: ot.value.id } }) }
</script>

<template>
  <CardModalShell
    v-if="item"
    :page-title="`Contrôle · ${item.vehiculePlaque}`"
    :page-number="item.id"
    banner-label="Maintenance · Contrôles du véhicule"
    :is-edit-mode="false"
    :sidebar-items="sidebarItems"
    :current-no="item.id"
    :has-prev="hasPrev"
    :has-next="hasNext"
    hide-action-bar
    @close="emit('close')"
    @create="emit('creer')"
    @go-prev="naviguer(-1)"
    @go-next="naviguer(1)"
    @select-sidebar="no => idCourant = no"
  >
    <template #title-badges>
      <span class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-neutral-bg text-neutral">{{ LIB_MOMENT_CONTROLE[item.moment] }}</span>
      <span v-if="!anomalies.length" class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-success-bg text-success">Conforme</span>
      <span v-else-if="bloquants.length" class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-danger-bg text-danger">Anomalie bloquante</span>
      <span v-else class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-warning-bg text-warning">{{ anomalies.length }} anomalie(s)</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <FormSection title="Identification" :recaps="[item.vehiculePlaque, fmtDateHeure(item.date)]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Véhicule" mono>{{ item.vehiculePlaque }}</ChampLecture>
            <ChampLecture libelle="Moment">{{ LIB_MOMENT_CONTROLE[item.moment] }}</ChampLecture>
            <ChampLecture libelle="Date et heure">{{ fmtDateHeure(item.date) }}</ChampLecture>
            <ChampLecture libelle="Contrôlé par">{{ item.controlePar }}</ChampLecture>
            <ChampLecture libelle="Kilométrage">{{ item.kilometrage != null ? item.kilometrage.toLocaleString('fr-FR') + ' km' : '-' }}</ChampLecture>
            <ChampLecture v-if="item.commentaire" libelle="Commentaire" large>{{ item.commentaire }}</ChampLecture>
          </div>
        </FormSection>

        <FormSection title="Points contrôlés" :recaps="[`${Object.keys(item.resultats).length} point(s)`, anomalies.length ? `${anomalies.length} anomalie(s)` : 'tout conforme']" :default-open="true">
          <table class="w-full text-sm">
            <tbody>
              <tr v-for="(r, code) in item.resultats" :key="code" class="border-b border-border/60 last:border-0">
                <td class="py-2 pr-3 font-mono text-xs text-muted-foreground w-[70px]">{{ code }}</td>
                <td class="py-2 pr-3">{{ libelle(String(code)) }} <span v-if="bloquant(String(code))" class="text-[10px] text-danger font-semibold ml-1">BLOQUANT</span></td>
                <td class="py-2 text-right"><span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="r === 'conforme' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ r === 'conforme' ? 'Conforme' : 'Anomalie' }}</span></td>
              </tr>
            </tbody>
          </table>
        </FormSection>

        <FormSection title="Suite donnée" :recaps="[ot ? ot.reference : 'aucun ordre de travail']" :default-open="!!ot || bloquants.length > 0">
          <template v-if="ot">
            <div class="flex items-start gap-2.5 bg-info-bg text-info rounded-lg px-3.5 py-2.5 mb-3">
              <Wrench class="w-4 h-4 shrink-0 mt-px" />
              <p class="text-xs leading-relaxed">
                Ordre de travail <strong class="font-mono">{{ ot.reference }}</strong> ouvert sur anomalie bloquante,
                statut : {{ LIB_STATUT_OT[ot.statut] }}. Le véhicule reste indisponible jusqu'à sa clôture.
              </p>
            </div>
            <button :class="F.btnOutline" @click="voirOT">Voir l'ordre de travail</button>
          </template>
          <div v-else-if="anomalies.length" class="flex items-start gap-2.5 bg-warning-bg text-warning rounded-lg px-3.5 py-2.5">
            <TriangleAlert class="w-4 h-4 shrink-0 mt-px" />
            <p class="text-xs leading-relaxed">Anomalie non bloquante : aucun ordre de travail ouvert automatiquement.</p>
          </div>
          <p v-else class="text-xs text-muted-foreground">Contrôle conforme, aucune suite.</p>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
