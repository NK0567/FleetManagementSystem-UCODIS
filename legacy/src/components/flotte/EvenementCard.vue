<script setup lang="ts">
/** Fiche d'un événement télématique et ses suites : infraction, ordre de travail, classement (FMS-GP-01, GP-03, GP-04). */
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CircleCheck, TriangleAlert } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import ChampLecture from '../maintenance/ChampLecture.vue'
import FleetMap from './FleetMap.vue'
import { useTelematiqueStore, LIB_FAMILLE_EVENEMENT, LIB_SOURCE_EVENEMENT } from '../../stores/telematique'
import { useInfractionsStore } from '../../stores/infractions'
import { useAuthStore } from '../../stores/auth'
import { LIB_GRAVITE } from '../../stores/ecarts'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as F from '../../lib/formClasses'

const props = defineProps<{ ids: string[]; evenementId: string }>()
const emit = defineEmits<{ close: [] }>()
const store = useTelematiqueStore()
const infractions = useInfractionsStore()
const auth = useAuthStore()
const router = useRouter()
const moi = computed(() => auth.user?.nom ?? 'Responsable')
const idCourant = ref(props.evenementId)
const item = computed(() => store.getById(idCourant.value) ?? null)
const def = computed(() => item.value ? store.typeDe(item.value.code) : undefined)
const index = computed(() => props.ids.indexOf(idCourant.value))
const sidebarItems = computed(() => props.ids.map(id => { const e = store.getById(id); return { no: id, label: e ? `${e.plaque} · ${store.libelleType(e.code)}` : id } }))
function naviguer(d: number) { const c = props.ids[index.value + d]; if (c) idCourant.value = c }

const erreur = ref(''); const succes = ref(''); const commentaire = ref('')
watch(idCourant, () => { erreur.value = ''; succes.value = ''; commentaire.value = '' })
function resultat(r: { ok: boolean; motif?: string }, msg: string) { erreur.value = r.ok ? '' : r.motif ?? ''; succes.value = r.ok ? msg : ''; return r.ok }
function ouvrirOT() { if (item.value) { const r = store.ouvrirOrdreTravail(item.value.id, moi.value); resultat(r, `Ordre de travail ${r.ref ?? ''} ouvert.`) } }
function acquitter() { if (item.value) resultat(store.acquitter(item.value.id, moi.value, commentaire.value), 'Classé sans suite.') }
function infraction() { if (item.value) resultat(store.creerInfraction(item.value.id, moi.value), 'Infraction ouverte.') }
const infractionLiee = computed(() => item.value?.infractionId ? infractions.getById(item.value.infractionId) : undefined)
const peutInfraction = computed(() => !!def.value?.typeInfraction && infractions.types.some(t => t.code === def.value?.typeInfraction && t.actif))
function aller(name: string, query: Record<string, string>) { emit('close'); router.push({ name, query }) }
const marqueur = computed(() => item.value?.lat != null && item.value.lng != null
  ? [{ id: item.value.id, lat: item.value.lat, lng: item.value.lng, couleur: '#dc2626', libelle: item.value.plaque, sousTitre: item.value.lieu }] : [])
const valeur = computed(() => item.value?.valeur != null ? `${item.value.valeur} ${item.value.unite ?? ''}`.trim() : '')
</script>

