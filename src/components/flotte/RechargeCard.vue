<script setup lang="ts">
/**
 * Fiche du plein : données saisies, reçu et paiement, contrôles automatiques,
 * position du véhicule quand elle est connue, et qualification du plein.
 * Le plein se qualifie seulement : une retenue éventuelle passe par l'écart
 * de consommation de la période (FMS-CA-05).
 */
import { devise } from '../../lib/monnaie'
import { ref, computed, getCurrentInstance } from 'vue'
import { CheckCircle2, TriangleAlert, XCircle } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import FleetMap from './FleetMap.vue'
import type { CarteMarqueur } from './FleetMap.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useCarburantStore, LIB_CANAL } from '../../stores/carburant'
import { useCartesCarburantStore } from '../../stores/cartesCarburant'
import { fmtDateHeure } from '../../utils/voyageUtils'
import type { RechargeCarburant, StatutRecharge } from '../../types'
import * as F from '../../lib/formClasses'
import * as Lc from '../../lib/listClasses'

const props = defineProps<{ recharges: RechargeCarburant[]; rechargeId: string }>()
const emit = defineEmits<{ close: []; voirConducteur: [id: string]; voirEcart: [periodeId: string] }>()
/* Le lien vers l'écart n'apparaît que si l'écran qui ouvre la fiche sait afficher l'écart. */
const peutVoirEcart = !!getCurrentInstance()?.vnode.props?.onVoirEcart
const cartes = useCartesCarburantStore()
const transaction = computed(() => item.value?.transactionId ? cartes.transactionParId(item.value.transactionId) : undefined)
const carteTx = computed(() => transaction.value ? cartes.getById(transaction.value.carteId) : undefined)

const store = useCarburantStore()

const idCourant = ref(props.rechargeId)
const item = computed<RechargeCarburant | null>(() => store.getById(idCourant.value) ?? props.recharges.find(r => r.id === idCourant.value) ?? null)

const index = computed(() => props.recharges.findIndex(r => r.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.recharges.length - 1)
const sidebarItems = computed(() => props.recharges.map(r => ({ no: r.id, label: `${r.vehiculePlaque} · ${r.litres} L` })))
function naviguer(delta: number) {
  const cible = props.recharges[index.value + delta]
  if (cible) { idCourant.value = cible.id; erreur.value = '' }
}
function selectSidebar(no: string) {
  const cible = props.recharges.find(r => r.id === no)
  if (cible) { idCourant.value = cible.id; erreur.value = '' }
}

const STATUT: Record<StatutRecharge, { label: string; cls: string }> = {
  valide: { label: 'Conforme', cls: 'bg-success-bg text-success' },
  anomalie: { label: 'À qualifier', cls: 'bg-warning-bg text-warning' },
  qualifie: { label: 'Qualifié', cls: 'bg-info-bg text-info' },
}

function fmtL(l: number) { return `${l.toLocaleString('fr-FR')} L` }
function fmtAr(n: number) { return `${n.toLocaleString('fr-FR')} ${devise()}` }

const nbEchecs = computed(() => item.value?.controles.filter(c => !c.ok).length ?? 0)
const ecartPosition = computed(() => item.value?.positionVehicule?.ecartKm ?? 0)

/** Deux marqueurs : station déclarée en bleu, position du véhicule en rouge. */
const marqueursPosition = computed<CarteMarqueur[]>(() => {
  const r = item.value
  if (!r?.positionVehicule) return []
  return [
    { id: 'declare', lat: r.lat, lng: r.lng, libelle: 'Station déclarée', couleur: '#0072C5' },
    { id: 'reel', lat: r.positionVehicule.lat, lng: r.positionVehicule.lng, libelle: 'Position du véhicule', couleur: '#dc2626' },
  ]
})

/* ── Qualification du plein ───────────────────────────────── */
const qualif = ref('')
const commentaire = ref('')
const erreur = ref('')
function qualifier() {
  if (!item.value) return
  if (!qualif.value) { erreur.value = 'Choisissez la cause.'; return }
  const r = store.qualifier(item.value.id, qualif.value, commentaire.value)
  erreur.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) { qualif.value = ''; commentaire.value = '' }
}
const optQualif = computed<DropdownItem[]>(() => store.parametres.causes.map(c => ({ id: c.id, label: c.libelle, sublabel: c.imputable ? 'Imputable au conducteur' : undefined })))

/** Écart de consommation de la période qui contient ce plein, quand la cause est imputable au chauffeur. */
const periodeEcart = computed(() => item.value?.statut === 'qualifie' && store.estImputable(item.value.qualification) ? store.periodeDuPlein(item.value.id) : undefined)
</script>

