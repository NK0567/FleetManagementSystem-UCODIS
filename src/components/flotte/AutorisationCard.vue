<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CircleCheck, CircleX, Circle, ChevronDown, TriangleAlert } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import { useDepartsStore, LIB_CONTROLE_DEPART } from '../../stores/departs'
import { POINTS_CHECKLIST_ROUTE } from '../../stores/controles'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as cls from '../../lib/formClasses'
import type { AutorisationDepart } from '../../types'

const props = defineProps<{ autorisations: AutorisationDepart[]; autorisationId: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useDepartsStore()
const idCourant = ref(props.autorisationId)
const item = computed<AutorisationDepart | null>(() => store.getById(idCourant.value) ?? props.autorisations.find(a => a.id === idCourant.value) ?? null)

/* ── Checklist des 16 points, remplie directement depuis cette fiche ── */
const checklistOuverte = ref(false)
const checklistLocale = ref<Record<string, boolean>>({})
function initChecklistLocale() {
  const existante = item.value?.checklistDepart
  checklistLocale.value = Object.fromEntries(POINTS_CHECKLIST_ROUTE.map(p => [p.code, existante?.[p.code] ?? true]))
}
watch(item, initChecklistLocale, { immediate: true })
function validerChecklist() {
  if (!item.value) return
  store.validerChecklistDepart(item.value.id, { ...checklistLocale.value })
  checklistOuverte.value = false
}

const index = computed(() => props.autorisations.findIndex(a => a.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.autorisations.length - 1)
const sidebarItems = computed(() => props.autorisations.map(a => ({ no: a.reference, label: a.vehiculePlaque })))
function naviguer(delta: number) { const a = props.autorisations[index.value + delta]; if (a) idCourant.value = a.id }
function selectSidebar(no: string) { const a = props.autorisations.find(x => x.reference === no); if (a) idCourant.value = a.id }

const statutLabel = computed(() => {
  if (!item.value) return ''
  if (!item.value.decideLe) return 'En attente'
  return item.value.accordee ? 'Accordée' : 'Refusée'
})
const statutCls = computed(() => {
  if (!item.value) return ''
  if (!item.value.decideLe) return 'bg-warning-bg text-warning'
  return item.value.accordee ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
})

function accorder() {
  if (!item.value) return
  store.accorder(item.value.id, 'Hery Andriamalala')
}
const peutPartir = computed(() => (item.value ? store.peutPartir(item.value) : false))
const motifRefus = ref('')
function refuser() {
  if (!item.value || !motifRefus.value.trim()) return
  store.refuser(item.value.id, 'Hery Andriamalala', motifRefus.value.trim())
  motifRefus.value = ''
}
</script>

<template>
  <CardModalShell
    v-if="item"
    page-title="Autorisation de départ"
    :page-number="item.reference"
    banner-label="Flotte · Départs"
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
      <span class="text-xs font-medium px-2.5 py-0.5 rounded-full" :class="statutCls">{{ statutLabel }}</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">

        <FormSection title="Identification" :recaps="[item.vehiculePlaque, item.chauffeurNom]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Référence</label><span class="text-sm font-mono font-medium text-foreground">{{ item.reference }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Voyage</label><span class="text-sm font-mono text-foreground">{{ item.voyageRef ?? '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Véhicule</label><span class="text-sm font-mono text-foreground">{{ item.vehiculePlaque }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Chauffeur</label><span class="text-sm text-foreground">{{ item.chauffeurNom }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Demandée le</label><span class="text-sm text-foreground">{{ fmtDateHeure(item.demandeeLe) }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Suivi activé</label><span class="text-sm text-foreground">{{ item.suiviActiveLe ? fmtDateHeure(item.suiviActiveLe) : '-' }}</span></div>
          </div>
        </FormSection>

        <FormSection title="Contrôles avant départ" :recaps="[`${item.controles.filter(c => c.conforme).length}/4 conformes`]" :default-open="true">
          <div class="flex flex-col gap-2">
            <div v-for="(c, i) in item.controles" :key="i" class="rounded-md overflow-hidden" :class="c.conforme ? 'bg-background' : 'bg-danger-bg'">
              <div class="flex items-start gap-2.5 px-3 py-2" :class="c.controle === 'checklist' ? 'cursor-pointer' : ''" @click="c.controle === 'checklist' && (checklistOuverte = !checklistOuverte)">
                <component :is="c.conforme ? CircleCheck : CircleX" class="w-4 h-4 shrink-0 mt-px" :class="c.conforme ? 'text-success' : 'text-danger'" />
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium" :class="c.conforme ? 'text-foreground' : 'text-danger'">{{ LIB_CONTROLE_DEPART[c.controle] }}</p>
                  <p v-if="c.controle === 'checklist'" class="text-[11px]" :class="item.checklistValideeLe ? 'text-muted-foreground' : 'text-warning'">
                    {{ item.checklistValideeLe ? `Checklist validée le ${fmtDateHeure(item.checklistValideeLe)}.` : 'Checklist avant départ non encore réalisée.' }}
                  </p>
                  <p v-else-if="c.detail" class="text-[11px] text-muted-foreground">{{ c.detail }}</p>
                </div>
                <ChevronDown v-if="c.controle === 'checklist'" class="w-4 h-4 shrink-0 text-muted-foreground transition-transform" :class="checklistOuverte ? 'rotate-180' : ''" />
              </div>

              <!-- Checklist des 16 points, remplie directement depuis cette fiche. -->
              <div v-if="c.controle === 'checklist' && checklistOuverte" class="px-3.5 pb-3.5">
                <p class="text-[11px] text-muted-foreground mb-2.5">Point par point, avant que le camion ne quitte l'atelier.</p>
                <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
                  <label v-for="pt in POINTS_CHECKLIST_ROUTE" :key="pt.code" class="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input v-model="checklistLocale[pt.code]" type="checkbox" class="w-4 h-4 rounded cursor-pointer" />
                    {{ pt.libelle }}
                  </label>
                </div>
                <button :class="cls.btnPrimary" class="w-full justify-center" @click="validerChecklist">Valider la checklist avant départ</button>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 mt-3.5 text-xs">
            <div class="flex items-center gap-1.5"><component :is="item.briefingSecuriteFait ? CircleCheck : Circle" class="w-3.5 h-3.5" :class="item.briefingSecuriteFait ? 'text-success' : 'text-muted-foreground'" /> Briefing sécurité</div>
            <div class="flex items-center gap-1.5"><component :is="item.reposHebdoVerifie ? CircleCheck : Circle" class="w-3.5 h-3.5" :class="item.reposHebdoVerifie ? 'text-success' : 'text-muted-foreground'" /> Repos hebdomadaire vérifié</div>
          </div>
          <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Les quatre contrôles doivent tous être conformes. Aucun voyage ne peut être créé sans autorisation délivrée.
          </p>
        </FormSection>

        <FormSection title="Décision" :recaps="[statutLabel, item.decidePar]" :default-open="!item.decideLe">
          <template v-if="item.decideLe">
            <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
              <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Décidée par</label><span class="text-sm text-foreground">{{ item.decidePar }}</span></div>
              <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Décidée le</label><span class="text-sm text-foreground">{{ fmtDateHeure(item.decideLe) }}</span></div>
            </div>
            <p v-if="item.motifRefus" class="text-sm text-danger leading-relaxed mt-3">{{ item.motifRefus }}</p>
          </template>
          <template v-else>
            <div v-if="!peutPartir" class="flex items-start gap-2.5 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3">
              <TriangleAlert class="w-4 h-4 shrink-0 mt-px" />
              <p class="text-xs leading-relaxed">
                {{ item.controles.filter(c => !c.conforme).length }} contrôle(s) non conforme(s). Le départ ne peut
                pas être autorisé tant qu'ils ne sont pas levés.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button :class="cls.btnPrimary" :disabled="!peutPartir" @click="accorder">Accorder le départ</button>
            </div>
            <div :class="cls.field" class="mt-3">
              <label :class="cls.fieldLabel">Motif de refus</label>
              <textarea v-model="motifRefus" rows="2" :class="cls.fieldTextarea" placeholder="Obligatoire pour refuser…"></textarea>
            </div>
            <button :class="cls.btnOutline" class="mt-2" :disabled="!motifRefus.trim()" @click="refuser">Refuser le départ</button>
          </template>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
