<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CircleCheck, CircleX, ChevronDown, TriangleAlert } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import { useDepartsStore, libelleControleDepart, controleBloque } from '../../stores/departs'
import { useControlesStore } from '../../stores/controles'
import { useAuthStore } from '../../stores/auth'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as cls from '../../lib/formClasses'
import type { AutorisationDepart, ResultatControleDepart } from '../../types'

const props = defineProps<{ autorisations: AutorisationDepart[]; autorisationId: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useDepartsStore()
const controlesStore = useControlesStore()
const auth = useAuthStore()
const moi = computed(() => auth.user?.nom ?? 'Responsable flotte')
const erreur = ref('')
const controles = computed(() => item.value ? store.controlesDe(item.value) : [])
const idCourant = ref(props.autorisationId)
const item = computed<AutorisationDepart | null>(() => store.getById(idCourant.value) ?? props.autorisations.find(a => a.id === idCourant.value) ?? null)

/* Contrôle avant départ, rempli point par point depuis cette fiche. */
const checklistOuverte = ref(false)
/* Rien n'est pré-coché : chaque point se note « Conforme » ou « Anomalie ». */
const checklistLocale = ref<Record<string, boolean | undefined>>({})
const erreurChecklist = ref('')
function initChecklistLocale() {
  const existante = item.value?.checklistDepart
  checklistLocale.value = Object.fromEntries(controlesStore.pointsActifs.map(p => [p.code, existante?.[p.code]]))
  erreurChecklist.value = ''
}
watch(item, initChecklistLocale, { immediate: true })
function validerChecklist() {
  if (!item.value) return
  const r = store.validerChecklistDepart(item.value.id, { ...checklistLocale.value })
  erreurChecklist.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) checklistOuverte.value = false
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
  const r = store.accorder(item.value.id, moi.value)
  erreur.value = r.ok ? '' : r.motif ?? ''
}
/* Contrôles du conducteur : cochés conforme ou non conforme par la personne qui délivre. */
const commentaires = ref<Record<string, string>>({})
watch(item, a => { commentaires.value = Object.fromEntries(Object.entries(a?.saisiesConducteur ?? {}).map(([k, v]) => [k, v.commentaire ?? ''])) }, { immediate: true })
const erreurConducteur = ref('')
function cocher(c: ResultatControleDepart, conforme: boolean) {
  if (!item.value || !c.code) return
  const r = store.saisirControleConducteur(item.value.id, c.code, conforme, commentaires.value[c.code] ?? '', moi.value)
  erreurConducteur.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) erreur.value = ''
}
function commenter(c: ResultatControleDepart) {
  const s = c.code ? item.value?.saisiesConducteur?.[c.code] : undefined
  if (s && c.code && (s.commentaire ?? '') !== (commentaires.value[c.code] ?? '').trim()) cocher(c, s.conforme)
}
const peutPartir = computed(() => (item.value ? store.peutPartir(item.value) : false))
const motifRefus = ref('')
function refuser() {
  if (!item.value || !motifRefus.value.trim()) return
  store.refuser(item.value.id, moi.value, motifRefus.value.trim())
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
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Conducteur</label><span class="text-sm text-foreground">{{ item.chauffeurNom }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Demandée le</label><span class="text-sm text-foreground">{{ fmtDateHeure(item.demandeeLe) }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Caméra</label><span class="text-sm text-foreground">{{ item.cameraActiveeLe ? `activée le ${fmtDateHeure(item.cameraActiveeLe)}` : !store.aCamera(item.vehiculeId) ? 'véhicule non équipé' : item.decideLe && !item.accordee ? 'non activée, départ refusé' : 'activée à la délivrance' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Suivi GPS activé</label><span class="text-sm text-foreground">{{ item.suiviActiveLe ? fmtDateHeure(item.suiviActiveLe) : '-' }}</span></div>
          </div>
        </FormSection>

        <FormSection title="Contrôles avant départ" :recaps="[`${controles.filter(c => c.conforme).length}/${controles.length} conformes`]" :default-open="true">
          <div class="flex flex-col gap-2">
            <div v-for="(c, i) in controles" :key="i" class="rounded-md overflow-hidden" :class="c.conforme ? 'bg-background' : 'bg-danger-bg'">
              <div class="flex items-start gap-2.5 px-3 py-2" :class="c.controle === 'checklist' ? 'cursor-pointer' : ''" @click="c.controle === 'checklist' && (checklistOuverte = !checklistOuverte)">
                <component :is="c.conforme ? CircleCheck : CircleX" class="w-4 h-4 shrink-0 mt-px" :class="c.conforme ? 'text-success' : 'text-danger'" />
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium" :class="c.conforme ? 'text-foreground' : 'text-danger'">{{ libelleControleDepart(c) }}<span v-if="c.controle === 'conducteur' && c.bloquant === false" class="ml-1.5 text-[11px] font-normal text-muted-foreground">non bloquant</span></p>
                  <p v-if="c.controle === 'checklist'" class="text-[11px]" :class="item.checklistValideeLe ? 'text-muted-foreground' : 'text-warning'">
                    {{ item.checklistValideeLe ? `Contrôle validé le ${fmtDateHeure(item.checklistValideeLe)}.` : 'Contrôle avant départ non encore réalisé.' }}
                  </p>
                  <p v-else-if="c.controle === 'conducteur' && !item.decideLe" class="text-[11px] text-muted-foreground">{{ c.renseigne ? (c.conforme ? 'Conforme.' : 'Non conforme.') : 'Non renseigné.' }}</p>
                  <p v-else-if="c.detail" class="text-[11px] text-muted-foreground">{{ c.detail }}</p>
                  <div v-if="c.controle === 'conducteur' && !item.decideLe && c.code" class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <button type="button" class="px-2.5 py-1 rounded-md text-[11px] font-medium border cursor-pointer"
                      :class="c.renseigne && c.conforme ? 'bg-success text-white border-success' : 'bg-card text-foreground border-border'" @click="cocher(c, true)">Conforme</button>
                    <button type="button" class="px-2.5 py-1 rounded-md text-[11px] font-medium border cursor-pointer"
                      :class="c.renseigne && !c.conforme ? 'bg-danger text-white border-danger' : 'bg-card text-foreground border-border'" @click="cocher(c, false)">Non conforme</button>
                    <input v-model="commentaires[c.code]" :class="cls.fieldInput" class="!h-[28px] !text-[12px] flex-1 min-w-[160px]" placeholder="Commentaire" @blur="commenter(c)" @keyup.enter="commenter(c)" />
                  </div>
                  <p v-else-if="c.controle === 'conducteur' && c.code && item.saisiesConducteur?.[c.code]?.par" class="text-[11px] text-muted-foreground">Renseigné par {{ item.saisiesConducteur?.[c.code]?.par }}</p>
                </div>
                <ChevronDown v-if="c.controle === 'checklist'" class="w-4 h-4 shrink-0 text-muted-foreground transition-transform" :class="checklistOuverte ? 'rotate-180' : ''" />
              </div>

              <div v-if="c.controle === 'checklist' && checklistOuverte" class="px-3.5 pb-3.5">
                <div class="flex flex-col mb-3">
                  <div v-for="pt in controlesStore.pointsActifs" :key="pt.code" class="flex items-center gap-2 py-1 border-b border-border/60 last:border-0">
                    <span class="text-xs text-foreground flex-1">{{ pt.libelle }}</span>
                    <button type="button" class="px-2.5 py-1 rounded-md text-[11px] font-medium border cursor-pointer"
                      :class="checklistLocale[pt.code] === true ? 'bg-success text-white border-success' : 'bg-card text-foreground border-border'" @click="checklistLocale[pt.code] = true" :disabled="!!item.decideLe">Conforme</button>
                    <button type="button" class="px-2.5 py-1 rounded-md text-[11px] font-medium border cursor-pointer"
                      :class="checklistLocale[pt.code] === false ? 'bg-danger text-white border-danger' : 'bg-card text-foreground border-border'" @click="checklistLocale[pt.code] = false" :disabled="!!item.decideLe">Anomalie</button>
                  </div>
                </div>
                <p v-if="erreurChecklist" class="text-[12px] text-danger mb-2">{{ erreurChecklist }}</p>
                <button v-if="!item.decideLe" :class="cls.btnPrimary" class="w-full justify-center" @click="validerChecklist">Valider le contrôle avant départ</button>
              </div>
            </div>
          </div>
          <p v-if="erreurConducteur" class="text-[12px] text-danger mt-2">{{ erreurConducteur }}</p>
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
            <div v-if="erreur" class="flex items-start gap-2.5 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0 mt-px" /> {{ erreur }}</div>
            <div v-else-if="!peutPartir" class="flex items-start gap-2.5 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3">
              <TriangleAlert class="w-4 h-4 shrink-0 mt-px" />
              <p class="text-xs leading-relaxed">
                Départ bloqué : {{ controles.filter(controleBloque).map(c => c.controle === 'conducteur' ? `${libelleControleDepart(c)} (${(c.detail ?? 'non conforme').replace(/\.$/, '').toLowerCase()}).` : c.detail ?? libelleControleDepart(c)).join(' ') }}
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
