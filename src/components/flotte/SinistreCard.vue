<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CircleCheck, Paperclip, TriangleAlert, Wrench } from '@lucide/vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useCodificationIndispoStore } from '../../stores/codificationIndispo'
import { useAuthStore } from '../../stores/auth'
import { useFormationsStore } from '../../stores/formations'
import * as F from '../../lib/formClasses'
import type { StatutIndemnisation } from '../../types'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import { useAssurancesStore, LIB_GRAVITE_SINISTRE, LIB_INDEMNISATION } from '../../stores/assurances'
import { formatDate } from '../../utils/helpers'
import { fmtDateHeure } from '../../utils/voyageUtils'
import type { Sinistre } from '../../types'

const props = defineProps<{ sinistres: Sinistre[]; sinistreId: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useAssurancesStore()
const idCourant = ref(props.sinistreId)
const item = computed<Sinistre | null>(() => store.getById(idCourant.value) ?? props.sinistres.find(s => s.id === idCourant.value) ?? null)

const index = computed(() => props.sinistres.findIndex(s => s.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.sinistres.length - 1)
const sidebarItems = computed(() => props.sinistres.map(s => ({ no: s.reference, label: s.vehiculePlaque })))
function naviguer(delta: number) { const s = props.sinistres[index.value + delta]; if (s) idCourant.value = s.id }
function selectSidebar(no: string) { const s = props.sinistres.find(x => x.reference === no); if (s) idCourant.value = s.id }

const police = computed(() => (item.value?.policeId ? store.getPoliceById(item.value.policeId) : null))
const maintenance = useMaintenanceStore()
const codif = useCodificationIndispoStore()
const auth = useAuthStore()
const formations = useFormationsStore()
function declencherFormation() {
  if (!item.value?.chauffeurId) return
  resultat(formations.declencher({ conducteurId: item.value.chauffeurId, theme: `Suite ${item.value.nature === 'incident' ? 'à l\u2019incident' : 'à l\u2019accident'} ${item.value.reference}`, motif: item.value.nature === 'incident' ? 'incident' : 'accident', origineRef: item.value.reference }, moi.value), 'Formation déclenchée pour le conducteur.')
}
const formationDeclenchee = computed(() => !!item.value && formations.formations.some(f => f.origineRef === item.value!.reference && f.statut !== 'annulee'))
const moi = computed(() => auth.user?.nom ?? 'Responsable')
const erreur = ref(''); const succes = ref('')
function resultat(r: { ok: boolean; motif?: string }, msg: string) { erreur.value = r.ok ? '' : r.motif ?? ''; succes.value = r.ok ? msg : ''; return r.ok }
const ot = computed(() => item.value?.ordreTravailRef ? maintenance.getById(item.value.ordreTravailRef) : undefined)
const codeIndispo = computed(() => item.value?.ordreTravailRef ? maintenance.codeIndispoDeLOT(item.value.ordreTravailRef) : undefined)
const codeReparation = ref(codif.codeAuto('accident'))
const optCodes = computed<DropdownItem[]>(() => codif.codes.map(c => ({ id: c.code, label: `${c.code} · ${c.libelle}` })))
function ouvrirReparation() { if (item.value) resultat(store.ouvrirReparation(item.value.id, moi.value, codeReparation.value || undefined), 'Réparation ouverte.') }
const assurance = ref<{ statut: StatutIndemnisation; montant?: number }>({ statut: 'non_declare' })
const suites = ref({ sanction: '', analyse: '' })
watch(item, s => {
  erreur.value = ''; succes.value = ''
  if (s) { assurance.value = { statut: s.statutIndemnisation, montant: s.montantIndemniseAr }; suites.value = { sanction: s.sanction ?? '', analyse: s.analyse ?? '' } }
}, { immediate: true })
const optIndemnisation = computed<DropdownItem[]>(() => Object.entries(LIB_INDEMNISATION).map(([id, label]) => ({ id, label })))
function enregistrerAssurance() { if (item.value) resultat(store.majAssurance(item.value.id, assurance.value.statut, moi.value, assurance.value.montant), 'Suivi assurance enregistré.') }
function enregistrerSuites() { if (!item.value) return; store.decider(item.value.id, { sanction: suites.value.sanction, analyse: suites.value.analyse }, moi.value); erreur.value = ''; succes.value = 'Suites enregistrées.' }
function cloturer() { if (item.value) resultat(store.cloturer(item.value.id, moi.value), 'Dossier clos.') }
function ajouterPhoto(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f || !item.value) return
  if (!f.type.startsWith('image/')) { erreur.value = 'La photo doit être une image.'; succes.value = ''; return }
  if (f.size > 1_500_000) { erreur.value = 'La photo dépasse 1,5 Mo.'; succes.value = ''; return }
  const lecteur = new FileReader()
  lecteur.onload = () => { store.ajouterPhoto(item.value!.id, { nom: f.name, dataUrl: String(lecteur.result) }, moi.value); succes.value = 'Photo ajoutée.'; erreur.value = '' }
  lecteur.readAsDataURL(f)
}
const resteACharge = computed(() => item.value ? (item.value.montantDommagesAr ?? 0) - (item.value.montantIndemniseAr ?? 0) : 0)
</script>

<template>
  <CardModalShell
    v-if="item"
    :page-title="item.nature === 'incident' ? 'Incident' : 'Accident'"
    :page-number="item.reference"
    banner-label="Flotte · Accidents et incidents"
    :is-edit-mode="false"
    :sidebar-items="sidebarItems"
    :current-no="item.reference"
    :has-prev="hasPrev"
    :has-next="hasNext"
    hide-action-bar
    @close="emit('close')"
    @go-prev="naviguer(-1)"
    @go-next="naviguer(1)"
    @select-sidebar="selectSidebar"
  >
    <template #title-badges>
      <span class="text-xs font-medium px-2.5 py-0.5 rounded-full" :class="item.statutDossier === 'clos' ? 'bg-neutral-bg text-neutral' : 'bg-info-bg text-info'">{{ item.statutDossier === 'clos' ? 'Dossier clos' : 'Dossier ouvert' }}</span>
      <span class="text-xs font-medium px-2.5 py-0.5 rounded-full" :class="LIB_GRAVITE_SINISTRE[item.gravite].cls">{{ LIB_GRAVITE_SINISTRE[item.gravite].label }}</span>
      <span class="text-xs font-medium px-2.5 py-0.5 rounded-full" :class="item.responsabiliteEntreprise ? 'bg-danger-bg text-danger' : 'bg-neutral-bg text-neutral'">
        {{ item.responsabiliteEntreprise ? 'Responsabilité de l\'entreprise' : 'Tiers responsable' }}
      </span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>

        <FormSection title="Circonstances" :recaps="[item.vehiculePlaque, fmtDateHeure(item.date)]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Référence</label><span class="text-sm font-mono font-medium text-foreground">{{ item.reference }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Date et heure</label><span class="text-sm text-foreground">{{ fmtDateHeure(item.date) }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Véhicule</label><span class="text-sm font-mono text-foreground">{{ item.vehiculePlaque }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Conducteur au volant</label><span class="text-sm text-foreground">{{ item.chauffeurNom ?? '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Lieu</label><span class="text-sm text-foreground">{{ item.lieu }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Kilométrage</label><span class="text-sm text-foreground">{{ item.kilometrage?.toLocaleString('fr-FR') ?? '-' }} km</span></div>
          </div>
          <div class="flex flex-col gap-1 mt-4">
            <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Circonstances</label>
            <p class="text-sm text-foreground leading-relaxed">{{ item.circonstances }}</p>
          </div>
          <div v-if="item.tiersImpliques" class="flex flex-col gap-1 mt-4">
            <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Tiers impliqués</label>
            <p class="text-sm text-foreground leading-relaxed">{{ item.tiersImpliques }}</p>
          </div>
        </FormSection>

        <FormSection title="Coût et indemnisation" :recaps="[(item.montantDommagesAr ?? 0).toLocaleString('fr-FR') + ' ' + $devise(), LIB_INDEMNISATION[item.statutIndemnisation]]" :default-open="true">
          <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Dommages constatés</label><span class="text-lg font-bold text-foreground">{{ item.montantDommagesAr ? item.montantDommagesAr.toLocaleString('fr-FR') + ' ' + $devise() : '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Indemnisation reçue</label><span class="text-lg font-bold" :class="item.montantIndemniseAr ? 'text-success' : 'text-muted-foreground'">{{ item.montantIndemniseAr ? item.montantIndemniseAr.toLocaleString('fr-FR') + ' ' + $devise() : '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Reste à charge</label><span class="text-lg font-bold" :class="resteACharge > 0 ? 'text-danger' : 'text-success'">{{ resteACharge.toLocaleString('fr-FR') }} {{ $devise() }}</span></div>
          </div>
          <div class="flex flex-col gap-1 mt-4">
            <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Assurance</label>
            <span class="text-sm font-medium text-foreground">{{ LIB_INDEMNISATION[item.statutIndemnisation] }}</span>
          </div>
          <div v-if="police" class="grid grid-cols-2 gap-x-6 gap-y-4 mt-4">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Police</label><span class="text-sm font-mono text-foreground">{{ police.numeroPolice }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Compagnie</label><span class="text-sm text-foreground">{{ police.compagnie }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Franchise</label><span class="text-sm text-foreground">{{ police.franchiseAr ? police.franchiseAr.toLocaleString('fr-FR') + ' ' + $devise() : '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Échéance de la police</label><span class="text-sm text-foreground">{{ formatDate(police.dateEcheance) }}</span></div>
          </div>
        </FormSection>

        <FormSection title="Photos" :recaps="[`${item.photos?.length ?? 0} photo(s)`]" :default-open="!!item.photos?.length">
          <div class="flex gap-2 flex-wrap mb-3">
            <a v-for="ph in item.photos ?? []" :key="ph.nom" :href="ph.dataUrl" target="_blank" rel="noopener"><img v-if="ph.dataUrl" :src="ph.dataUrl" :alt="ph.nom" class="w-24 h-24 object-cover rounded-md border border-border" /></a>
            <p v-if="!item.photos?.length" class="text-xs text-muted-foreground">Aucune photo.</p>
          </div>
          <label v-if="item.statutDossier !== 'clos'" :class="F.btnOutline" class="w-fit cursor-pointer"><Paperclip class="w-4 h-4" /> Ajouter une photo<input type="file" accept="image/*" capture="environment" class="hidden" @change="ajouterPhoto" /></label>
        </FormSection>

        <FormSection title="Réparation" :recaps="[item.ordreTravailRef ? item.ordreTravailRef : 'aucune réparation']" :default-open="true">
          <div v-if="item.ordreTravailRef" class="flex items-start gap-2.5 bg-info-bg text-info rounded-lg px-3.5 py-2.5">
            <Wrench class="w-4 h-4 shrink-0 mt-px" />
            <p class="text-xs leading-relaxed">
              Ordre de travail <strong class="font-mono">{{ item.ordreTravailRef }}</strong>{{ ot ? ` (${ot.statut === 'cloture' ? 'clôturé' : 'en cours'})` : '' }}.
              <template v-if="codeIndispo">Le véhicule est indisponible avec le code <strong class="font-mono">{{ codeIndispo }}</strong> · {{ codif.libelleDuCode(codeIndispo) }}.</template>
            </p>
          </div>
          <div v-else-if="item.statutDossier !== 'clos'" class="flex gap-2 items-end flex-wrap">
            <div :class="F.field" class="w-[260px]"><label :class="F.fieldLabel">Code d'indisponibilité</label><SearchableDropdown v-model="codeReparation" :items="optCodes" placeholder="Choisir…" /></div>
            <button :class="F.btnPrimary" @click="ouvrirReparation">Ouvrir une réparation</button>
          </div>
          <p v-else class="text-xs text-muted-foreground">Aucune réparation.</p>
        </FormSection>

        <FormSection title="Suites" :recaps="[LIB_INDEMNISATION[item.statutIndemnisation], item.sanction ? 'sanction' : 'sans sanction']" :default-open="item.statutDossier !== 'clos'">
          <div class="grid grid-cols-2 gap-x-6 gap-y-3 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Assurance</label><SearchableDropdown v-model="assurance.statut" :items="optIndemnisation" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Indemnisation reçue ({{ $devise() }})</label><input v-model.number="assurance.montant" type="number" min="0" :class="F.fieldInput" /></div>
          </div>
          <button v-if="item.statutDossier !== 'clos'" :class="F.btnOutline" class="mt-2" @click="enregistrerAssurance">Enregistrer le suivi assurance</button>
          <div :class="F.field" class="mt-4"><label :class="F.fieldLabel">Analyse des causes</label><textarea v-model="suites.analyse" rows="3" :class="F.fieldTextarea" :disabled="item.statutDossier === 'clos'"></textarea></div>
          <div :class="F.field" class="mt-3"><label :class="F.fieldLabel">Sanction décidée</label><input v-model="suites.sanction" :class="F.fieldInput" placeholder="vide : aucune sanction" :disabled="item.statutDossier === 'clos'" /></div>
          <div v-if="item.statutDossier !== 'clos'" class="flex gap-2 mt-2 flex-wrap">
            <button :class="F.btnOutline" @click="enregistrerSuites">Enregistrer les suites</button>
            <button v-if="item.chauffeurId && !formationDeclenchee" :class="F.btnOutline" @click="declencherFormation">Déclencher une formation pour le conducteur</button>
            <span v-else-if="formationDeclenchee" class="text-[12px] text-muted-foreground self-center">Formation déclenchée pour le conducteur.</span>
          </div>
        </FormSection>

        <FormSection title="Clôture et historique" :recaps="[item.statutDossier === 'clos' ? 'clos' : 'ouvert']" :default-open="false">
          <div v-for="(h, i) in item.historique ?? []" :key="i" class="text-xs border-b border-border/60 py-1.5">{{ h.action }}<div class="text-[11px] text-muted-foreground">{{ fmtDateHeure(h.le) }} · {{ h.par }}</div></div>
          <p v-if="!item.historique?.length" class="text-xs text-muted-foreground mb-2">Aucun événement enregistré.</p>
          <button v-if="item.statutDossier !== 'clos'" :class="F.btnPrimary" class="mt-3" @click="cloturer">Clore le dossier</button>
          <p v-else class="text-xs text-muted-foreground mt-2">Dossier clos le {{ fmtDateHeure(item.clotureLe!) }}.</p>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
