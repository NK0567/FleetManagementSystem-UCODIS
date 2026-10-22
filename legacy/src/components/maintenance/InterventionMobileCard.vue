<script setup lang="ts">
/** Fiche d'une intervention de l'équipe mobile : position, équipe, heures de départ et d'arrivée, clôture. */
import { ref, computed, watch } from 'vue'
import { maintenant } from '../../utils/horloge'
import { useRouter } from 'vue-router'
import { TriangleAlert, Wrench } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import ChampLecture from './ChampLecture.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { LIB_STATUT_OT } from '../../types/maintenance'
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
const sidebarItems = computed(() => props.interventions.map(i => ({ no: i.reference, label: i.vehiculePlaque })))
function naviguer(delta: number) { const i = props.interventions[index.value + delta]; if (i) idCourant.value = i.id }
function selectSidebar(no: string) { const i = props.interventions.find(x => x.reference === no); if (i) idCourant.value = i.id }

const delai = computed(() => item.value?.arriveeLe ? Math.round((+new Date(item.value.arriveeLe) - +new Date(item.value.declencheLe)) / 60_000) : null)
function fmtDuree(minutes: number) { const h = Math.floor(minutes / 60); const m = minutes % 60; return h > 0 ? `${h} h ${m > 0 ? m + ' min' : ''}`.trim() : `${m} min` }
const ot = computed(() => item.value?.ordreTravailId ? store.getById(item.value.ordreTravailId) : null)
function voirOT() { if (ot.value) router.push({ name: 'maintenance-ordres', query: { ot: ot.value.id } }) }

