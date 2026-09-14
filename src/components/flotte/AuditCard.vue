<script setup lang="ts">
import { ref, computed } from 'vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import { useControlesStore } from '../../stores/controles'
import { fmtDateHeure } from '../../utils/voyageUtils'
import type { AuditConformite } from '../../types'

const props = defineProps<{ audits: AuditConformite[]; auditId: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useControlesStore()
const idCourant = ref(props.auditId)
const item = computed<AuditConformite | null>(() => store.getAuditById(idCourant.value) ?? props.audits.find(a => a.id === idCourant.value) ?? null)

const index = computed(() => props.audits.findIndex(a => a.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.audits.length - 1)
const sidebarItems = computed(() => props.audits.map(a => ({ no: a.reference, label: a.tracteurPlaque })))
function naviguer(delta: number) { const a = props.audits[index.value + delta]; if (a) idCourant.value = a.id }
function selectSidebar(no: string) { const a = props.audits.find(x => x.reference === no); if (a) idCourant.value = a.id }

const VERDICT_LIB: Record<'conforme' | 'conforme_observation' | 'non_conforme', { label: string; cls: string }> = {
  conforme: { label: 'Conforme', cls: 'bg-success-bg text-success' },
  conforme_observation: { label: 'Conforme avec réserve', cls: 'bg-warning-bg text-warning' },
  non_conforme: { label: 'Non conforme', cls: 'bg-danger-bg text-danger' },
}

const parCategorie = computed(() => {
  if (!item.value) return []
  const cats = new Map<string, { code: string; libelle: string; verdict: 'conforme' | 'conforme_observation' | 'non_conforme'; observation?: string }[]>()
  item.value.resultats.forEach(r => {
    const poste = store.POSTES_AUDIT.find(p => p.code === r.code)
    if (!poste) return
    if (!cats.has(poste.categorie)) cats.set(poste.categorie, [])
    cats.get(poste.categorie)!.push({ code: r.code, libelle: poste.libelle, verdict: r.verdict, observation: r.observation })
  })
  return [...cats.entries()]
})
</script>

<template>
  <CardModalShell
    v-if="item"
    page-title="Audit de conformité"
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
      <span class="text-xs font-medium px-2.5 py-0.5 rounded-full" :class="item.conforme ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ item.conforme ? 'Conforme' : 'Non conforme' }}</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">

        <FormSection title="Identification" :recaps="[item.tracteurPlaque, item.auditeur]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Référence</label><span class="text-sm font-mono font-medium text-foreground">{{ item.reference }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Date</label><span class="text-sm text-foreground">{{ fmtDateHeure(item.date) }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Tracteur</label><span class="text-sm font-mono text-foreground">{{ item.tracteurPlaque }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Semi-remorque</label><span class="text-sm font-mono text-foreground">{{ item.semiRemorquePlaque ?? '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Auditeur</label><span class="text-sm text-foreground">{{ item.auditeur }}</span></div>
          </div>
        </FormSection>

        <FormSection v-if="item.contreVisiteLe" title="Contre-visite" :recaps="[fmtDateHeure(item.contreVisiteLe)]">
          <p class="text-sm text-warning leading-relaxed">
            Programmée automatiquement dès qu'un poste est non conforme, le {{ fmtDateHeure(item.contreVisiteLe) }}.
          </p>
          <p v-if="item.commentaire" class="text-[13px] text-muted-foreground mt-2 leading-relaxed">{{ item.commentaire }}</p>
        </FormSection>

        <FormSection v-for="[categorie, postes] in parCategorie" :key="categorie" :title="categorie" :recaps="[`${postes.length} poste(s)`]">
          <div class="flex flex-col gap-2">
            <div v-for="p in postes" :key="p.code" class="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
              <div class="min-w-0">
                <p class="text-xs font-mono text-muted-foreground">{{ p.code }}</p>
                <p class="text-[13px] text-foreground">{{ p.libelle }}</p>
                <p v-if="p.observation" class="text-[11px] text-muted-foreground mt-0.5">{{ p.observation }}</p>
              </div>
              <span class="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0" :class="VERDICT_LIB[p.verdict].cls">{{ VERDICT_LIB[p.verdict].label }}</span>
            </div>
          </div>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