<template>
  <CardModalShell
    v-if="item"
    page-title="Fiche du plein"
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

        <FormSection title="Le plein" :recaps="[item.vehiculePlaque, fmtL(item.litres)]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Date et heure déclarées</label><span class="text-sm text-foreground">{{ fmtDateHeure(item.date) }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Mode de saisie</label><span class="text-sm text-foreground">{{ LIB_CANAL[item.canal] ?? item.canal }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Véhicule</label><span class="text-sm font-mono font-semibold text-foreground">{{ item.vehiculePlaque }}</span></div>
            <div class="flex flex-col gap-1">
              <label :class="F.fieldLabel">Conducteur</label>
              <button v-if="item.chauffeurId" class="text-sm text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer text-left w-fit"
                      title="Ouvrir le tableau de bord du conducteur" @click="emit('voirConducteur', item.chauffeurId)">
                {{ item.chauffeurNom }}
              </button>
              <span v-else class="text-sm text-foreground">{{ item.chauffeurNom ?? '-' }}</span>
            </div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Station</label><span class="text-sm text-foreground">{{ item.lieu }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Voyage</label><span class="text-sm font-mono text-foreground">{{ item.voyageRef ?? '-' }}</span></div>
          </div>
        </FormSection>

        <FormSection title="Quantité et montant" :recaps="[fmtL(item.litres), fmtAr(item.montant)]">
          <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-2">
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Volume</label><span class="text-lg font-bold text-foreground">{{ fmtL(item.litres) }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Prix au litre</label><span class="text-sm text-foreground">{{ fmtAr(item.prixLitre) }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Montant</label><span class="text-sm font-semibold text-foreground">{{ fmtAr(item.montant) }}</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Kilométrage au compteur</label><span class="text-sm text-foreground">{{ item.odometre.toLocaleString('fr-FR') }} km</span></div>
            <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Plein complet</label><span class="text-sm" :class="item.pleinComplet ? 'text-success font-medium' : 'text-muted-foreground'">{{ item.pleinComplet ? 'Oui' : 'Non' }}</span></div>
          </div>
        </FormSection>

        <FormSection title="Reçu et paiement" :recaps="[item.recu ? 'reçu joint' : 'sans reçu', transaction ? 'carte carburant' : 'hors carte']" :default-open="!!item.recu || !!transaction">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1">
              <label :class="F.fieldLabel">Reçu de la station</label>
              <template v-if="item.recu">
                <a v-if="item.recu.dataUrl" :href="item.recu.dataUrl" target="_blank" rel="noopener" class="text-sm text-primary hover:underline w-fit">{{ item.recu.nom }}</a>
                <span v-else class="text-sm text-foreground">{{ item.recu.nom }}</span>
                <img v-if="item.recu.dataUrl?.startsWith('data:image')" :src="item.recu.dataUrl" alt="Reçu" class="mt-1 w-40 rounded-md border border-border" />
              </template>
              <span v-else class="text-sm text-muted-foreground">Aucun reçu joint</span>
            </div>
            <div class="flex flex-col gap-1">
              <label :class="F.fieldLabel">Transaction de carte rapprochée</label>
              <span v-if="transaction" class="text-sm text-foreground">{{ transaction.id }} · carte {{ carteTx?.numero }}<span class="block text-[11px] text-muted-foreground">{{ fmtDateHeure(transaction.date) }}, {{ transaction.litres }} L, {{ fmtAr(transaction.montantAr) }}</span></span>
              <span v-else class="text-sm text-muted-foreground">Aucune</span>
            </div>
            <div v-if="item.saisiPar" class="flex flex-col gap-1"><label :class="F.fieldLabel">Saisi par</label><span class="text-sm text-foreground">{{ item.saisiPar }}<template v-if="item.saisiLe">, le {{ fmtDateHeure(item.saisiLe) }}</template></span></div>
          </div>
        </FormSection>

        <FormSection title="Contrôles automatiques" :recaps="[nbEchecs ? `${nbEchecs} en échec` : 'tous conformes']">
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

        <FormSection v-if="item.positionVehicule" title="Position du véhicule" :recaps="[`écart ${item.positionVehicule.ecartKm.toFixed(1)} km`]" :default-open="ecartPosition > store.parametres.ecartGpsMaxKm">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 mb-3">
            <div class="flex flex-col gap-1">
              <label :class="F.fieldLabel">Station déclarée</label>
              <span class="text-sm text-foreground">{{ item.lieu }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <label :class="F.fieldLabel">Écart avec la position du véhicule</label>
              <span class="text-sm font-semibold" :class="ecartPosition > store.parametres.ecartGpsMaxKm ? 'text-danger' : 'text-success'">{{ item.positionVehicule.ecartKm.toFixed(1) }} km</span>
            </div>
          </div>
          <FleetMap :marqueurs="marqueursPosition" height="240px" :show-legend="false" />
        </FormSection>

        <FormSection title="Qualification du plein" :recaps="[item.qualification ? store.libelleCause(item.qualification) : 'non qualifié']" :default-open="item.statut !== 'valide'">
          <template v-if="item.statut === 'qualifie'">
            <div class="grid grid-cols-2 gap-x-6 gap-y-4">
              <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Cause retenue</label><span class="text-sm font-medium text-foreground">{{ store.libelleCause(item.qualification) }}</span></div>
              <div class="flex flex-col gap-1"><label :class="F.fieldLabel">Imputable au conducteur</label><span class="text-sm text-foreground">{{ store.estImputable(item.qualification) ? 'Oui' : 'Non' }}</span></div>
            </div>
            <div class="flex flex-col gap-1 mt-4"><label :class="F.fieldLabel">Éléments recueillis</label><p class="text-sm text-foreground leading-relaxed">{{ item.commentaire || '-' }}</p></div>
            <button v-if="peutVoirEcart && periodeEcart?.id" :class="Lc.btnOutline" class="mt-4" @click="emit('voirEcart', periodeEcart.id)">Voir l'écart de consommation</button>
          </template>
          <template v-else-if="item.statut === 'anomalie'">
            <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
            <div :class="F.field" class="mb-2.5">
              <label :class="F.fieldLabel">Cause *</label>
              <SearchableDropdown v-model="qualif" :items="optQualif" placeholder="Choisir…" />
            </div>
            <div :class="F.field" class="mb-2.5">
              <label :class="F.fieldLabel">Éléments recueillis</label>
              <textarea v-model="commentaire" rows="3" :class="F.fieldTextarea" placeholder="Explication du conducteur, vérification de l'exploitation…" />
            </div>
            <button :class="Lc.btnPrimary" @click="qualifier">Enregistrer la qualification</button>
          </template>
          <p v-else class="text-xs text-muted-foreground py-2">Plein conforme.</p>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
