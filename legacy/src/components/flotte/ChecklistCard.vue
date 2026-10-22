<script setup lang="ts">
import { ref, computed } from 'vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import { useControlesStore } from '../../stores/controles'
import { useAuthStore } from '../../stores/auth'
import { CircleCheck, TriangleAlert, WifiOff } from '@lucide/vue'
import * as Fc from '../../lib/formClasses'
import { fmtDateHeure } from '../../utils/voyageUtils'
import type { ChecklistRoute } from '../../types'

const props = defineProps<{ checklists: ChecklistRoute[]; checklistId: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useControlesStore()
const auth = useAuthStore()
const erreur = ref(''); const succes = ref('')
function ouvrirOT(pause: number, code: string) {
  if (!item.value) return
  const r = store.ouvrirOrdreTravail(item.value.id, pause, code, auth.user?.nom ?? 'Responsable')
  erreur.value = r.ok ? '' : r.motif ?? ''; succes.value = r.ok ? `Ordre de travail ${r.ref} ouvert.` : ''
}
/** Points affichés : ceux du paramétrage, plus ceux relevés auparavant et retirés depuis. */
const pointsAffiches = computed(() => {
  const codes = new Set(store.pointsActifs.map(p => p.code))
  item.value?.releves.forEach(r => Object.keys(r.resultats).forEach(c => codes.add(c)))
  return [...codes].map(code => ({ code, libelle: store.libellePoint(code, item.value?.releves.find(r => r.libelles?.[code])) }))
})
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
  const out: { code: string; libelle: string; pause: number; lieu?: string; commentaire?: string; ot?: string }[] = []
  item.value.releves.forEach(r => {
    Object.entries(r.resultats).forEach(([code, res]) => {
      if (res === 'anomalie') out.push({ code, libelle: store.libellePoint(code, r), pause: r.pause, lieu: r.lieu, commentaire: r.commentaires?.[code] ?? r.commentaire, ot: r.ordresTravail?.[code] })
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
      <span v-if="item.synchroniseLe" class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-neutral-bg text-neutral">Synchronisée</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>

        <FormSection title="Identification" :recaps="[item.tracteurPlaque, item.chauffeurNom]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Référence</label><span class="text-sm font-medium text-foreground font-mono">{{ item.reference }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Voyage</label><span class="text-sm text-foreground font-mono">{{ item.voyageRef ?? '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Tracteur</label><span class="text-sm text-foreground font-mono">{{ item.tracteurPlaque }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Semi-remorque</label><span class="text-sm text-foreground font-mono">{{ item.semiRemorquePlaque ?? '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Conducteur</label><span class="text-sm text-foreground">{{ item.chauffeurNom }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Période</label><span class="text-sm text-foreground">{{ fmtDateHeure(item.dateDebut) }}</span></div>
            <div class="flex flex-col gap-1 col-span-2 max-sm:col-span-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Signature</label>
              <span v-if="item.signeParChauffeur" class="text-sm text-foreground">Signée par {{ item.chauffeurNom }}<template v-if="item.signeLe">, le {{ fmtDateHeure(item.signeLe) }}</template></span>
              <span v-else class="text-sm text-warning">Non signée</span>
            </div>
          </div>
        </FormSection>

        <FormSection v-if="anomalies.length" title="Anomalies relevées" :recaps="[`${anomalies.length}`]">
          <div class="flex flex-col gap-2">
            <div v-for="(a, i) in anomalies" :key="i" class="bg-danger-bg rounded-lg px-3.5 py-2.5 flex items-center gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-[13px] font-semibold text-danger">{{ a.libelle }}</p>
                <p class="text-[11px] text-danger/80">Pause {{ a.pause }}{{ a.lieu ? ' · ' + a.lieu : '' }}{{ a.commentaire ? ' · ' + a.commentaire : '' }}</p>
              </div>
              <span v-if="a.ot" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-card text-foreground font-mono">{{ a.ot }}</span>
              <button v-else :class="Fc.btnOutline" class="!py-1 !text-[11px] shrink-0" @click="ouvrirOT(a.pause, a.code)">Ouvrir un ordre de travail</button>
            </div>
          </div>
        </FormSection>

        <FormSection title="Relevés par pause" :recaps="[`${item.releves.length} relevé(s)`]">
          <div class="overflow-x-auto">
            <table class="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <th class="text-left py-1.5 pr-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Point de contrôle</th>
                  <th v-for="r in item.releves" :key="r.pause" class="text-center py-1.5 px-2 text-[11px] font-semibold text-muted-foreground">Pause {{ r.pause }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pt in pointsAffiches" :key="pt.code" class="border-t border-border">
                  <td class="py-1.5 pr-3 text-foreground">{{ pt.libelle }}</td>
                  <td v-for="r in item.releves" :key="r.pause" class="text-center py-1.5 px-2" :title="r.commentaires?.[pt.code]">
                    <span v-if="r.resultats[pt.code] === 'conforme'" class="text-success font-bold">✓</span>
                    <span v-else-if="r.resultats[pt.code] === 'anomalie'" class="text-danger font-bold">✕</span>
                    <span v-else class="text-muted-foreground">-</span>
                    <div v-if="r.commentaires?.[pt.code]" class="text-[10px] text-muted-foreground text-left max-w-[160px]">{{ r.commentaires[pt.code] }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </FormSection>

        <FormSection title="Détail des pauses" :recaps="[`${item.releves.length}`]" :default-open="false">
          <div v-for="r in item.releves" :key="r.pause" class="border-b border-border/60 py-2.5 last:border-0">
            <div class="flex items-baseline justify-between">
              <span class="text-xs font-medium text-foreground">Pause {{ r.pause }} · {{ r.lieu ?? 'lieu non renseigné' }}<span v-if="r.saisiHorsLigneLe" class="ml-2 text-[11px] text-muted-foreground inline-flex items-center gap-1"><WifiOff class="w-3 h-3" /> saisi hors ligne</span></span>
              <span class="text-[11px] text-muted-foreground">{{ fmtDateHeure(r.horodatage) }}</span>
            </div>
            <p v-if="r.commentaire" class="text-[11px] text-muted-foreground mt-1">{{ r.commentaire }}</p>
            <p v-for="(texte, code) in r.commentaires ?? {}" :key="code" class="text-[11px] text-muted-foreground mt-1">{{ store.libellePoint(String(code), r) }} : {{ texte }}</p>
          </div>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
