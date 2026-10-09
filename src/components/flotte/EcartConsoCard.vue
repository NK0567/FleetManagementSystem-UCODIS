<script setup lang="ts">
/** Fiche d'une période de consommation plein à plein : comparaison à la
 *  référence, qualification de l'écart et retenue éventuelle (FMS-CA-04, CA-05).
 *  Aucune conséquence n'est tirée tant que l'écart n'est pas qualifié. */
import { ref, computed } from 'vue'
import { CheckCircle2, ShieldAlert, TriangleAlert } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import ChampLecture from '../maintenance/ChampLecture.vue'
import { useCarburantStore, LIB_QUALIF, LIB_STATUT_ECART, QUALIFS_IMPUTABLES } from '../../stores/carburant'
import { useAuthStore } from '../../stores/auth'
import { fmtDateHeure } from '../../utils/voyageUtils'
import type { PeriodeConso, QualifEcartCarburant } from '../../types'
import * as F from '../../lib/formClasses'

const props = defineProps<{ periodes: PeriodeConso[]; periodeId: string }>()
const emit = defineEmits<{ close: []; ouvrirPlein: [id: string] }>()

const store = useCarburantStore()
const auth = useAuthStore()
const moi = computed(() => auth.user?.nom ?? 'Responsable flotte')

const idCourant = ref(props.periodeId)
const item = computed(() => store.periodesConso.find(p => p.id === idCourant.value) ?? null)
const index = computed(() => props.periodes.findIndex(p => p.id === idCourant.value))
const sidebarItems = computed(() => props.periodes.map(p => ({ no: p.id!, label: `${p.vehiculePlaque} · ${new Date(p.au).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}` })))
function naviguer(d: number) { const c = props.periodes[index.value + d]; if (c?.id) { idCourant.value = c.id; reinit() } }
function selectSidebar(no: string) { idCourant.value = no; reinit() }

const statut = computed(() => item.value ? store.statutEcart(item.value) : 'conforme')
const dossier = computed(() => item.value?.id ? store.dossiersEcart[item.value.id] : undefined)
const pleins = computed(() => item.value ? store.recharges.filter(r => r.vehiculeId === item.value!.vehiculeId && r.date >= item.value!.du && r.date <= item.value!.au).sort((a, b) => a.date.localeCompare(b.date)) : [])
const coutExces = computed(() => item.value ? store.coutExces(item.value) : 0)
const imputable = computed(() => !!dossier.value && QUALIFS_IMPUTABLES.includes(dossier.value.qualification))
const LIB_ORIGINE = { vehicule: 'propre à ce véhicule sur ce corridor', corridor: 'du corridor', defaut: 'par défaut (aucune référence pour ce corridor)' }

const qualif = ref<QualifEcartCarburant | ''>('')
const commentaire = ref('')
const montant = ref<number | undefined>(undefined)
const commentaireDecision = ref('')
const erreur = ref('')
const succes = ref('')
function reinit() { qualif.value = ''; commentaire.value = ''; montant.value = undefined; commentaireDecision.value = ''; erreur.value = ''; succes.value = '' }
function resultat(r: { ok: boolean; motif?: string }, msg: string) { erreur.value = r.ok ? '' : r.motif ?? ''; succes.value = r.ok ? msg : ''; return r.ok }
const optQualif = computed<DropdownItem[]>(() => Object.entries(LIB_QUALIF).map(([id, label]) => ({ id, label })))

function qualifier() {
  if (!item.value?.id || !qualif.value) { erreur.value = "Choisissez la cause de l'écart."; return }
  if (resultat(store.qualifierEcart(item.value.id, qualif.value, commentaire.value, moi.value), 'Écart qualifié.')) { qualif.value = ''; commentaire.value = '' }
}
function proposer() {
  if (!item.value?.id) return
  resultat(store.proposerRetenue(item.value.id, montant.value ?? 0, moi.value), 'Retenue soumise à validation.')
}
function decider(d: 'approuve' | 'rejete') {
  if (!item.value?.id) return
  if (resultat(store.deciderRetenue(item.value.id, d, moi.value, commentaireDecision.value), d === 'approuve' ? 'Retenue validée.' : 'Retenue rejetée, dossier classé.')) commentaireDecision.value = ''
}
function classer() {
  if (!item.value?.id) return
  resultat(store.classerEcart(item.value.id, moi.value, commentaire.value), 'Dossier classé sans retenue.')
}
const fmtAr = (n: number) => `${n.toLocaleString('fr-FR')} Ar`
</script>

