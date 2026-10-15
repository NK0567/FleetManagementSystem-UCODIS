<script setup lang="ts">
/** Fiche d'une formation : planification, suivi, annulation (FMS-SC-07). */
import { ref, computed, watch } from 'vue'
import { CircleCheck, TriangleAlert } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import ChampLecture from '../maintenance/ChampLecture.vue'
import { useFormationsStore, LIB_MOTIF_FORMATION, LIB_STATUT_FORMATION } from '../../stores/formations'
import { usePersonnelStore } from '../../stores/personnel'
import { useScoresConducteursStore } from '../../stores/scoresConducteurs'
import { formatDate } from '../../utils/helpers'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as F from '../../lib/formClasses'

const props = defineProps<{ ids: string[]; formationId: string }>()
const emit = defineEmits<{ close: [] }>()
const store = useFormationsStore()
const personnel = usePersonnelStore()
const scores = useScoresConducteursStore()
const idCourant = ref(props.formationId)
const item = computed(() => store.getById(idCourant.value) ?? null)
const index = computed(() => props.ids.indexOf(idCourant.value))
const sidebarItems = computed(() => props.ids.map(id => ({ no: id, label: personnel.parId(store.getById(id)?.conducteurId ?? '')?.nomComplet })))
function naviguer(d: number) { const c = props.ids[index.value + d]; if (c) idCourant.value = c }
const conducteur = computed(() => item.value ? personnel.parId(item.value.conducteurId) : null)
const historique = computed(() => item.value ? store.duConducteur(item.value.conducteurId).filter(f => f.id !== item.value!.id) : [])

const erreur = ref(''); const succes = ref('')
const plan = ref({ date: '', organisme: '' }); const resultat = ref(''); const motif = ref('')
watch(idCourant, () => { erreur.value = ''; succes.value = ''; plan.value = { date: '', organisme: '' }; resultat.value = ''; motif.value = '' })
function res(r: { ok: boolean; motif?: string }, m: string) { erreur.value = r.ok ? '' : r.motif ?? ''; succes.value = r.ok ? m : '' }
function planifier() { if (item.value) res(store.planifier(item.value.id, plan.value.date, plan.value.organisme), 'Formation planifiée.') }
function suivie() { if (item.value) res(store.marquerSuivie(item.value.id, resultat.value), 'Formation marquée suivie.') }
function annuler() { if (item.value) res(store.annuler(item.value.id, motif.value), 'Formation annulée.') }
</script>

<template>
  <CardModalShell v-if="item" :page-title="item.theme" :page-number="item.id" banner-label="Flotte · Formations" :is-edit-mode="false"
    :sidebar-items="sidebarItems" :current-no="item.id" :has-prev="index > 0" :has-next="index >= 0 && index < ids.length - 1" hide-action-bar
    @close="emit('close')" @go-prev="naviguer(-1)" @go-next="naviguer(1)" @select-sidebar="no => idCourant = no">
    <template #title-badges>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" :class="LIB_STATUT_FORMATION[item.statut].cls">{{ LIB_STATUT_FORMATION[item.statut].label }}</span>
    </template>
    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>
        <FormSection title="Formation" :recaps="[conducteur?.nomComplet ?? '', LIB_MOTIF_FORMATION[item.motif]]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Conducteur">{{ conducteur?.nomComplet ?? item.conducteurId }}<div class="text-[11px] text-muted-foreground">score actuel {{ scores.scoreGlobal(item.conducteurId) }}/100</div></ChampLecture>
            <ChampLecture libelle="Déclenchée par">{{ LIB_MOTIF_FORMATION[item.motif] }}{{ item.origineRef ? ` · ${item.origineRef}` : '' }}</ChampLecture>
            <ChampLecture libelle="Déclenchée le">{{ fmtDateHeure(item.declencheeLe) }} · {{ item.declenchePar }}</ChampLecture>
            <ChampLecture libelle="Prévue le">{{ item.prevueLe ? formatDate(item.prevueLe) : '-' }}{{ item.organisme ? ` · ${item.organisme}` : '' }}</ChampLecture>
            <ChampLecture v-if="item.suivieLe" libelle="Suivie le">{{ formatDate(item.suivieLe) }}</ChampLecture>
            <ChampLecture v-if="item.resultat" libelle="Résultat">{{ item.resultat }}</ChampLecture>
          </div>
        </FormSection>
        <FormSection v-if="item.statut === 'a_planifier' || item.statut === 'planifiee'" title="Suivi" :recaps="[LIB_STATUT_FORMATION[item.statut].label]" :default-open="true">
          <div v-if="item.statut === 'a_planifier'" class="flex gap-2 items-end flex-wrap mb-3">
            <div :class="F.field"><label :class="F.fieldLabel">Date *</label><input v-model="plan.date" type="date" :class="F.fieldInput" /></div>
            <div :class="F.field" class="flex-1 min-w-[200px]"><label :class="F.fieldLabel">Organisme ou formateur</label><input v-model="plan.organisme" :class="F.fieldInput" /></div>
            <button :class="F.btnPrimary" @click="planifier">Planifier</button>
          </div>
          <div v-else class="flex gap-2 items-end flex-wrap mb-3">
            <div :class="F.field" class="flex-1 min-w-[220px]"><label :class="F.fieldLabel">Résultat</label><input v-model="resultat" :class="F.fieldInput" placeholder="ex. évaluation réussie" /></div>
            <button :class="F.btnPrimary" @click="suivie">Marquer suivie</button>
          </div>
          <div class="flex gap-2 items-end flex-wrap">
            <div :class="F.field" class="flex-1 min-w-[220px]"><label :class="F.fieldLabel">Motif d'annulation</label><input v-model="motif" :class="F.fieldInput" /></div>
            <button :class="F.btnOutline" @click="annuler">Annuler la formation</button>
          </div>
        </FormSection>
        <FormSection title="Historique du conducteur" :recaps="[`${historique.length} autre(s) formation(s)`]" :default-open="false">
          <p v-if="!historique.length" class="text-xs text-muted-foreground">Aucune autre formation.</p>
          <div v-for="f in historique" :key="f.id" class="text-xs border-b border-border/60 py-1.5">{{ f.theme }}<div class="text-[11px] text-muted-foreground">{{ LIB_STATUT_FORMATION[f.statut].label }} · {{ formatDate(f.suivieLe ?? f.prevueLe ?? f.declencheeLe) }}</div></div>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
