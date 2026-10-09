<script setup lang="ts">
/** Fiche d'une intervention de l'équipe mobile (FMS-MA-08). */
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { TriangleAlert, Wrench } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import ChampLecture from './ChampLecture.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { LIB_MISSION_MOBILE, LIB_STATUT_OT } from '../../types/maintenance'
import type { InterventionMobile } from '../../types/maintenance'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as F from '../../lib/formClasses'

const props = defineProps<{ interventions: InterventionMobile[]; interventionId: string }>()
const emit = defineEmits<{ close: []; creer: [] }>()

const store = useMaintenanceStore()
const router = useRouter()

const idCourant = ref(props.interventionId)
const item = computed(() => store.interventionsMobiles.find(i => i.id === idCourant.value) ?? null)
const index = computed(() => props.interventions.findIndex(i => i.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.interventions.length - 1)
const sidebarItems = computed(() => props.interventions.map(i => ({ no: i.reference, label: i.vehiculePlaque ?? 'Contrôle' })))
function naviguer(delta: number) { const i = props.interventions[index.value + delta]; if (i) idCourant.value = i.id }
function selectSidebar(no: string) { const i = props.interventions.find(x => x.reference === no); if (i) idCourant.value = i.id }

const estControle = computed(() => !!item.value && item.value.type.startsWith('controle'))
const delai = computed(() => item.value?.arriveeLe ? Math.round((+new Date(item.value.arriveeLe) - +new Date(item.value.declencheLe)) / 60_000) : null)
function fmtDuree(minutes: number) { const h = Math.floor(minutes / 60); const m = minutes % 60; return h > 0 ? `${h} h ${m > 0 ? m + ' min' : ''}`.trim() : `${m} min` }
const ot = computed(() => item.value?.ordreTravailId ? store.getById(item.value.ordreTravailId) : null)
function voirOT() { if (ot.value) router.push({ name: 'maintenance-ordres', query: { ot: ot.value.id } }) }

const cloture = ref({ observation: '', ouvrirOT: true, testsRealises: undefined as number | undefined, testsPositifs: undefined as number | undefined })
const erreur = ref('')
watch(idCourant, () => { erreur.value = ''; cloture.value = { observation: '', ouvrirOT: true, testsRealises: undefined, testsPositifs: undefined } })

function cloturer(resolu: boolean) {
  if (!item.value) return
  let tests: { realises: number; positifs: number } | undefined
  if (estControle.value) {
    if (cloture.value.testsRealises == null) { erreur.value = 'Indiquez le nombre de tests réalisés.'; return }
    tests = { realises: cloture.value.testsRealises, positifs: cloture.value.testsPositifs ?? 0 }
  }
  if (!resolu && !cloture.value.observation.trim()) { erreur.value = "Décrivez ce qui n'a pas pu être résolu."; return }
  const r = store.cloturerMobile(item.value.id, resolu, cloture.value.observation.trim(), !resolu && cloture.value.ouvrirOT, tests)
  erreur.value = r.ok ? '' : (r.motif ?? '')
}
</script>

<template>
  <CardModalShell
    v-if="item"
    :page-title="item.reference"
    :page-number="item.reference"
    banner-label="Maintenance · Équipe mobile"
    :is-edit-mode="false"
    :sidebar-items="sidebarItems"
    :current-no="item.reference"
    :has-prev="hasPrev"
    :has-next="hasNext"
    hide-action-bar
    @close="emit('close')"
    @create="emit('creer')"
    @go-prev="naviguer(-1)"
    @go-next="naviguer(1)"
    @select-sidebar="selectSidebar"
  >
    <template #title-badges>
      <span class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-neutral-bg text-neutral">{{ LIB_MISSION_MOBILE[item.type] }}</span>
      <span v-if="!item.clotureLe" class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-warning-bg text-warning">{{ item.arriveeLe ? 'Sur place' : 'En route' }}</span>
      <span v-else-if="item.resolu" class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-success-bg text-success">Résolue</span>
      <span v-else class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-danger-bg text-danger">Non résolue</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <!-- 1. DÉCLENCHEMENT -->
        <FormSection title="Déclenchement" :recaps="[item.vehiculePlaque ?? 'contrôle général', item.lieu]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Type">{{ LIB_MISSION_MOBILE[item.type] }}</ChampLecture>
            <ChampLecture libelle="Camion" :mono="!!item.vehiculePlaque">{{ item.vehiculePlaque ?? 'Contrôle général' }}</ChampLecture>
            <ChampLecture libelle="Position du camion" large>{{ item.lieu }}</ChampLecture>
            <ChampLecture libelle="Déclenchée le">{{ fmtDateHeure(item.declencheLe) }}</ChampLecture>
            <ChampLecture libelle="Équipe envoyée"><span v-for="m in item.equipe" :key="m" class="block">{{ m }}</span></ChampLecture>
          </div>
        </FormSection>

        <!-- 2. SUR PLACE -->
        <FormSection title="Arrivée sur place" :recaps="[item.arriveeLe ? fmtDateHeure(item.arriveeLe) : 'en route', delai != null ? fmtDuree(delai) : null]" :default-open="!item.clotureLe">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Arrivée">{{ item.arriveeLe ? fmtDateHeure(item.arriveeLe) : 'en route' }}</ChampLecture>
            <ChampLecture libelle="Délai d'arrivée">
              <span v-if="delai != null" :class="delai > store.objectifsMobile.delaiMaxMinutes ? 'text-danger font-semibold' : 'text-success font-semibold'">{{ fmtDuree(delai) }}</span>
              <span v-else>-</span>
              <span class="text-xs text-muted-foreground"> · cible ≤ {{ fmtDuree(store.objectifsMobile.delaiMaxMinutes) }}</span>
            </ChampLecture>
          </div>
          <button v-if="!item.arriveeLe && !item.clotureLe" :class="F.btnPrimary" class="mt-4" @click="store.arriveeMobile(item.id)">L'équipe est arrivée sur place</button>
        </FormSection>

        <!-- 3. CLÔTURE -->
        <FormSection title="Clôture" :recaps="[item.clotureLe ? (item.resolu ? 'résolue' : 'non résolue') : 'en cours']" :default-open="true">
          <template v-if="item.clotureLe">
            <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
              <ChampLecture libelle="Clôturée le">{{ fmtDateHeure(item.clotureLe) }}</ChampLecture>
              <ChampLecture libelle="Résultat">{{ item.resolu ? 'Résolue sur place' : 'Non résolue' }}</ChampLecture>
              <ChampLecture v-if="item.testsRealises != null" libelle="Tests réalisés">{{ item.testsRealises }}</ChampLecture>
              <ChampLecture v-if="item.testsRealises != null" libelle="Tests positifs"><span :class="item.testsPositifs ? 'text-danger font-semibold' : 'text-success'">{{ item.testsPositifs ?? 0 }}</span></ChampLecture>
              <ChampLecture v-if="item.observation" libelle="Observation" large>{{ item.observation }}</ChampLecture>
            </div>
            <div v-if="ot" class="mt-4">
              <div class="flex items-start gap-2.5 bg-info-bg text-info rounded-lg px-3.5 py-2.5 mb-3">
                <Wrench class="w-4 h-4 shrink-0 mt-px" />
                <p class="text-xs leading-relaxed">Ordre de travail <strong class="font-mono">{{ ot.reference }}</strong> ouvert, statut : {{ LIB_STATUT_OT[ot.statut] }}.</p>
              </div>
              <button :class="F.btnOutline" @click="voirOT">Voir l'ordre de travail</button>
            </div>
          </template>
          <template v-else>
            <div v-if="estControle" class="grid grid-cols-2 gap-3 mb-3">
              <div :class="F.field"><label :class="F.fieldLabel">Tests réalisés *</label><input v-model.number="cloture.testsRealises" type="number" min="0" step="1" :class="F.fieldInput" /></div>
              <div :class="F.field"><label :class="F.fieldLabel">Dont positifs</label><input v-model.number="cloture.testsPositifs" type="number" min="0" step="1" :class="F.fieldInput" /></div>
            </div>
            <div :class="F.field" class="mb-3"><label :class="F.fieldLabel">Observation</label><textarea v-model="cloture.observation" rows="2" :class="F.fieldTextarea" placeholder="Ce qui a été constaté et fait sur place…"></textarea></div>
            <label v-if="item.vehiculeId && !estControle" class="flex items-center gap-1.5 text-[13px] cursor-pointer mb-3"><input v-model="cloture.ouvrirOT" type="checkbox" class="accent-primary" /> Ouvrir un ordre de travail si l'intervention n'est pas résolue</label>
            <p v-if="erreur" class="flex items-center gap-1.5 text-[12px] text-danger mb-3"><TriangleAlert class="w-3.5 h-3.5" /> {{ erreur }}</p>
            <div class="flex gap-2 flex-wrap">
              <button :class="F.btnPrimary" @click="cloturer(true)">Clôturer : résolue</button>
              <button :class="F.btnOutline" @click="cloturer(false)">Clôturer : non résolue</button>
            </div>
          </template>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
