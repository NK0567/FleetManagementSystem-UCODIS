<script setup lang="ts">
/** Fiche d'une immobilisation : cause, durée, coût et levée (FMS-MA-07). */
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Wrench, TriangleAlert, CircleCheck } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import ChampLecture from './ChampLecture.vue'
import MentionSimulation from './MentionSimulation.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useCodificationIndispoStore } from '../../stores/codificationIndispo'
import { LIB_FAMILLE_INDISPO, LIB_STATUT_OT } from '../../types/maintenance'
import type { Indisponibilite, FamilleIndispo } from '../../types/maintenance'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as F from '../../lib/formClasses'

const props = defineProps<{ indisponibilites: Indisponibilite[]; indispoId: string }>()
const emit = defineEmits<{ close: []; creer: [] }>()

const store = useMaintenanceStore()
const codif = useCodificationIndispoStore()
const router = useRouter()

const idCourant = ref(props.indispoId)
const item = computed(() => store.indisponibilites.find(i => i.id === idCourant.value) ?? null)
const index = computed(() => props.indisponibilites.findIndex(i => i.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.indisponibilites.length - 1)
const sidebarItems = computed(() => props.indisponibilites.map(i => ({ no: i.id, label: `${i.vehiculePlaque} · ${i.code}` })))
function naviguer(delta: number) { const i = props.indisponibilites[index.value + delta]; if (i) idCourant.value = i.id }

const CLS_FAMILLE: Record<FamilleIndispo, string> = {
  technique: 'bg-danger-bg text-danger', reglementaire: 'bg-warning-bg text-warning',
  administrative: 'bg-info-bg text-info', humaine: 'bg-primary/10 text-primary',
}
const fmtAr = (n: number) => n.toLocaleString('fr-FR') + ' Ar'
const optCodes = computed<DropdownItem[]>(() => codif.codes.map(c => ({ id: c.code, label: `${c.code} · ${c.libelle}`, sublabel: LIB_FAMILLE_INDISPO[c.famille] })))
const ot = computed(() => item.value?.ordreTravailId ? store.getById(item.value.ordreTravailId) : null)
function voirOT() { if (ot.value) router.push({ name: 'maintenance-ordres', query: { ot: ot.value.id } }) }

const code = ref('')
const message = ref<{ ok: boolean; texte: string } | null>(null)
watch(item, v => { code.value = v?.code ?? '' }, { immediate: true })
watch(idCourant, () => { message.value = null })
function qualifier() {
  if (!item.value) return
  if (!code.value) { message.value = { ok: false, texte: 'Choisissez une cause.' }; return }
  if (code.value === item.value.code) { message.value = null; return }
  store.qualifierIndispo(item.value.id, code.value)
  message.value = { ok: true, texte: 'Cause mise à jour.' }
}
function lever() {
  if (!item.value || item.value.fin || item.value.ordreTravailId) return
  if (!confirm(`Lever l'immobilisation de ${item.value.vehiculePlaque} ? Le véhicule redevient disponible.`)) return
  store.leverIndispo(item.value.id)
  message.value = { ok: true, texte: 'Immobilisation levée, véhicule disponible.' }
}
</script>

<template>
  <CardModalShell
    v-if="item"
    :page-title="`Immobilisation · ${item.vehiculePlaque}`"
    :page-number="item.id"
    banner-label="Maintenance · Immobilisations"
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
      <span class="text-xs font-mono font-bold px-2.5 py-0.5 rounded" :class="CLS_FAMILLE[item.famille]">{{ item.code }}</span>
      <span class="text-xs font-medium px-2.5 py-0.5 rounded-full" :class="item.fin ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ item.fin ? 'Levée' : 'En cours' }}</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="message" class="flex items-center gap-2 rounded-lg px-3.5 py-2.5 mb-3 text-xs" :class="message.ok ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">
          <CircleCheck v-if="message.ok" class="w-4 h-4 shrink-0" /><TriangleAlert v-else class="w-4 h-4 shrink-0" /> {{ message.texte }}
        </div>

        <!-- 1. IMMOBILISATION -->
        <FormSection title="Immobilisation" :recaps="[item.vehiculePlaque, `${store.dureeIndispo(item)} jour(s)`]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Véhicule" mono>{{ item.vehiculePlaque }}</ChampLecture>
            <ChampLecture libelle="Durée">{{ store.dureeIndispo(item) }} jour(s)</ChampLecture>
            <ChampLecture libelle="Début">{{ fmtDateHeure(item.debut) }}</ChampLecture>
            <ChampLecture libelle="Fin">{{ item.fin ? fmtDateHeure(item.fin) : 'en cours' }}</ChampLecture>
            <ChampLecture v-if="item.commentaire" libelle="Commentaire" large>{{ item.commentaire }}</ChampLecture>
          </div>
        </FormSection>

        <!-- 2. CAUSE -->
        <FormSection title="Cause" :recaps="[`${item.code} · ${codif.libelleDuCode(item.code)}`, LIB_FAMILLE_INDISPO[item.famille]]" :default-open="true">
          <div class="grid grid-cols-[1fr_auto] gap-3 items-end max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Cause de l'immobilisation</label><SearchableDropdown v-model="code" :items="optCodes" placeholder="Choisir…" /></div>
            <button :class="F.btnPrimary" @click="qualifier">Qualifier</button>
          </div>
          <p class="text-xs text-muted-foreground mt-2">Famille : {{ LIB_FAMILLE_INDISPO[item.famille] }}</p>
        </FormSection>

        <!-- 3. COÛT -->
        <FormSection title="Coût" :recaps="[store.coutIndispo(item) != null ? fmtAr(store.coutIndispo(item)!) : 'non valorisé']">
          <div v-if="store.coutIndispo(item) != null" class="bg-danger-bg rounded-lg px-3.5 py-2.5">
            <MentionSimulation groupe="immobilisation" texte="coût journalier simulé" class="mb-1" />
            <p class="text-lg font-bold leading-none text-danger">{{ fmtAr(store.coutIndispo(item)!) }}</p>
            <p class="text-xs text-danger/80 mt-1">{{ store.dureeIndispo(item) }} jour(s) × {{ fmtAr(store.coutJournalierDe(item)!) }} de manque à gagner.</p>
          </div>
          <p v-else class="text-xs text-muted-foreground">Coût journalier d'immobilisation non renseigné dans Paramètres de l'atelier.</p>
        </FormSection>

        <!-- 4. LEVÉE -->
        <FormSection title="Levée" :recaps="[item.fin ? 'levée' : 'en cours']" :default-open="!item.fin">
          <template v-if="item.fin"><p class="text-sm text-foreground">Levée le {{ fmtDateHeure(item.fin) }}.</p></template>
          <template v-else-if="ot">
            <div class="flex items-start gap-2.5 bg-info-bg text-info rounded-lg px-3.5 py-2.5 mb-3">
              <Wrench class="w-4 h-4 shrink-0 mt-px" />
              <p class="text-xs leading-relaxed">Liée à l'ordre de travail <strong class="font-mono">{{ ot.reference }}</strong> ({{ LIB_STATUT_OT[ot.statut] }}) : elle se lève à sa clôture.</p>
            </div>
            <button :class="F.btnOutline" @click="voirOT">Voir l'ordre de travail</button>
          </template>
          <button v-else :class="F.btnPrimary" @click="lever">Lever l'immobilisation</button>
          <p v-if="item.fin && ot" class="text-xs text-muted-foreground mt-2">Ordre de travail <span class="font-mono">{{ ot.reference }}</span></p>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
