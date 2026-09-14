<script setup lang="ts">
import { ref, computed } from 'vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import { useControlesStore, POINTS_CHECKLIST_ROUTE } from '../../stores/controles'
import { fmtDateHeure } from '../../utils/voyageUtils'
import type { ChecklistRoute } from '../../types'

const props = defineProps<{ checklists: ChecklistRoute[]; checklistId: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useControlesStore()
const idCourant = ref(props.checklistId)
const item = computed<ChecklistRoute | null>(() => store.getById(idCourant.value) ?? props.checklists.find(c => c.id === idCourant.value) ?? null)

const index = computed(() => props.checklists.findIndex(c => c.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.checklists.length - 1)
const sidebarItems = computed(() => props.checklists.map(c => ({ no: c.reference, label: c.tracteurPlaque })))
function naviguer(delta: number) { const c = props.checklists[index.value + delta]; if (c) idCourant.value = c.id }
function selectSidebar(no: string) { const c = props.checklists.find(x => x.reference === no); if (c) idCourant.value = c.id }

const nbAnomalies = computed(() => (item.value ? store.nbAnomalies(item.value) : 0))

/** Toutes les anomalies relevées, avec la pause et le lieu où elles ont été constatées. */
const anomalies = computed(() => {
  if (!item.value) return []
  const out: { code: string; libelle: string; pause: number; lieu?: string; commentaire?: string }[] = []
  item.value.releves.forEach(r => {
    Object.entries(r.resultats).forEach(([code, res]) => {
      if (res === 'anomalie') {
        const pt = POINTS_CHECKLIST_ROUTE.find(p => p.code === code)
        out.push({ code, libelle: pt?.libelle ?? code, pause: r.pause, lieu: r.lieu, commentaire: r.commentaire })
      }
    })
  })
  return out
})
</script>

<template>
  <CardModalShell
    v-if="item"
    page-title="Checklist sur route"
    :page-number="item.reference"
    banner-label="Flotte · Contrôles"
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
      <span class="text-xs font-medium px-2.5 py-0.5 rounded-full" :class="nbAnomalies ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success'">
        {{ nbAnomalies ? `${nbAnomalies} anomalie(s)` : 'Conforme' }}
      </span>
      <span v-if="item.signeParChauffeur" class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-neutral-bg text-neutral">Signée</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">

        <FormSection title="Identification" :recaps="[item.tracteurPlaque, item.chauffeurNom]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Référence</label><span class="text-sm font-medium text-foreground font-mono">{{ item.reference }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Voyage</label><span class="text-sm text-foreground font-mono">{{ item.voyageRef ?? '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Tracteur</label><span class="text-sm text-foreground font-mono">{{ item.tracteurPlaque }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Semi-remorque</label><span class="text-sm text-foreground font-mono">{{ item.semiRemorquePlaque ?? '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Chauffeur</label><span class="text-sm text-foreground">{{ item.chauffeurNom }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Période</label><span class="text-sm text-foreground">{{ fmtDateHeure(item.dateDebut) }}</span></div>
          </div>
        </FormSection>

        <FormSection v-if="anomalies.length" title="Anomalies relevées" :recaps="[`${anomalies.length}`]">
          <div class="flex flex-col gap-2">
            <div v-for="(a, i) in anomalies" :key="i" class="bg-danger-bg rounded-lg px-3.5 py-2.5">
              <p class="text-[13px] font-semibold text-danger">{{ a.libelle }}</p>
              <p class="text-[11px] text-danger/80">Pause {{ a.pause }}{{ a.lieu ? ' · ' + a.lieu : '' }}{{ a.commentaire ? ' · ' + a.commentaire : '' }}</p>
            </div>
          </div>
          <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Toute anomalie alerte immédiatement le responsable maintenance. Un ordre de travail peut être ouvert
            directement depuis ce relevé.
          </p>
        </FormSection>

        <FormSection title="Relevés par pause" :recaps="[`${item.releves.length} relevé(s) sur 11 possibles`]">
          <div class="overflow-x-auto">
            <table class="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <th class="text-left py-1.5 pr-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Point de contrôle</th>
                  <th v-for="r in item.releves" :key="r.pause" class="text-center py-1.5 px-2 text-[11px] font-semibold text-muted-foreground">P{{ r.pause }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pt in POINTS_CHECKLIST_ROUTE" :key="pt.code" class="border-t border-border">
                  <td class="py-1.5 pr-3 text-foreground">{{ pt.libelle }}</td>
                  <td v-for="r in item.releves" :key="r.pause" class="text-center py-1.5 px-2">
                    <span v-if="r.resultats[pt.code] === 'conforme'" class="text-success font-bold">✓</span>
                    <span v-else-if="r.resultats[pt.code] === 'anomalie'" class="text-danger font-bold">✕</span>
                    <span v-else class="text-muted-foreground">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Notation reprise du formulaire papier : une coche si le point est conforme, une croix s'il est absent
            ou défectueux. Seize points, jusqu'à onze pauses par voyage.
          </p>
        </FormSection>

        <FormSection title="Détail des pauses" :recaps="[`${item.releves.length}`]" :default-open="false">
          <div v-for="r in item.releves" :key="r.pause" class="border-b border-border/60 py-2.5 last:border-0">
            <div class="flex items-baseline justify-between">
              <span class="text-xs font-medium text-foreground">Pause {{ r.pause }} · {{ r.lieu ?? 'lieu non renseigné' }}</span>
              <span class="text-[11px] text-muted-foreground">{{ fmtDateHeure(r.horodatage) }}</span>
            </div>
            <p v-if="r.commentaire" class="text-[11px] text-muted-foreground mt-1">{{ r.commentaire }}</p>
          </div>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
