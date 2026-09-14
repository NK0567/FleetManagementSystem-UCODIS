<script setup lang="ts">
/**
 * Fiche de recharge carburant, reprise de la fiche de recharge du socle FMS.
 * Le recoupement GPS (section « Position du véhicule ») et le circuit de
 * refacturation à deux niveaux hiérarchiques du socle FMS supposent des
 * éléments non établis pour UCODIS (boîtier de géolocalisation, grille
 * de retenue sur salaire à deux signatures) : la section position ne
 * s'affiche que si la donnée existe (comme sur le socle FMS), et la
 * refacturation est simplifiée à une seule validation par le
 * Responsable Flotte plutôt qu'un circuit N1/N2 non documenté.
 */
import { ref, computed } from 'vue'
import { CheckCircle2, ShieldAlert, XCircle } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import FleetMap from './FleetMap.vue'
import type { CarteMarqueur } from './FleetMap.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useCarburantStore, LIB_CANAL, LIB_QUALIF } from '../../stores/carburant'
import { useAuthStore } from '../../stores/auth'
import { fmtDateHeure } from '../../utils/voyageUtils'
import type { RechargeCarburant, StatutRecharge, QualifEcartCarburant } from '../../types'
import * as F from '../../lib/formClasses'
import * as Lc from '../../lib/listClasses'

const props = defineProps<{ recharges: RechargeCarburant[]; rechargeId: string }>()
const emit = defineEmits<{ close: []; voirConducteur: [id: string] }>()

const store = useCarburantStore()
const auth = useAuthStore()

const idCourant = ref(props.rechargeId)
const item = computed<RechargeCarburant | null>(() => store.getById(idCourant.value) ?? props.recharges.find(r => r.id === idCourant.value) ?? null)