<template>
  <CardModalShell
    v-if="item"
    :page-title="`Consommation · ${item.vehiculePlaque}`"
    :page-number="item.id"
    banner-label="Flotte · Carburant"
    :is-edit-mode="false"
    :sidebar-items="sidebarItems"
    :current-no="item.id ?? null"
    :has-prev="index > 0"
    :has-next="index >= 0 && index < periodes.length - 1"
    hide-action-bar
    @close="emit('close')"
    @go-prev="naviguer(-1)"
    @go-next="naviguer(1)"
    @select-sidebar="selectSidebar"
  >
    <template #title-badges>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" :class="LIB_STATUT_ECART[statut].cls">{{ LIB_STATUT_ECART[statut].label }}</span>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" :class="Math.abs(item.ecartPct) > store.parametres.seuilEcartConsoPct ? 'bg-danger-bg text-danger' : 'bg-neutral-bg text-neutral'">{{ item.ecartPct > 0 ? '+' : '' }}{{ item.ecartPct }} %</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CheckCircle2 class="w-4 h-4 shrink-0" /> {{ succes }}</div>
        <FormSection title="Période" :recaps="[item.vehiculePlaque, item.trajetLibelle ?? 'corridor non renseigné']">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Véhicule" mono>{{ item.vehiculePlaque }}</ChampLecture>
            <ChampLecture libelle="Chauffeur">{{ item.chauffeurNom ?? '-' }}</ChampLecture>
            <ChampLecture libelle="Corridor">{{ item.trajetLibelle ?? 'Non renseigné : aucun voyage rattaché au plein' }}</ChampLecture>
            <ChampLecture libelle="Du plein au plein">{{ fmtDateHeure(item.du) }} → {{ fmtDateHeure(item.au) }}</ChampLecture>
            <ChampLecture libelle="Distance">{{ item.km.toLocaleString('fr-FR') }} km</ChampLecture>
            <ChampLecture libelle="Litres consommés">{{ item.litres.toLocaleString('fr-FR') }} L</ChampLecture>
          </div>
        </FormSection>

        <FormSection title="Comparaison à la référence" :recaps="[`${item.litresPour100km} contre ${item.refConso} L/100 km`]">
          <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Consommation réelle"><span class="text-lg font-bold">{{ item.litresPour100km }} L/100 km</span></ChampLecture>
            <ChampLecture libelle="Référence">{{ item.refConso }} L/100 km<div class="text-[11px] text-muted-foreground">{{ LIB_ORIGINE[item.origineRef ?? 'defaut'] }}</div></ChampLecture>
            <ChampLecture libelle="Écart"><span class="font-semibold" :class="Math.abs(item.ecartPct) > store.parametres.seuilEcartConsoPct ? 'text-danger' : 'text-success'">{{ item.ecartPct > 0 ? '+' : '' }}{{ item.ecartPct }} %</span><div class="text-[11px] text-muted-foreground">à qualifier au-delà de {{ store.parametres.seuilEcartConsoPct }} %</div></ChampLecture>
            <ChampLecture libelle="Carburant consommé en trop">{{ coutExces ? fmtAr(coutExces) : 'aucun' }}</ChampLecture>
          </div>
        </FormSection>

        <FormSection title="Qualification de l'écart" :recaps="[dossier ? LIB_QUALIF[dossier.qualification] : statut === 'conforme' ? 'non requise' : 'à faire']" :default-open="statut !== 'conforme'">
          <template v-if="dossier">
            <div class="grid grid-cols-2 gap-x-6 gap-y-4">
              <ChampLecture libelle="Cause retenue">{{ LIB_QUALIF[dossier.qualification] }}</ChampLecture>
              <ChampLecture libelle="Qualifié par">{{ dossier.qualifiePar }}, le {{ fmtDateHeure(dossier.qualifieLe) }}</ChampLecture>
              <ChampLecture libelle="Éléments recueillis" large>{{ dossier.commentaire || '-' }}</ChampLecture>
            </div>
          </template>
          <template v-else>
            <p v-if="statut === 'conforme'" class="text-xs text-muted-foreground mb-3">Consommation dans la référence. Une qualification reste possible si un élément le justifie.</p>
            <div class="grid grid-cols-2 gap-x-6 gap-y-3 max-sm:grid-cols-1">
              <div :class="F.field"><label :class="F.fieldLabel">Cause de l'écart *</label><SearchableDropdown v-model="qualif" :items="optQualif" placeholder="Choisir…" /></div>
              <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Éléments recueillis</label><textarea v-model="commentaire" rows="3" :class="F.fieldTextarea" placeholder="Explication du chauffeur, vérification de l'exploitation…"></textarea></div>
            </div>
            <button :class="F.btnPrimary" class="mt-3" @click="qualifier">Enregistrer la qualification</button>
          </template>
        </FormSection>

        <FormSection v-if="dossier" title="Suite donnée" :recaps="[LIB_STATUT_ECART[statut].label, dossier.montantPropose ? fmtAr(dossier.montantPropose) : null]" :default-open="true">
          <template v-if="!imputable">
            <p class="text-xs text-muted-foreground">Cause non imputable au chauffeur : aucune retenue ne peut être proposée.</p>
          </template>
          <template v-else>
            <div class="flex items-start gap-2.5 bg-warning-bg text-warning rounded-lg px-3.5 py-2.5 mb-3">
              <ShieldAlert class="w-4 h-4 shrink-0 mt-px" />
              <p class="text-xs leading-relaxed">Une retenue proposée reste soumise à validation et doit rester conforme au droit du travail applicable avant toute exécution sur la paie. Elle ne peut pas dépasser le coût du carburant consommé en trop.</p>
            </div>
            <template v-if="statut === 'qualifie'">
              <div class="flex gap-2 items-end flex-wrap">
                <div :class="F.field" class="w-[220px]"><label :class="F.fieldLabel">Montant proposé (Ar)</label><input v-model.number="montant" type="number" min="0" :class="F.fieldInput" :placeholder="`au plus ${coutExces.toLocaleString('fr-FR')}`" /></div>
                <button :class="F.btnPrimary" @click="proposer">Soumettre à validation</button>
                <button :class="F.btnOutline" @click="classer">Classer sans retenue</button>
              </div>
            </template>
            <template v-else-if="statut === 'en_validation'">
              <div class="grid grid-cols-2 gap-x-6 gap-y-3 mb-3">
                <ChampLecture libelle="Montant proposé">{{ fmtAr(dossier.montantPropose ?? 0) }}</ChampLecture>
                <ChampLecture libelle="Proposé par">{{ dossier.proposePar }}</ChampLecture>
              </div>
              <div :class="F.field" class="mb-2.5"><label :class="F.fieldLabel">Commentaire du valideur (obligatoire pour un rejet)</label><textarea v-model="commentaireDecision" rows="2" :class="F.fieldTextarea"></textarea></div>
              <div class="flex gap-2"><button :class="F.btnPrimary" @click="decider('approuve')">Valider la retenue</button><button :class="F.btnOutline" @click="decider('rejete')">Rejeter</button></div>
            </template>
            <p v-else-if="statut === 'refacture'" class="text-xs text-success flex items-center gap-1.5"><CheckCircle2 class="w-4 h-4" /> Retenue de {{ fmtAr(dossier.montantPropose ?? 0) }} validée par {{ dossier.validation?.valideur }}.</p>
          </template>
          <p v-if="statut === 'classe'" class="text-xs text-muted-foreground mt-2">Dossier classé sans retenue{{ dossier.validation?.commentaire ? ` : ${dossier.validation.commentaire}` : '' }}.</p>
        </FormSection>

        <FormSection title="Pleins de la période" :recaps="[`${pleins.length} plein(s)`]" :default-open="false">
          <table class="w-full text-xs">
            <tbody>
              <tr v-for="r in pleins" :key="r.id" class="border-b border-border/60 last:border-0">
                <td class="py-1.5"><button class="text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click="emit('ouvrirPlein', r.id)">{{ fmtDateHeure(r.date) }}</button></td>
                <td class="py-1.5">{{ r.lieu }}</td>
                <td class="py-1.5 text-right">{{ r.litres }} L</td>
                <td class="py-1.5 text-right">{{ r.odometre.toLocaleString('fr-FR') }} km</td>
              </tr>
            </tbody>
          </table>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