<template>
  <CardModalShell v-if="item" :page-title="store.libelleType(item.code)" :page-number="item.id" banner-label="Flotte · Télématique" :is-edit-mode="false"
    :sidebar-items="sidebarItems" :current-no="item.id" :has-prev="index > 0" :has-next="index >= 0 && index < ids.length - 1" hide-action-bar
    @close="emit('close')" @go-prev="naviguer(-1)" @go-next="naviguer(1)" @select-sidebar="no => { if (store.getById(no)) idCourant = no }">
    <template #title-badges>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{{ LIB_FAMILLE_EVENEMENT[item.famille] }}</span>
      <span v-if="def" class="px-2.5 py-0.5 rounded-full text-xs font-medium" :class="LIB_GRAVITE[def.gravite].cls">{{ LIB_GRAVITE[def.gravite].label }}</span>
    </template>
    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>

        <FormSection title="Événement" :recaps="[item.plaque, fmtDateHeure(item.date)]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Date et heure">{{ fmtDateHeure(item.date) }}<template v-if="item.finLe"> au {{ fmtDateHeure(item.finLe) }}</template></ChampLecture>
            <ChampLecture libelle="Source">{{ LIB_SOURCE_EVENEMENT[item.source] }}</ChampLecture>
            <ChampLecture libelle="Véhicule" mono>{{ item.plaque }}</ChampLecture>
            <ChampLecture libelle="Conducteur">{{ item.conducteurNom ?? 'non identifié' }}</ChampLecture>
            <ChampLecture libelle="Lieu">{{ item.lieu ?? '-' }}</ChampLecture>
            <ChampLecture v-if="valeur" libelle="Mesure">{{ valeur }}</ChampLecture>
            <ChampLecture v-if="item.codeObd" libelle="Code défaut" mono>{{ item.codeObd }}</ChampLecture>
            <ChampLecture v-if="item.detail" libelle="Détail" large>{{ item.detail }}</ChampLecture>
          </div>
          <div v-if="marqueur.length" class="mt-4"><FleetMap :marqueurs="marqueur" :show-legend="false" height="220px" /></div>
          <div class="flex gap-2 flex-wrap mt-3">
            <button :class="F.btnOutline" @click="aller('flotte-carte', { vehicule: item.vehiculeId, du: item.date.slice(0, 10) })">Voir le trajet sur la carte</button>
            <button v-if="item.voyageId" :class="F.btnOutline" @click="aller('flotte-voyages', { voyage: item.voyageId })">Ouvrir le voyage</button>
          </div>
        </FormSection>

        <FormSection v-if="item.famille === 'comportement' || item.famille === 'camera'" title="Suite" :recaps="[infractionLiee ? infractionLiee.reference : 'Aucune infraction']" :default-open="true">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 mb-3 max-sm:grid-cols-1">
            <ChampLecture libelle="Score du conducteur">{{ def?.score ? 'Pris en compte (sécurité routière)' : 'Non pris en compte' }}</ChampLecture>
            <ChampLecture libelle="Infraction">{{ infractionLiee ? `${infractionLiee.reference}, ${infractionLiee.statut === 'cloturee' ? 'clôturée' : 'en cours'}` : '-' }}</ChampLecture>
          </div>
          <button v-if="infractionLiee" :class="F.btnOutline" @click="aller('flotte-infractions', { infraction: infractionLiee.id })">Ouvrir l'infraction</button>
          <button v-else-if="peutInfraction" :class="F.btnPrimary" @click="infraction">Ouvrir une infraction</button>
        </FormSection>

        <FormSection v-if="item.famille === 'defaut' || item.famille === 'signal'" title="Traitement" :recaps="[item.ordreTravailRef ?? (item.acquitte ? 'Classé sans suite' : item.finLe ? 'Rétabli' : 'À traiter')]" :default-open="true">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 mb-3 max-sm:grid-cols-1">
            <ChampLecture v-if="item.famille === 'defaut'" libelle="Ordre de travail" mono>{{ item.ordreTravailRef ?? '-' }}</ChampLecture>
            <ChampLecture v-if="item.acquitte" libelle="Classé sans suite">{{ item.acquitte.par }}, le {{ fmtDateHeure(item.acquitte.le) }}</ChampLecture>
            <ChampLecture v-if="item.acquitte" libelle="Raison" large>{{ item.acquitte.commentaire }}</ChampLecture>
          </div>
          <button v-if="item.ordreTravailRef" :class="F.btnOutline" @click="aller('maintenance-ordres', { ot: item.ordreTravailRef })">Ouvrir l'ordre de travail</button>
          <template v-else-if="!item.acquitte && !(item.famille === 'signal' && item.finLe)">
            <button v-if="item.famille === 'defaut'" :class="F.btnPrimary" class="mb-3" @click="ouvrirOT">Ouvrir un ordre de travail</button>
            <div :class="F.field"><label :class="F.fieldLabel">Raison du classement sans suite *</label><textarea v-model="commentaire" rows="2" :class="F.fieldTextarea"></textarea></div>
            <button :class="F.btnOutline" class="mt-3" @click="acquitter">Classer sans suite</button>
          </template>
        </FormSection>

        <FormSection title="Historique" :recaps="[`${item.historique.length} action(s)`]" :default-open="false">
          <p v-if="!item.historique.length" class="text-xs text-muted-foreground">Déduit de la position GPS.</p>
          <div v-for="(h, i) in item.historique" :key="i" class="text-xs border-b border-border/60 py-1.5">
            <span class="text-muted-foreground">{{ fmtDateHeure(h.le) }}</span> · {{ h.par }} · {{ h.action }}
          </div>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