const index = computed(() => props.recharges.findIndex(r => r.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.recharges.length - 1)
const sidebarItems = computed(() => props.recharges.map(r => ({ no: r.id, label: `${r.vehiculePlaque} · ${r.litres} L` })))
function naviguer(delta: number) {
  const cible = props.recharges[index.value + delta]
  if (cible) idCourant.value = cible.id
}
function selectSidebar(no: string) {
  const cible = props.recharges.find(r => r.id === no)
  if (cible) idCourant.value = cible.id
}

const STATUT: Record<StatutRecharge, { label: string; cls: string }> = {
  valide: { label: 'Conforme', cls: 'bg-success-bg text-success' },
  anomalie: { label: 'En anomalie', cls: 'bg-danger-bg text-danger' },
  en_qualification: { label: 'En qualification', cls: 'bg-warning-bg text-warning' },
  qualifie: { label: 'Qualifiée', cls: 'bg-neutral-bg text-neutral' },
  en_validation: { label: 'En validation', cls: 'bg-warning-bg text-warning' },
  refacture: { label: 'Refacturée', cls: 'bg-danger-bg text-danger' },
  classe: { label: 'Classée sans suite', cls: 'bg-neutral-bg text-neutral' },
}

function fmtL(l: number) { return `${l.toLocaleString('fr-FR')} L` }
function fmtAr(n: number) { return `${n.toLocaleString('fr-FR')} Ar` }

const nbEchecs = computed(() => item.value?.controles.filter(c => !c.ok).length ?? 0)
const ecartPosition = computed(() => item.value?.positionVehicule?.ecartKm ?? 0)

/** Deux marqueurs : lieu déclaré en bleu, position réelle en rouge. */
const marqueursPosition = computed<CarteMarqueur[]>(() => {
  const r = item.value
  if (!r?.positionVehicule) return []
  return [
    { id: 'declare', lat: r.lat, lng: r.lng, libelle: 'Lieu de recharge déclaré', couleur: '#0072C5' },
    { id: 'reel', lat: r.positionVehicule.lat, lng: r.positionVehicule.lng, libelle: 'Position réelle du véhicule', sousTitre: 'Position simulée', couleur: '#dc2626' },
  ]
})

/** Le circuit de refacturation ne s'ouvre que sur une cause imputable au conducteur. */
const circuitOuvert = computed(() =>
  !!item.value && ['en_validation', 'refacture', 'classe'].includes(item.value.statut)
  && (item.value.qualification === 'conduite' || item.value.qualification === 'prelevement'))

const montantPropose = ref<number | undefined>(undefined)
const commentaireValidation = ref('')

function proposerRefacturation() {
  if (!item.value || !montantPropose.value) return
  store.ouvrirValidation(item.value.id, montantPropose.value)
}
function deciderValidation(decision: 'approuve' | 'rejete') {
  if (!item.value) return
  store.valider(item.value.id, auth.user?.nom ?? 'Responsable Flotte', decision, commentaireValidation.value || undefined)
  commentaireValidation.value = ''
}

/* ── Qualification de l'anomalie ──────────────────────────── */
const qualif = ref<QualifEcartCarburant | ''>('')
const commentaire = ref('')
function qualifier() {
  if (!item.value || !qualif.value) return
  store.qualifier(item.value.id, qualif.value, commentaire.value)
  qualif.value = ''
  commentaire.value = ''
}
const optQualif = computed<DropdownItem[]>(() => Object.entries(LIB_QUALIF).map(([id, label]) => ({ id, label: String(label) })))
</script>

<template>
  <CardModalShell
    v-if="item"
    page-title="Fiche de recharge"
    :page-number="item.id"
    banner-label="Flotte · Carburant"
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
      <span :class="STATUT[item.statut].cls" class="px-2.5 py-0.5 rounded-full text-xs font-medium">{{ STATUT[item.statut].label }}</span>
      <span v-if="nbEchecs" class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-bg text-danger">{{ nbEchecs }} contrôle(s) en échec</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">

        <FormSection title="La recharge" :recaps="[item.vehiculePlaque, `${item.nombreBons ?? 1} bon(s)`, fmtL(item.litres)]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Date et heure déclarées</label><span class="text-sm text-foreground">{{ fmtDateHeure(item.date) }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Canal de collecte</label><span class="text-sm text-foreground">{{ LIB_CANAL[item.canal] }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Véhicule</label><span class="text-sm font-mono font-semibold text-foreground">{{ item.vehiculePlaque }}</span></div>
            <div class="flex flex-col gap-1">
              <label :class="F.fieldLabel">Chauffeur affecté</label>
              <button v-if="item.chauffeurId" class="text-sm text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer text-left w-fit"
                      title="Ouvrir le tableau de bord du conducteur" @click="emit('voirConducteur', item.chauffeurId)">
                {{ item.chauffeurNom }}
              </button>
              <span v-else class="text-sm text-foreground">{{ item.chauffeurNom ?? '-' }}</span>
            </div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Lieu déclaré</label><span class="text-sm text-foreground">{{ item.lieu }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Voyage rattaché</label><span class="text-sm font-mono text-foreground">{{ item.voyageRef ?? '-' }}</span></div>
          </div>
        </FormSection>

        <FormSection title="Quantités et bons" :recaps="[fmtL(item.litres), fmtAr(item.montant)]">
          <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-2">
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Bons délivrés</label><span class="text-lg font-bold text-primary">{{ item.nombreBons ?? 1 }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Litres par bon</label><span class="text-sm text-foreground">{{ item.litresParBon ? fmtL(item.litresParBon) : fmtL(item.litres) }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Litres délivrés</label><span class="text-lg font-bold text-foreground">{{ fmtL(item.litres) }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Prix au litre</label><span class="text-sm text-foreground">{{ fmtAr(item.prixLitre) }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Montant total</label><span class="text-sm font-semibold text-foreground">{{ fmtAr(item.montant) }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Index kilométrique</label><span class="text-sm text-foreground">{{ item.odometre.toLocaleString('fr-FR') }} km</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Plein complet</label><span class="text-sm" :class="item.pleinComplet ? 'text-success font-medium' : 'text-muted-foreground'">{{ item.pleinComplet ? 'Oui' : 'Non' }}</span></div>
          </div>
        </FormSection>

        <FormSection title="Contrôles de vraisemblance" :recaps="[nbEchecs ? `${nbEchecs} en échec` : 'tous conformes']">
          <ul class="flex flex-col gap-1.5">
            <li v-for="c in item.controles" :key="c.code" class="flex items-start gap-2.5 rounded-md px-3 py-2" :class="c.ok ? 'bg-background' : 'bg-danger-bg'">
              <component :is="c.ok ? CheckCircle2 : XCircle" class="w-4 h-4 shrink-0 mt-px" :class="c.ok ? 'text-success' : 'text-danger'" />
              <div class="min-w-0">
                <p class="text-xs font-medium" :class="c.ok ? 'text-foreground' : 'text-danger'">{{ c.libelle }}</p>
                <p class="text-[11px] text-muted-foreground">{{ c.detail }}</p>
              </div>
            </li>
          </ul>
        </FormSection>

        <FormSection v-if="item.positionVehicule" title="Position du véhicule" :recaps="[`écart ${item.positionVehicule.ecartKm.toFixed(1)} km`]" :default-open="ecartPosition > 2">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 mb-3">
            <div class="flex flex-col gap-1">
              <label :class="F.fieldLabel">Lieu déclaré</label>
              <span class="text-sm text-foreground">{{ item.lieu }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <label :class="F.fieldLabel">Écart à la position réelle</label>
              <span class="text-sm font-semibold" :class="ecartPosition > 2 ? 'text-danger' : 'text-success'">{{ item.positionVehicule.ecartKm.toFixed(1) }} km</span>
            </div>
          </div>
          <FleetMap :marqueurs="marqueursPosition" height="240px" :show-legend="false" />
          <p v-if="ecartPosition > 2" class="text-[11px] text-danger mt-2 leading-relaxed">
            Le véhicule se trouvait à {{ item.positionVehicule.ecartKm.toFixed(1) }} km du lieu de recharge déclaré
            à l'horodatage indiqué, selon la position simulée. Le point bleu est le lieu déclaré, le point rouge la
            position réelle.
          </p>
          <p v-else class="text-[11px] text-success mt-2">Position cohérente avec le lieu déclaré.</p>
        </FormSection>

        <FormSection title="Qualification de l'écart" :recaps="[item.qualification ? LIB_QUALIF[item.qualification] : 'non qualifié']" :default-open="item.statut === 'anomalie' || item.statut === 'qualifie'">
          <template v-if="item.statut === 'qualifie' || circuitOuvert">
            <div class="grid grid-cols-2 gap-x-6 gap-y-4">
              <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Cause retenue</label><span class="text-sm font-medium text-foreground">{{ LIB_QUALIF[item.qualification!] }}</span></div>
              <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Statut du dossier</label><span class="text-sm text-foreground">{{ STATUT[item.statut].label }}</span></div>
            </div>
            <div class="flex flex-col gap-1 mt-4"><label :class="F.fieldLabel">Éléments recueillis</label><p class="text-sm text-foreground leading-relaxed">{{ item.commentaire || '-' }}</p></div>
          </template>
          <template v-else-if="item.statut === 'anomalie'">
            <div :class="F.field" class="mb-2.5">
              <label :class="F.fieldLabel">Cause de l'écart</label>
              <SearchableDropdown v-model="qualif" :items="optQualif" placeholder="Choisir…" />
            </div>
            <div :class="F.field" class="mb-2.5">
              <label :class="F.fieldLabel">Éléments recueillis</label>
              <textarea v-model="commentaire" rows="3" :class="F.fieldTextarea" placeholder="Justification du chauffeur, vérification de l'exploitation…" />
            </div>
            <button :class="Lc.btnPrimary" :disabled="!qualif" @click="qualifier">Enregistrer la qualification</button>
          </template>
          <p v-else class="text-xs text-muted-foreground py-2">Recharge conforme, aucune qualification nécessaire.</p>
        </FormSection>

        <FormSection v-if="item.qualification === 'conduite' || item.qualification === 'prelevement'"
                     title="Refacturation interne" :recaps="[STATUT[item.statut].label, item.montantRefacture ? fmtAr(item.montantRefacture) : null]"
                     :default-open="true">
          <div class="flex items-start gap-2.5 bg-warning-bg text-warning rounded-lg px-3.5 py-2.5 mb-3">
            <ShieldAlert class="w-4 h-4 shrink-0 mt-px" />
            <p class="text-xs leading-relaxed">
              L'écart est qualifié « {{ LIB_QUALIF[item.qualification] }} », cause imputable au conducteur.
              Une retenue proposée ici reste soumise à validation du Responsable Flotte, et devra rester
              conforme au droit du travail applicable avant toute exécution sur la paie.
            </p>
          </div>

          <template v-if="item.statut === 'qualifie'">
            <div :class="F.field" class="mb-2.5">
              <label :class="F.fieldLabel">Montant proposé (Ar)</label>
              <input v-model.number="montantPropose" type="number" min="0" :class="F.fieldInput" />
            </div>
            <button :class="Lc.btnPrimary" :disabled="!montantPropose" @click="proposerRefacturation">Soumettre à validation</button>
          </template>

          <template v-else-if="item.statut === 'en_validation'">
            <div class="grid grid-cols-2 gap-x-6 gap-y-3 mb-3">
              <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Montant proposé</label><span class="text-sm font-semibold text-foreground">{{ item.montantRefacture ? fmtAr(item.montantRefacture) : '-' }}</span></div>
              <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Statut</label><span class="text-sm font-medium text-warning">En attente de validation</span></div>
            </div>
            <div :class="F.field" class="mb-2.5">
              <label :class="F.fieldLabel">Commentaire du valideur</label>
              <textarea v-model="commentaireValidation" rows="2" :class="F.fieldTextarea" placeholder="Motivation de la décision…" />
            </div>
            <div class="flex items-center gap-2">
              <button :class="Lc.btnPrimary" @click="deciderValidation('approuve')">Approuver la retenue</button>
              <button :class="Lc.btnOutline" @click="deciderValidation('rejete')">Rejeter</button>
            </div>
          </template>

          <p v-else-if="item.statut === 'refacture'" class="text-[11px] text-success flex items-start gap-1.5">
            <CheckCircle2 class="w-3.5 h-3.5 shrink-0 mt-px" /> Validation acquise : retenue transmissible à la paie.
          </p>
          <p v-else-if="item.statut === 'classe'" class="text-[11px] text-muted-foreground">
            Dossier classé sans suite, aucune retenue appliquée.
          </p>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
