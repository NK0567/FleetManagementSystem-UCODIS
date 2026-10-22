<script setup lang="ts">
/** Fiche d'une alerte : prise en charge, traitement, escalade et historique (FMS-SC-08, SC-09). */
import { LIBELLE_ROLE } from '../../stores/auth'
const libRole = (r?: string) => r ? (LIBELLE_ROLE as Record<string, string>)[r] ?? r : ''
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CircleCheck, TriangleAlert } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import ChampLecture from '../maintenance/ChampLecture.vue'
import { useAlertesStore, LIB_CATEGORIE_ALERTE, LIB_STATUT_ALERTE } from '../../stores/alertes'
import { useAuthStore } from '../../stores/auth'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as F from '../../lib/formClasses'

const props = defineProps<{ cles: string[]; cle: string }>()
const emit = defineEmits<{ close: [] }>()
const store = useAlertesStore()
const auth = useAuthStore()
const router = useRouter()
const cleCourante = ref(props.cle)
const item = computed(() => store.etats[cleCourante.value] ?? null)
const index = computed(() => props.cles.indexOf(cleCourante.value))
/* Navigation par l'objet de l'alerte plutôt que par un numéro sans signification. */
const noms = computed(() => {
  const vus = new Map<string, number>()
  return props.cles.map(c => {
    const base = store.etats[c]?.message ?? c
    const n = (vus.get(base) ?? 0) + 1; vus.set(base, n)
    return n > 1 ? `${base} (${n})` : base
  })
})
const sidebarItems = computed(() => props.cles.map((c, i) => ({ no: noms.value[i]!, label: store.etats[c]?.titre })))
function naviguer(d: number) { const c = props.cles[index.value + d]; if (c) cleCourante.value = c }
const erreur = ref(''); const succes = ref(''); const commentaire = ref('')
watch(cleCourante, () => { erreur.value = ''; succes.value = ''; commentaire.value = '' })
function res(r: { ok: boolean; motif?: string }, m: string) { erreur.value = r.ok ? '' : r.motif ?? ''; succes.value = r.ok ? m : '' }
const moi = computed(() => auth.user?.nom ?? 'Utilisateur')
function prendre() { if (item.value) res(store.prendreEnCharge(item.value.cle, moi.value), 'Alerte prise en charge.') }
function traiter() { if (item.value) res(store.traiter(item.value.cle, moi.value, commentaire.value), 'Alerte traitée.') }
function ouvrirElement() { if (item.value && router.hasRoute(item.value.route)) { emit('close'); router.push({ name: item.value.route, query: item.value.query }) } }
const regle = computed(() => item.value ? store.regles[item.value.categorie] : undefined)
</script>

<template>
  <CardModalShell v-if="item" :page-title="item.titre" banner-label="Flotte · Alertes" :is-edit-mode="false"
    :sidebar-items="sidebarItems" :current-no="noms[index] ?? null" :has-prev="index > 0" :has-next="index >= 0 && index < cles.length - 1" hide-action-bar
    @close="emit('close')" @go-prev="naviguer(-1)" @go-next="naviguer(1)" @select-sidebar="no => { const c = cles[noms.indexOf(no)]; if (c) cleCourante = c }">
    <template #title-badges>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" :class="LIB_STATUT_ALERTE[item.statut].cls">{{ LIB_STATUT_ALERTE[item.statut].label }}</span>
      <span v-if="item.escaladeeLe" class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-bg text-danger">Escaladée</span>
    </template>
    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>
        <FormSection title="Alerte" :recaps="[LIB_CATEGORIE_ALERTE[item.categorie]]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Objet" large>{{ item.message }}</ChampLecture>
            <ChampLecture libelle="Catégorie">{{ LIB_CATEGORIE_ALERTE[item.categorie] }}</ChampLecture>
            <ChampLecture libelle="Situation depuis">{{ fmtDateHeure(item.depuis) }}</ChampLecture>
            <ChampLecture libelle="Alerte émise le">{{ fmtDateHeure(item.emiseLe) }}</ChampLecture>
            <ChampLecture libelle="Escalade">{{ item.escaladeeLe ? `le ${fmtDateHeure(item.escaladeeLe)} vers ${libRole(item.escaladeeVers ?? regle?.niveau)}` : `après ${regle?.delaiHeures} h sans traitement, vers ${libRole(regle?.niveau)}` }}</ChampLecture>
          </div>
          <button :class="F.btnOutline" class="mt-3" @click="ouvrirElement">Ouvrir l'écran concerné</button>
        </FormSection>
        <FormSection title="Traitement" :recaps="[LIB_STATUT_ALERTE[item.statut].label]" :default-open="true">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 mb-3 max-sm:grid-cols-1">
            <ChampLecture libelle="Prise en charge">{{ item.prisePar ? `${item.prisePar}, le ${fmtDateHeure(item.priseLe!)}` : '-' }}</ChampLecture>
            <ChampLecture libelle="Traitée">{{ item.traiteePar ? `${item.traiteePar}, le ${fmtDateHeure(item.traiteeLe!)}` : item.resolueLe ? `résolue d'elle-même le ${fmtDateHeure(item.resolueLe)}` : '-' }}</ChampLecture>
            <ChampLecture v-if="item.commentaire" libelle="Ce qui a été fait" large>{{ item.commentaire }}</ChampLecture>
          </div>
          <template v-if="item.statut === 'nouvelle' || item.statut === 'prise_en_charge'">
            <button v-if="item.statut === 'nouvelle'" :class="F.btnOutline" class="mb-3" @click="prendre">Prendre en charge</button>
            <div :class="F.field"><label :class="F.fieldLabel">Ce qui a été fait *</label><textarea v-model="commentaire" rows="2" :class="F.fieldTextarea"></textarea></div>
            <button :class="F.btnPrimary" class="mt-3" @click="traiter">Marquer traitée</button>
          </template>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
