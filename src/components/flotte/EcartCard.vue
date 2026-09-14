<script setup lang="ts">
/**
 * Fiche d'écart d'itinéraire, reprise de la fiche d'écart du socle FMS :
 * même coquille CardModalShell, mêmes sections, même logique de
 * qualification. Le lien sur le nom du chauffeur ouvre son tableau de
 * bord personnel (US demandée) au lieu de rester un texte simple.
 */
import { ref, computed } from 'vue'
import { AlertCircle, Info } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import FleetMap from './FleetMap.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useEcartsStore, LIB_TYPE_ECART, LIB_NATURE, LIB_GRAVITE } from '../../stores/ecarts'
import { useVoyagesStore } from '../../stores/voyages'
import { useAuthStore } from '../../stores/auth'
import { fmtDateHeure } from '../../utils/voyageUtils'
import type { EcartItineraire, NatureEcart, DecisionEcart } from '../../types'
import * as F from '../../lib/formClasses'
import * as Lc from '../../lib/listClasses'

const props = defineProps<{ ecarts: EcartItineraire[]; ecartId: string }>()
const emit = defineEmits<{ close: []; ouvrirVoyage: [id: string]; voirConducteur: [id: string] }>()

const store = useEcartsStore()
const voyagesStore = useVoyagesStore()
const auth = useAuthStore()

const idCourant = ref(props.ecartId)
const item = computed<EcartItineraire | null>(() => store.getById(idCourant.value) ?? props.ecarts.find(e => e.id === idCourant.value) ?? null)