const cloture = ref({ observation: '', ouvrirOT: true })
const erreur = ref('')
const succes = ref('')
/* Heures saisissables : préremplies, modifiables jusqu'à la clôture. */
const local = (iso?: string) => { const d = iso ? new Date(iso) : maintenant(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const heures = ref({ departLe: '', arriveeLe: '' })
function chargerHeures() { heures.value = { departLe: local(item.value?.declencheLe), arriveeLe: item.value?.arriveeLe ? local(item.value.arriveeLe) : local() } }
watch(idCourant, () => { erreur.value = ''; succes.value = ''; cloture.value = { observation: '', ouvrirOT: true }; chargerHeures() })
chargerHeures()

function enregistrerHeures(avecArrivee: boolean) {
  if (!item.value) return
  const r = store.majHeuresMobile(item.value.id, { departLe: heures.value.departLe, arriveeLe: avecArrivee ? heures.value.arriveeLe : undefined })
  erreur.value = r.ok ? '' : r.motif ?? ''
  succes.value = r.ok ? 'Heures enregistrées.' : ''
}
/* Mission de contrôle : contrôles réalisés, cas positifs et commentaire. */
const estControle = computed(() => !!item.value && store.estMissionControle(item.value.type))
const ctrl = ref<{ nbControles: number | null; nbPositifs: number | null; commentaire: string }>({ nbControles: null, nbPositifs: null, commentaire: '' })
function chargerControles() { ctrl.value = { nbControles: item.value?.nbControles ?? null, nbPositifs: item.value?.nbPositifs ?? null, commentaire: item.value?.commentaireControles ?? '' } }
watch(idCourant, chargerControles)
chargerControles()
function enregistrerControles() {
  if (!item.value) return
  const n = (v: number | null | string) => v === null || v === '' ? null : Number(v)
  const r = store.saisirControlesMobile(item.value.id, n(ctrl.value.nbControles), n(ctrl.value.nbPositifs), ctrl.value.commentaire)
  erreur.value = r.ok ? '' : r.motif ?? ''
  succes.value = r.ok ? 'Contrôles enregistrés.' : ''
}
function cloturer(resolu: boolean) {
  if (!item.value) return
  const r = store.cloturerMobile(item.value.id, resolu, cloture.value.observation, !resolu && cloture.value.ouvrirOT)
  erreur.value = r.ok ? '' : (r.motif ?? '')
  succes.value = ''
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
      <span class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-neutral-bg text-neutral">{{ store.libelleMission(item.type) }}</span>
      <span v-if="!item.clotureLe" class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-warning-bg text-warning">{{ item.arriveeLe ? 'Sur place' : 'En route' }}</span>
      <span v-else-if="item.resolu" class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-success-bg text-success">Résolue</span>
      <span v-else class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-danger-bg text-danger">Non résolue</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <!-- 1. DÉCLENCHEMENT -->
        <div v-if="erreur" class="flex items-center gap-1.5 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs">{{ succes }}</div>

        <FormSection title="Intervention" :recaps="[item.vehiculePlaque, item.lieu]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Type">{{ store.libelleMission(item.type) }}</ChampLecture>
            <ChampLecture libelle="Camion" mono>{{ item.vehiculePlaque }}</ChampLecture>
            <ChampLecture libelle="Position du camion" large>{{ item.lieu }}</ChampLecture>
            <ChampLecture libelle="Équipe envoyée"><span v-for="m in item.equipe" :key="m" class="block">{{ m }}</span></ChampLecture>
          </div>
        </FormSection>

        <!-- 2. DÉPART ET ARRIVÉE -->
        <FormSection title="Départ et arrivée" :recaps="[`départ ${fmtDateHeure(item.declencheLe)}`, item.arriveeLe ? `arrivée ${fmtDateHeure(item.arriveeLe)}` : 'en route', delai != null ? fmtDuree(delai) : null]" :default-open="!item.clotureLe">
          <div v-if="item.clotureLe" class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Départ">{{ fmtDateHeure(item.declencheLe) }}</ChampLecture>
            <ChampLecture libelle="Arrivée">{{ item.arriveeLe ? fmtDateHeure(item.arriveeLe) : '-' }}</ChampLecture>
            <ChampLecture libelle="Délai d'arrivée">{{ delai != null ? fmtDuree(delai) : '-' }}</ChampLecture>
          </div>
          <template v-else>
            <div class="grid grid-cols-3 gap-3 items-end max-sm:grid-cols-1">
              <div :class="F.field"><label :class="F.fieldLabel">Départ *</label><input v-model="heures.departLe" type="datetime-local" :class="F.fieldInput" /></div>
              <div :class="F.field"><label :class="F.fieldLabel">Arrivée</label><input v-model="heures.arriveeLe" type="datetime-local" :class="F.fieldInput" /></div>
              <ChampLecture libelle="Délai d'arrivée">{{ delai != null ? fmtDuree(delai) : '-' }}</ChampLecture>
            </div>
            <div class="flex gap-2 flex-wrap mt-3">
              <button :class="F.btnOutline" @click="enregistrerHeures(false)">Enregistrer le départ</button>
              <button :class="F.btnPrimary" @click="enregistrerHeures(true)">Enregistrer l'arrivée</button>
            </div>
          </template>
        </FormSection>

        <!-- 3. CONTRÔLES (mission de contrôle) -->
        <FormSection v-if="estControle" title="Contrôles réalisés" :recaps="[item.nbControles != null ? `${item.nbControles} contrôles` : 'à renseigner', item.nbControles != null ? `${item.nbPositifs ?? 0} cas positifs` : null]" :default-open="true">
          <div v-if="item.clotureLe" class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Contrôles réalisés">{{ item.nbControles ?? '-' }}</ChampLecture>
            <ChampLecture libelle="Cas positifs">{{ item.nbPositifs ?? '-' }}</ChampLecture>
            <ChampLecture v-if="item.commentaireControles" libelle="Commentaire" large>{{ item.commentaireControles }}</ChampLecture>
          </div>
          <template v-else>
            <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <div :class="F.field"><label :class="F.fieldLabel">Contrôles réalisés *</label><input v-model.number="ctrl.nbControles" type="number" min="0" :class="F.fieldInput" /></div>
              <div :class="F.field"><label :class="F.fieldLabel">Cas positifs *</label><input v-model.number="ctrl.nbPositifs" type="number" min="0" :class="F.fieldInput" /></div>
              <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Commentaire</label><textarea v-model="ctrl.commentaire" rows="2" :class="F.fieldTextarea"></textarea></div>
            </div>
            <button :class="F.btnPrimary" class="mt-3" @click="enregistrerControles">Enregistrer les contrôles</button>
          </template>
        </FormSection>

        <!-- 4. CLÔTURE -->
        <FormSection title="Clôture" :recaps="[item.clotureLe ? (item.resolu ? 'résolue' : 'non résolue') : 'en cours']" :default-open="true">
          <template v-if="item.clotureLe">
            <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
              <ChampLecture libelle="Clôturée le">{{ fmtDateHeure(item.clotureLe) }}</ChampLecture>
              <ChampLecture libelle="Résultat">{{ item.resolu ? 'Résolue sur place' : 'Non résolue' }}</ChampLecture>
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
            <div :class="F.field" class="mb-3"><label :class="F.fieldLabel">Observation</label><textarea v-model="cloture.observation" rows="2" :class="F.fieldTextarea" placeholder="Ce qui a été constaté et fait sur place…"></textarea></div>
            <label class="flex items-center gap-1.5 text-[13px] cursor-pointer mb-3"><input v-model="cloture.ouvrirOT" type="checkbox" class="accent-primary" /> Ouvrir un ordre de travail si l'intervention n'est pas résolue</label>
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
