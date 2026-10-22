<script setup lang="ts">
/** Fiche d'une infraction et son traitement jusqu'à la clôture (FMS-SC-05). */
import { ref, computed, watch } from 'vue'
import { CircleCheck, Radio, TriangleAlert } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import ChampLecture from '../maintenance/ChampLecture.vue'
import { useInfractionsStore, LIB_STATUT_INFRACTION, LIB_GRAVITE_INFRACTION } from '../../stores/infractions'
import { useFormationsStore } from '../../stores/formations'
import { useAuthStore } from '../../stores/auth'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as F from '../../lib/formClasses'

const props = defineProps<{ ids: string[]; infractionId: string }>()
const emit = defineEmits<{ close: [] }>()
const store = useInfractionsStore()
const formations = useFormationsStore()
const auth = useAuthStore()
const moi = computed(() => auth.user?.nom ?? 'Responsable')
const idCourant = ref(props.infractionId)
const item = computed(() => store.getById(idCourant.value) ?? null)
const index = computed(() => props.ids.indexOf(idCourant.value))
const sidebarItems = computed(() => props.ids.map(id => ({ no: store.getById(id)?.reference ?? id, label: store.getById(id)?.vehiculePlaque })))
function naviguer(d: number) { const c = props.ids[index.value + d]; if (c) idCourant.value = c }

const erreur = ref(''); const succes = ref('')
const suite = ref(''); const commentaire = ref('')
watch(idCourant, () => { erreur.value = ''; succes.value = ''; suite.value = ''; commentaire.value = '' })
function resultat(r: { ok: boolean; motif?: string }, msg: string) { erreur.value = r.ok ? '' : r.motif ?? ''; succes.value = r.ok ? msg : ''; return r.ok }
const optSuites = computed<DropdownItem[]>(() => store.suites.filter(s => s.actif).map(s => ({ id: s.code, label: s.libelle })))
function prendre() { if (item.value) resultat(store.prendreEnCharge(item.value.id, moi.value), 'Infraction prise en charge.') }
function cloturer() {
  if (!item.value) return
  if (!resultat(store.cloturer(item.value.id, suite.value, commentaire.value, moi.value), 'Infraction clôturée.')) return
  // Une suite qui déclenche une formation la programme pour le conducteur.
  if (store.suiteDe(item.value)?.declencheFormation && item.value.conducteurId)
    formations.declencher({ conducteurId: item.value.conducteurId, theme: `Suite à l'infraction ${item.value.reference} : ${store.libelleType(item.value.type)}`, motif: 'infraction', origineRef: item.value.reference }, moi.value)
}
</script>

<template>
  <CardModalShell v-if="item" :page-title="store.libelleType(item.type)" :page-number="item.reference" banner-label="Flotte · Infractions" :is-edit-mode="false"
    :sidebar-items="sidebarItems" :current-no="item.reference" :has-prev="index > 0" :has-next="index >= 0 && index < ids.length - 1" hide-action-bar
    @close="emit('close')" @go-prev="naviguer(-1)" @go-next="naviguer(1)"
    @select-sidebar="no => { const i = store.infractions.find(x => x.reference === no); if (i) idCourant = i.id }">
    <template #title-badges>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" :class="LIB_STATUT_INFRACTION[item.statut].cls">{{ LIB_STATUT_INFRACTION[item.statut].label }}</span>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" :class="LIB_GRAVITE_INFRACTION[item.gravite].cls">{{ LIB_GRAVITE_INFRACTION[item.gravite].label }}</span>
    </template>
    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>
        <FormSection title="Infraction" :recaps="[item.vehiculePlaque, item.conducteurNom ?? '']">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Date et heure">{{ fmtDateHeure(item.date) }}</ChampLecture>
            <ChampLecture libelle="Lieu">{{ item.lieu }}</ChampLecture>
            <ChampLecture libelle="Véhicule" mono>{{ item.vehiculePlaque }}</ChampLecture>
            <ChampLecture libelle="Conducteur">{{ item.conducteurNom ?? 'non identifié' }}</ChampLecture>
            <ChampLecture libelle="Origine"><span class="inline-flex items-center gap-1.5"><Radio v-if="item.source === 'telematique'" class="w-3.5 h-3.5" />{{ item.source === 'telematique' ? 'Remontée par la télématique' : 'Saisie manuelle' }}</span></ChampLecture>
            <ChampLecture libelle="Amende">{{ item.montantAmendeAr ? item.montantAmendeAr.toLocaleString('fr-FR') + ' ' + $devise() : '-' }}</ChampLecture>
            <ChampLecture libelle="Détail" large>{{ item.detail || '-' }}</ChampLecture>
          </div>
        </FormSection>
        <FormSection title="Traitement" :recaps="[item.responsable ?? 'non pris en charge']" :default-open="true">
          <template v-if="item.statut === 'cloturee'">
            <div class="grid grid-cols-2 gap-x-6 gap-y-4">
              <ChampLecture libelle="Suite donnée">{{ store.libelleSuite(item) }}</ChampLecture>
              <ChampLecture libelle="Traitée par">{{ item.responsable }}</ChampLecture>
              <ChampLecture libelle="Explication" large>{{ item.commentaireSuite }}</ChampLecture>
            </div>
          </template>
          <template v-else>
            <button v-if="item.statut === 'nouvelle'" :class="F.btnOutline" class="mb-3" @click="prendre">Prendre en charge</button>
            <div class="grid grid-cols-2 gap-x-6 gap-y-3 max-sm:grid-cols-1">
              <div :class="F.field"><label :class="F.fieldLabel">Suite donnée *</label><SearchableDropdown v-model="suite" :items="optSuites" placeholder="Choisir…" /></div>
              <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Explication *</label><textarea v-model="commentaire" rows="2" :class="F.fieldTextarea"></textarea></div>
            </div>
            <button :class="F.btnPrimary" class="mt-3" @click="cloturer">Clôturer l'infraction</button>
          </template>
        </FormSection>
        <FormSection title="Historique" :recaps="[`${item.historique.length} événement(s)`]" :default-open="false">
          <div v-for="(h, i) in item.historique" :key="i" class="text-xs border-b border-border/60 py-1.5">{{ h.action }}<div class="text-[11px] text-muted-foreground">{{ fmtDateHeure(h.le) }} · {{ h.par }}</div></div>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