const index = computed(() => props.ecarts.findIndex(e => e.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.ecarts.length - 1)
const sidebarItems = computed(() => props.ecarts.map(e => ({ no: e.id, label: `${e.vehiculePlaque} · ${LIB_TYPE_ECART[e.type]}` })))
function naviguer(delta: number) {
  const cible = props.ecarts[index.value + delta]
  if (cible) idCourant.value = cible.id
}
function selectSidebar(no: string) {
  const cible = props.ecarts.find(e => e.id === no)
  if (cible) idCourant.value = cible.id
}

const LIB_DECISION: Record<DecisionEcart, string> = {
  classe: 'Classement sans suite',
  avertissement: 'Avertissement',
  sanction: 'Signalement à la Direction',
}

const OPTIONS_NATURE: { value: Exclude<NatureEcart, 'a_qualifier'>; label: string; aide: string }[] = [
  { value: 'autorisee', label: 'Déviation autorisée', aide: "Consécutive à une instruction enregistrée de l'exploitation ou du client." },
  { value: 'subie', label: 'Déviation subie', aide: 'Route coupée, accident, barrage, intempérie, panne, consigne de sécurité.' },
  { value: 'non_justifiee', label: 'Déviation non justifiée', aide: 'Aucune justification recevable dans le délai. Devient une infraction du conducteur.' },
]

const nature = ref<Exclude<NatureEcart, 'a_qualifier'>>('subie')
const motif = ref('')
const decision = ref<DecisionEcart>('avertissement')
const erreur = ref('')
const saisieJustif = ref('')

/** Points de la séquence prévue du trajet (référence), pour la carte comparative. */
const tracePrevu = computed(() => {
  if (!item.value) return []
  const v = voyagesStore.getById(item.value.voyageId)
  return v?.etapes.map(e => ({ lat: e.lat, lng: e.lng })) ?? []
})
/** Le tracé réel n'est pas mesuré (aucun boîtier) : seul le point de l'écart est connu. */
const marqueurEcart = computed(() => {
  if (!item.value) return []
  return [{ id: 'ecart', lat: item.value.lat, lng: item.value.lng, couleur: '#dc2626', libelle: item.value.lieu ?? 'Écart relevé', sousTitre: 'Position de l\u2019écart' }]
})

const mesures = computed(() => {
  const e = item.value
  if (!e) return []
  return [
    { label: 'Durée hors séquence', value: e.dureeMin ? fmtDuree(e.dureeMin) : '-', cls: (e.dureeMin ?? 0) > 30 ? 'text-danger' : 'text-foreground' },
    { label: 'Distance parcourue', value: e.distanceKm != null ? `${e.distanceKm} km` : '-', cls: 'text-foreground' },
    { label: 'Écart latéral maximal', value: e.ecartLateralMaxM != null ? `${(e.ecartLateralMaxM / 1000).toFixed(1)} km` : '-', cls: (e.ecartLateralMaxM ?? 0) > 5000 ? 'text-danger' : 'text-foreground' },
    { label: 'Gravité retenue', value: LIB_GRAVITE[e.gravite].label, cls: 'text-muted-foreground' },
  ]
})
function fmtDuree(min: number) {
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60 ? (min % 60) + ' min' : ''}`.trim() : `${min} min`
}

const chronologie = computed(() => {
  const e = item.value
  if (!e) return []
  const out: { titre: string; heure: string; detail?: string; cls: string }[] = []
  out.push({ titre: 'Écart détecté', heure: fmtHeure(e.detecteLe), detail: LIB_TYPE_ECART[e.type], cls: 'bg-warning' })
  voyagesStore.arretsDuVoyage(e.voyageId).filter(a => !a.dansSiteDeclare).forEach(a => out.push({
    titre: `Arrêt non planifié · ${fmtDuree(a.dureeMin)}`, heure: fmtHeure(a.debut), detail: a.lieu,
    cls: a.justifie ? 'bg-success' : 'bg-danger',
  }))
  if (e.justifieLe) out.push({ titre: 'Justification déposée par le chauffeur', heure: fmtDateHeure(e.justifieLe), cls: 'bg-info' })
  if (e.qualifieLe) out.push({ titre: `Qualifié · ${LIB_NATURE[e.nature].label}`, heure: fmtDateHeure(e.qualifieLe), detail: e.qualifiePar, cls: 'bg-foreground' })
  return out
})
function fmtHeure(iso: string) { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }

const dateLimite = computed(() => (item.value ? new Date(+new Date(item.value.detecteLe) + 24 * 3_600_000).toISOString() : ''))

function deposerJustification() {
  if (!item.value || !saisieJustif.value.trim()) return
  store.justifier(item.value.id, saisieJustif.value.trim())
  saisieJustif.value = ''
}
function qualifier() {
  erreur.value = ''
  if (!item.value) return
  if (!motif.value.trim()) { erreur.value = "Le motif est obligatoire : c'est lui qui rend le dossier opposable."; return }
  store.qualifier(item.value.id, nature.value, motif.value.trim(), auth.user?.nom ?? 'Responsable Flotte',
    nature.value === 'non_justifiee' ? decision.value : 'classe')
  motif.value = ''
}

const optDecision: DropdownItem[] = [
  { id: 'classe', label: 'Classement sans suite' },
  { id: 'avertissement', label: 'Avertissement' },
  { id: 'sanction', label: 'Signalement à la Direction' },
]

const pageTitle = "Écart d'itinéraire"
</script>

<template>
  <CardModalShell
    v-if="item"
    :page-title="pageTitle"
    :page-number="item.id"
    banner-label="Flotte · Conformité"
    :is-edit-mode="false"
    :sidebar-items="sidebarItems"
    :current-no="item.id"
    :has-prev="hasPrev"
    :has-next="hasNext"
    hide-action-bar
    @close="emit('close')"
    @go-prev="naviguer(-1)"
    @go-next="naviguer(1)"
    @select-sidebar="selectSidebar"
  >
    <template #title-badges>
      <span :class="LIB_GRAVITE[item.gravite].cls" class="px-2.5 py-0.5 rounded-full text-xs font-medium">{{ LIB_GRAVITE[item.gravite].label }}</span>
      <span :class="LIB_NATURE[item.nature].cls" class="px-2.5 py-0.5 rounded-full text-xs font-medium">{{ LIB_NATURE[item.nature].label }}</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">

        <div v-if="item.nature === 'a_qualifier'" class="flex items-start gap-2.5 bg-warning-bg text-warning rounded-lg px-3.5 py-2.5 mb-5">
          <Info class="w-4 h-4 shrink-0 mt-px" />
          <p class="text-xs leading-relaxed">
            Statut <strong>« à qualifier »</strong>. Seule une qualification en <strong>déviation non justifiée</strong> alimente le score du conducteur.
          </p>
        </div>

        <FormSection title="Identification" :recaps="[item.id, LIB_TYPE_ECART[item.type], item.voyageRef]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Type d'écart</label><span class="text-sm font-medium text-foreground">{{ LIB_TYPE_ECART[item.type] }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Détecté le</label><span class="text-sm text-foreground">{{ fmtDateHeure(item.detecteLe) }}</span></div>
            <div class="flex flex-col gap-1">
              <label :class="F.fieldLabel">Voyage</label>
              <button class="text-sm font-mono text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer text-left" @click="emit('ouvrirVoyage', item.voyageId)">
                {{ item.voyageRef }}
              </button>
            </div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Trajet</label><span class="text-sm text-foreground">{{ item.trajetLibelle ?? 'Trajet ponctuel' }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Véhicule</label><span class="text-sm font-mono font-semibold text-foreground">{{ item.vehiculePlaque }}</span></div>
            <div class="flex flex-col gap-1">
              <label :class="F.fieldLabel">Chauffeur</label>
              <button v-if="item.chauffeurId" class="text-sm text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer text-left w-fit"
                      title="Ouvrir le tableau de bord du conducteur" @click="emit('voirConducteur', item.chauffeurId)">
                {{ item.chauffeurNom }}
              </button>
              <span v-else class="text-sm text-foreground">{{ item.chauffeurNom ?? '-' }}</span>
            </div>
            <div class="col-span-2 flex flex-col gap-1 max-sm:col-span-1">
              <label :class="F.fieldLabel">Lieu</label>
              <span class="text-sm text-foreground">{{ item.lieu ?? '-' }}</span>
              <span class="text-[11px] text-muted-foreground font-mono">{{ item.lat.toFixed(4) }}, {{ item.lng.toFixed(4) }}</span>
            </div>
          </div>
        </FormSection>

        <FormSection title="Itinéraire prévu et trajet réel" :recaps="[item.dureeMin ? fmtDuree(item.dureeMin) : null, item.ecartLateralMaxM ? `${(item.ecartLateralMaxM / 1000).toFixed(1)} km d'écart` : null]">
          <FleetMap :trace-prevu="tracePrevu" :marqueurs="marqueurEcart" height="320px" :show-legend="false" :ajuster-vue="true" />
          <p class="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            Ligne pointillée bleue : trajet de référence. Marqueur rouge : position relevée au moment de l'écart.
            Aucun tracé réel continu n'est disponible : aucun boîtier de géolocalisation n'est nommé dans les documents UCODIS.
          </p>
        </FormSection>

        <FormSection title="Mesures" :recaps="[LIB_TYPE_ECART[item.type]]">
          <div class="grid grid-cols-4 gap-3 max-sm:grid-cols-2">
            <div v-for="m in mesures" :key="m.label">
              <label :class="F.fieldLabel">{{ m.label }}</label>
              <p class="text-lg font-bold" :class="m.cls">{{ m.value }}</p>
            </div>
          </div>
        </FormSection>

        <FormSection title="Chronologie" :recaps="[`${chronologie.length} évènement(s)`]">
          <ol class="relative pl-5 border-l-2 border-border flex flex-col gap-3.5">
            <li v-for="(e, i) in chronologie" :key="i" class="relative">
              <span class="absolute -left-[26px] top-0.5 w-3 h-3 rounded-full border-2 border-card" :class="e.cls" />
              <div class="text-xs font-medium text-foreground">{{ e.titre }}</div>
              <div class="text-[11px] text-muted-foreground">{{ e.heure }}<span v-if="e.detail"> · {{ e.detail }}</span></div>
            </li>
          </ol>
        </FormSection>

        <FormSection title="Justification du chauffeur" :recaps="[item.justificationChauffeur ? 'déposée' : 'en attente']">
          <template v-if="item.justificationChauffeur">
            <p class="text-sm text-foreground leading-relaxed bg-background rounded-md px-3 py-2.5">{{ item.justificationChauffeur }}</p>
            <p class="text-[11px] text-muted-foreground mt-1.5">Déposée le {{ fmtDateHeure(item.justifieLe) }}</p>
          </template>
          <template v-else>
            <p class="text-xs text-muted-foreground mb-2">Aucune justification déposée. Fenêtre ouverte jusqu'au {{ fmtDateHeure(dateLimite) }}.</p>
            <textarea v-model="saisieJustif" rows="3" :class="F.fieldTextarea" placeholder="Saisir la justification transmise par le chauffeur…" />
            <button :class="Lc.btnOutline" class="mt-2" :disabled="!saisieJustif.trim()" @click="deposerJustification">Enregistrer la justification</button>
          </template>
        </FormSection>

        <FormSection title="Qualification" :recaps="[LIB_NATURE[item.nature].label, item.decision ? LIB_DECISION[item.decision] : null]" :default-open="item.nature === 'a_qualifier'">
          <template v-if="item.nature === 'a_qualifier'">
            <div class="flex flex-col gap-1.5 mb-3">
              <label v-for="opt in OPTIONS_NATURE" :key="opt.value"
                     class="flex items-start gap-2 rounded-md border px-2.5 py-2 cursor-pointer transition-colors"
                     :class="nature === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-background'">
                <input type="radio" :value="opt.value" v-model="nature" class="accent-primary mt-0.5" />
                <span>
                  <span class="text-xs font-medium text-foreground block">{{ opt.label }}</span>
                  <span class="text-[11px] text-muted-foreground">{{ opt.aide }}</span>
                </span>
              </label>
            </div>
            <div :class="F.field" class="mb-2.5">
              <label :class="F.fieldLabel">Motif <span class="text-danger">*</span></label>
              <textarea v-model="motif" rows="3" :class="F.fieldTextarea" placeholder="Motiver la décision - c'est ce qui rend le dossier opposable." />
            </div>
            <div v-if="nature === 'non_justifiee'" :class="F.field" class="mb-2.5">
              <label :class="F.fieldLabel">Suite donnée</label>
              <SearchableDropdown v-model="decision" :items="optDecision" placeholder="Sélectionner…" />
            </div>
            <p v-if="erreur" class="text-[12px] text-danger flex items-center gap-1.5 mb-2"><AlertCircle class="w-3.5 h-3.5" /> {{ erreur }}</p>
            <button :class="Lc.btnPrimary" @click="qualifier">Enregistrer la qualification</button>
          </template>
          <template v-else>
            <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
              <div class="flex flex-col gap-1">
                <label :class="F.fieldLabel">Nature retenue</label>
                <span :class="LIB_NATURE[item.nature].cls" class="text-xs font-medium px-2 py-0.5 rounded-full w-fit">{{ LIB_NATURE[item.nature].label }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label :class="F.fieldLabel">Suite donnée</label>
                <span class="text-sm text-foreground">{{ item.decision ? LIB_DECISION[item.decision] : '-' }}</span>
              </div>
              <div class="col-span-2 flex flex-col gap-1 max-sm:col-span-1"><label :class="F.fieldLabel">Motif</label><span class="text-sm text-foreground leading-relaxed">{{ item.motifQualification }}</span></div>
              <div class="col-span-2 flex flex-col gap-1 max-sm:col-span-1"><label :class="F.fieldLabel">Qualifié par</label><span class="text-sm text-foreground">{{ item.qualifiePar }} · {{ fmtDateHeure(item.qualifieLe) }}</span></div>
            </div>
          </template>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
