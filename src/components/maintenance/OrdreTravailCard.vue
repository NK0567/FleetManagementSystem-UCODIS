<script setup lang="ts">
import { maintenant, isoJour } from '../../utils/horloge'
import { devise } from '../../lib/monnaie'
/**
 * Fiche d'ordre de travail : déclaration, diagnostic ISO 14224, pièces et
 * main-d'œuvre, atelier externe, clôture. La fin d'intervention se fait en
 * deux temps : le technicien interne, ou l'atelier externe, déclare
 * l'intervention terminée ; le responsable maintenance valide la clôture.
 */
import { ref, computed, watch } from 'vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { CheckCircle2, Circle } from '@lucide/vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { usePrestatairesStore } from '../../stores/prestataires'
import { useAchatsStore } from '../../stores/achats'
import { useAuthStore } from '../../stores/auth'
import { useCodificationIndispoStore } from '../../stores/codificationIndispo'
import { formatDate } from '../../utils/helpers'
import {
  LIB_ORIGINE_OT, LIB_SOUS_SYSTEME, LIB_MODE_DEFAILLANCE, LIB_CAUSE_RACINE,
  LIB_TYPE_MAINTENANCE, LIB_GRAVITE_OT, LIB_STATUT_OT, LIB_STATUT_ACHAT,
} from '../../types/maintenance'
import { useNomenclatureStore } from '../../stores/nomenclature'
import type { OrdreTravail, SousSysteme, ModeDefaillance, CauseRacine } from '../../types/maintenance'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as cls from '../../lib/formClasses'

const props = defineProps<{ ordres: OrdreTravail[]; ordreId: string }>()
const emit = defineEmits<{ close: []; creer: [] }>()

const store = useMaintenanceStore()
const idCourant = ref(props.ordreId)
watch(() => props.ordreId, v => { idCourant.value = v })
const item = computed<OrdreTravail | null>(() => store.getById(idCourant.value) ?? props.ordres.find(o => o.id === idCourant.value) ?? null)

const index = computed(() => props.ordres.findIndex(o => o.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.ordres.length - 1)
const sidebarItems = computed(() => props.ordres.map(o => ({ no: o.reference, label: o.vehiculePlaque })))
function goPrev() { if (hasPrev.value) idCourant.value = props.ordres[index.value - 1]!.id }
function goNext() { if (hasNext.value) idCourant.value = props.ordres[index.value + 1]!.id }
function selectSidebar(no: string) { const o = props.ordres.find(x => x.reference === no); if (o) idCourant.value = o.id }

const CLS_STATUT: Record<string, string> = {
  ouvert: 'bg-info-bg text-info', diagnostique: 'bg-primary/10 text-primary',
  attente_piece: 'bg-warning-bg text-warning', en_cours: 'bg-primary/10 text-primary',
  attente_validation: 'bg-warning-bg text-warning', cloture: 'bg-success-bg text-success', annule: 'bg-neutral-bg text-neutral',
}

/* ── Déclaration : priorité et cause d'indisponibilité ─────────── */
const LIB_PRIORITE: Record<number, string> = { 1: 'Haute', 2: 'Moyenne', 3: 'Basse' }
const codif = useCodificationIndispoStore()
const causeIndispo = computed(() => {
  const i = item.value ? store.indispoDeLOT(item.value.id) : undefined
  return i ? `${i.code} · ${codif.libelleDuCode(i.code)}` : null
})
const actif = computed(() => !!item.value && item.value.statut !== 'cloture' && item.value.statut !== 'annule' && item.value.statut !== 'attente_validation')

/* ── Diagnostic ISO 14224 ─────────────────────────────────────── */
const diagOuvert = ref(false)
const erreurDiag = ref('')
const diagLocal = ref({ sousSysteme: '' as SousSysteme | '', modeDefaillance: '' as ModeDefaillance | '', causeRacine: '' as CauseRacine | '' })
function ouvrirDiag() {
  if (!item.value) return
  diagLocal.value = { sousSysteme: item.value.sousSysteme ?? '', modeDefaillance: item.value.modeDefaillance ?? '', causeRacine: item.value.causeRacine ?? '' }
  diagOuvert.value = true
}
function validerDiag() {
  if (!item.value) return
  const r = store.diagnostiquer(item.value.id, {
    sousSysteme: diagLocal.value.sousSysteme || undefined, modeDefaillance: diagLocal.value.modeDefaillance || undefined, causeRacine: diagLocal.value.causeRacine || undefined,
  }, moi.value)
  erreurDiag.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) diagOuvert.value = false
}
const nomenclature = useNomenclatureStore()
const optSousSysteme = computed<DropdownItem[]>(() => nomenclature.optSousSystemes)
const optModeDefaillance = computed<DropdownItem[]>(() => nomenclature.optModes)
const optCauseRacine = computed<DropdownItem[]>(() => nomenclature.optCauses)
const systemeLocal = computed(() => nomenclature.libelleSysteme(diagLocal.value.sousSysteme || undefined))
const estPreventif = computed(() => item.value?.typeMaintenance === 'preventif')

/* ── Pièces : stock consulté depuis l'ordre, demande d'achat si elle manque (FMS-MA-05) ── */
const achats = useAchatsStore()
const auth = useAuthStore()
const moi = computed(() => auth.user?.nom ?? 'Utilisateur')
const erreurPiece = ref('')
const pieceOuverte = ref(false)
const pieceLocale = ref({ produitId: '', reference: '', designation: '', quantite: 1, prixUnitaireAr: 0 })
const optProduits = computed<DropdownItem[]>(() => achats.produits.map(p => ({ id: p.id, label: p.designation, sublabel: `${p.reference} · ${p.stockActuel} en stock` })))
const produitChoisi = computed(() => achats.getProduit(pieceLocale.value.produitId))
watch(() => pieceLocale.value.produitId, id => {
  const p = achats.getProduit(id)
  if (p) Object.assign(pieceLocale.value, { reference: p.reference, designation: p.designation, prixUnitaireAr: p.prixUnitaireAr })
})
const stockSuffisant = computed(() => !!produitChoisi.value && produitChoisi.value.stockActuel >= pieceLocale.value.quantite)
function reinitPiece() { pieceOuverte.value = false; erreurPiece.value = ''; pieceLocale.value = { produitId: '', reference: '', designation: '', quantite: 1, prixUnitaireAr: 0 } }
function sortirDuStock() {
  if (!item.value) return
  const r = store.consommerPiece(item.value.id, pieceLocale.value)
  if (!r.ok) { erreurPiece.value = r.motif ?? ''; return }
  reinitPiece()
}
function demanderAchat() {
  if (!item.value) return
  const r = store.demanderAchat(item.value.id, pieceLocale.value)
  if (!r.ok) { erreurPiece.value = r.motif ?? ''; return }
  reinitPiece()
}
const demandesOT = computed(() => item.value ? store.demandesDeLOT(item.value.id) : [])
const bonCommande = ref<Record<string, string>>({})
const erreurAchat = ref('')
function suivre(daId: string, etape: 'commandee' | 'receptionnee') {
  const r = store.suivreAchat(daId, etape, { numeroBonCommande: bonCommande.value[daId] })
  erreurAchat.value = r.ok ? '' : r.motif ?? ''
}

/* ── Main-d'œuvre (FMS-MA-03) ─────────────────────────────────── */
const tempsLocal = ref({ mecanicienNom: '', heures: undefined as number | undefined, date: isoJour(maintenant()) })
const erreurTemps = ref('')
const optTechniciens = computed<DropdownItem[]>(() => item.value ? store.techniciensPour(item.value).map(t => ({ id: t.nom, label: t.nom, sublabel: t.competences.map(store.libelleCompetence).join(', ') })) : [])
function ajouterTemps() {
  if (!item.value) return
  const r = store.ajouterTemps(item.value.id, { mecanicienNom: tempsLocal.value.mecanicienNom, heures: tempsLocal.value.heures ?? 0, date: tempsLocal.value.date })
  erreurTemps.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) tempsLocal.value = { mecanicienNom: tempsLocal.value.mecanicienNom, heures: undefined, date: tempsLocal.value.date }
}
const operationsDuPlan = computed(() => {
  const o = item.value; if (!o?.operationsPlan?.length) return []
  const plan = store.plans.find(p => p.operations.some(op => o.operationsPlan!.includes(op.id)))
  return plan?.operations.filter(op => o.operationsPlan!.includes(op.id)) ?? []
})
watch(idCourant, () => { reinitPiece(); erreurTemps.value = ''; erreurAchat.value = ''; erreurDiag.value = ''; diagOuvert.value = false; erreurCloture.value = ''; erreurExterne.value = '' })

/* ── Clôture en deux temps ────────────────────────────────────── */
const travauxLocal = ref('')
const erreurCloture = ref('')
watch(item, v => { travauxLocal.value = v?.travauxRealises ?? '' }, { immediate: true })
function cloturerOT() {
  if (!item.value) return
  const r = store.cloturer(item.value.id, travauxLocal.value, moi.value)
  erreurCloture.value = r.ok ? '' : r.motif ?? ''
}
function validerResp() { if (item.value) { const r = store.validerParResponsable(item.value.id, moi.value); erreurCloture.value = r.ok ? '' : r.motif ?? '' } }
function refuserFin() { if (item.value) { const r = store.refuserFin(item.value.id); erreurCloture.value = r.ok ? '' : r.motif ?? '' } }

/* ── Atelier externe ──────────────────────────────────────────── */
const prestatairesStore = usePrestatairesStore()
const optAteliers = computed<DropdownItem[]>(() => prestatairesStore.ateliersAutorises.map(p => ({ id: p.id, label: p.nom })))
const externeOuvert = ref(false)
const erreurExterne = ref('')
const externeLocal = ref({ prestataireId: '', remiseLe: '', retourPrevuLe: '', montantDevisAr: undefined as number | undefined })
function confierExterne() {
  const p = prestatairesStore.getById(externeLocal.value.prestataireId)
  if (!item.value || !p || !externeLocal.value.remiseLe) { erreurExterne.value = "Choisissez l'atelier et la date de remise du véhicule."; return }
  if (!p.autorise) { erreurExterne.value = `${p.nom} n'est pas un atelier autorisé.`; return }
  const r = store.confierAtelierExterne(item.value.id, { prestataireId: p.id, prestataireNom: p.nom, remiseLe: externeLocal.value.remiseLe,
    retourPrevuLe: externeLocal.value.retourPrevuLe || undefined, montantDevisAr: externeLocal.value.montantDevisAr })
  erreurExterne.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) externeOuvert.value = false
}
/* Suivi modifiable jusqu'au retour : avancement, retour prévu, devis. */
const suiviLocal = ref({ avancement: '', retourPrevuLe: '', montantDevisAr: undefined as number | undefined })
watch(item, v => { suiviLocal.value = { avancement: v?.avancementExterne ?? '', retourPrevuLe: v?.retourPrevuLe?.slice(0, 10) ?? '', montantDevisAr: v?.montantDevisAr } }, { immediate: true })
const succesExterne = ref('')
function majSuivi() {
  if (!item.value) return
  const r = store.suivreAtelierExterne(item.value.id, { avancement: suiviLocal.value.avancement, retourPrevuLe: suiviLocal.value.retourPrevuLe,
    montantDevisAr: suiviLocal.value.montantDevisAr == null || (suiviLocal.value.montantDevisAr as unknown) === '' ? null : suiviLocal.value.montantDevisAr })
  erreurExterne.value = r.ok ? '' : r.motif ?? ''
  succesExterne.value = r.ok ? 'Suivi enregistré.' : ''
}
const retourLocal = ref({ date: '', montantFinalAr: undefined as number | undefined })
function retourExterne() {
  if (!item.value) return
  const m = retourLocal.value.montantFinalAr
  const r = store.retourAtelierExterne(item.value.id, travauxLocal.value, retourLocal.value.date, m == null || (m as unknown) === '' ? null : m)
  erreurExterne.value = r.ok ? '' : r.motif ?? ''
  succesExterne.value = ''
}
const fmtMontant = (n?: number) => n != null ? `${n.toLocaleString('fr-FR')} ${devise()}` : '-'
</script>

<template>
  <CardModalShell
    v-if="item"
    :page-title="`${item.reference} · ${item.vehiculePlaque}`"
    :page-number="item.reference"
    banner-label="Ordre de travail"
    :is-edit-mode="false"
    :sidebar-items="sidebarItems"
    :current-no="item.reference"
    :has-prev="hasPrev"
    :has-next="hasNext"
    hide-action-bar
    @close="emit('close')"
    @create="emit('creer')"
    @go-prev="goPrev"
    @go-next="goNext"
    @select-sidebar="selectSidebar"
  >
    <template #title-badges>
      <span class="text-[11px] font-medium px-2.5 py-[3px] rounded-full" :class="CLS_STATUT[item.statut]">{{ LIB_STATUT_OT[item.statut] }}</span>
      <span class="text-[11px] font-medium px-2.5 py-[3px] rounded-full" :class="LIB_GRAVITE_OT[item.gravite].cls">{{ LIB_GRAVITE_OT[item.gravite].label }}</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-4xl mx-auto">

        <!-- 1. DÉCLARATION -->
        <FormSection title="Déclaration" :recaps="[item.vehiculePlaque, item.repriseHistorique ? 'Reprise de l\'historique' : LIB_ORIGINE_OT[item.origine]]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Véhicule</label><span class="text-sm font-mono text-foreground">{{ item.vehiculePlaque }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Déclaré par</label><span class="text-sm text-foreground">{{ item.declarePar }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Origine</label><span class="text-sm text-foreground">{{ item.repriseHistorique ? "Reprise de l'historique" : LIB_ORIGINE_OT[item.origine] }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Priorité</label><span class="text-sm text-foreground">{{ LIB_PRIORITE[store.prioriteDe(item)] }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Cause d'indisponibilité</label><span class="text-sm text-foreground">{{ causeIndispo ?? '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Déclaré le</label><span class="text-sm text-foreground">{{ fmtDateHeure(item.declareLe) }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Type</label><span class="text-sm text-foreground">{{ LIB_TYPE_MAINTENANCE[item.typeMaintenance] }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Kilométrage</label><span class="text-sm text-foreground">{{ item.kilometrage?.toLocaleString('fr-FR') ?? '-' }} km</span></div>
          </div>
          <div v-if="operationsDuPlan.length" class="flex flex-col gap-1 mt-4">
            <label class="text-[11px] font-semibold text-muted-foreground uppercase">Opérations du plan d'entretien</label>
            <p v-for="op in operationsDuPlan" :key="op.id" class="text-xs text-foreground">{{ op.libelle }}</p>
          </div>
          <div class="flex flex-col gap-1 mt-4">
            <label class="text-[11px] font-semibold text-muted-foreground uppercase">Symptôme constaté</label>
            <p class="text-sm text-foreground leading-relaxed">{{ item.symptome }}</p>
          </div>
        </FormSection>

        <!-- 2. DIAGNOSTIC ISO 14224 -->
        <FormSection title="Diagnostic" :recaps="[item.sousSysteme ? LIB_SOUS_SYSTEME[item.sousSysteme] : 'à établir']">
          <div v-if="item.sousSysteme && !diagOuvert" class="grid grid-cols-4 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Système</label><span class="text-sm text-foreground">{{ nomenclature.libelleSysteme(item.sousSysteme) ?? '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Sous-système</label><span class="text-sm text-foreground">{{ LIB_SOUS_SYSTEME[item.sousSysteme] }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Mode de défaillance</label><span class="text-sm text-foreground">{{ item.modeDefaillance ? LIB_MODE_DEFAILLANCE[item.modeDefaillance] : '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Cause racine</label><span class="text-sm text-foreground">{{ item.causeRacine ? LIB_CAUSE_RACINE[item.causeRacine] : '-' }}</span></div>
          </div>
          <p v-else-if="!diagOuvert && !actif" class="text-xs text-muted-foreground">-</p>
          <div v-if="!diagOuvert && actif" class="mt-3">
            <button :class="cls.btnOutline" @click="ouvrirDiag">{{ item.sousSysteme ? 'Modifier le diagnostic' : 'Établir le diagnostic' }}</button>
          </div>
          <div v-else-if="diagOuvert" class="flex flex-col gap-3 mt-2">
            <div :class="cls.field"><label :class="cls.fieldLabel">Sous-système *</label><SearchableDropdown v-model="diagLocal.sousSysteme" :items="optSousSysteme" placeholder="Sélectionner…" /></div>
            <div v-if="systemeLocal" class="text-xs text-muted-foreground">Système : <span class="text-foreground">{{ systemeLocal }}</span></div>
            <div :class="cls.field"><label :class="cls.fieldLabel">Mode de défaillance{{ estPreventif ? '' : ' *' }}</label><SearchableDropdown v-model="diagLocal.modeDefaillance" :items="optModeDefaillance" placeholder="Sélectionner…" /></div>
            <div :class="cls.field"><label :class="cls.fieldLabel">Cause racine{{ estPreventif ? '' : ' *' }}</label><SearchableDropdown v-model="diagLocal.causeRacine" :items="optCauseRacine" placeholder="Sélectionner…" /></div>
            <p v-if="erreurDiag" class="text-[12px] text-danger">{{ erreurDiag }}</p>
            <div class="flex gap-2"><button :class="cls.btnOutline" @click="diagOuvert = false; erreurDiag = ''">Annuler</button><button :class="cls.btnPrimary" @click="validerDiag">Enregistrer le diagnostic</button></div>
          </div>
        </FormSection>

        <!-- 3. PIÈCES ET MAIN-D'ŒUVRE -->
        <FormSection title="Pièces et main-d'œuvre" :recaps="[`${item.pieces.length} pièce(s)`, store.heuresOT(item) ? store.heuresOT(item) + ' h' : null]">
          <table class="w-full border-collapse mb-3" v-if="item.pieces.length">
            <thead><tr class="border-b border-border">
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Désignation</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Qté</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Prix unit.</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Origine</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Stock</th>
            </tr></thead>
            <tbody>
              <tr v-for="p in item.pieces" :key="p.id" class="border-b border-border/60">
                <td class="py-2 text-xs">{{ p.designation }}</td>
                <td class="py-2 text-xs">{{ p.quantite }}</td>
                <td class="py-2 text-xs">{{ p.prixUnitaireAr.toLocaleString('fr-FR') }} {{ $devise() }}</td>
                <td class="py-2 text-xs">{{ p.origine === 'stock' ? 'Sortie de stock' : `Achat ${p.demandeAchatId ?? ''}` }}</td>
                <td class="py-2 text-xs">{{ achats.getProduitParReference(p.reference)?.stockActuel ?? 'non suivie' }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-xs text-muted-foreground mb-3">Aucune pièce consommée.</p>

          <template v-if="item.statut !== 'cloture' && item.statut !== 'annule' && item.statut !== 'attente_validation'">
          <button v-if="!pieceOuverte" :class="cls.btnOutline" @click="pieceOuverte = true">Ajouter une pièce</button>
          <div v-else class="flex flex-col gap-3 mt-2">
            <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <div :class="cls.field" class="col-span-2 max-sm:col-span-1"><label :class="cls.fieldLabel">Pièce du stock</label><SearchableDropdown v-model="pieceLocale.produitId" :items="optProduits" placeholder="Chercher dans le stock…" /></div>
              <div :class="cls.field"><label :class="cls.fieldLabel">Référence</label><input v-model="pieceLocale.reference" :class="cls.fieldInput" :disabled="!!produitChoisi" /></div>
              <div :class="cls.field"><label :class="cls.fieldLabel">Désignation *</label><input v-model="pieceLocale.designation" :class="cls.fieldInput" :disabled="!!produitChoisi" /></div>
              <div :class="cls.field"><label :class="cls.fieldLabel">Quantité</label><input v-model.number="pieceLocale.quantite" type="number" min="1" :class="cls.fieldInput" /></div>
              <div :class="cls.field"><label :class="cls.fieldLabel">Prix unitaire ({{ $devise() }})</label><input v-model.number="pieceLocale.prixUnitaireAr" type="number" min="0" :class="cls.fieldInput" /></div>
            </div>
            <p v-if="produitChoisi" class="text-[12px]" :class="stockSuffisant ? 'text-success' : 'text-warning'">
              {{ produitChoisi.stockActuel }} en stock{{ stockSuffisant ? '' : ' : quantité insuffisante, une demande d’achat est nécessaire' }}
            </p>
            <p v-if="erreurPiece" class="text-[12px] text-danger">{{ erreurPiece }}</p>
            <div class="flex gap-2 flex-wrap">
              <button :class="cls.btnOutline" @click="reinitPiece">Annuler</button>
              <button v-if="stockSuffisant" :class="cls.btnPrimary" @click="sortirDuStock">Sortir du stock</button>
              <button :class="stockSuffisant ? cls.btnOutline : cls.btnPrimary" @click="demanderAchat">Demander l'achat</button>
            </div>
          </div>
          </template>

          <div v-if="demandesOT.length" class="mt-3.5">
            <p class="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">Demandes d'achat</p>
            <div v-for="d in demandesOT" :key="d.id" class="flex items-center gap-2 py-1.5 border-b border-border/60 text-xs flex-wrap">
              <span class="font-mono">{{ d.id }}</span>
              <span class="flex-1 min-w-[140px]">{{ d.designation }} × {{ d.quantite }}</span>
              <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="d.statut === 'receptionnee' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'">{{ LIB_STATUT_ACHAT[d.statut] }}</span>
              <span v-if="d.numeroBonCommande" class="text-[11px] text-muted-foreground">{{ d.numeroBonCommande }}</span>
              <span v-if="d.delaiJours != null && d.statut === 'receptionnee'" class="text-[11px] text-muted-foreground">reçue en {{ d.delaiJours }} j</span>
              <template v-if="d.statut === 'demandee'">
                <input v-model="bonCommande[d.id]" :class="cls.fieldInput" class="!h-[28px] !w-[130px] !text-[11px]" placeholder="N° bon de commande" />
                <button :class="cls.btnOutline" class="!py-1 !px-2 !text-[11px]" @click="suivre(d.id, 'commandee')">Commandée</button>
              </template>
              <button v-else-if="d.statut === 'commandee'" :class="cls.btnOutline" class="!py-1 !px-2 !text-[11px]" @click="suivre(d.id, 'receptionnee')">Pièce reçue</button>
            </div>
            <p v-if="erreurAchat" class="text-[12px] text-danger mt-1.5">{{ erreurAchat }}</p>
          </div>

          <div class="mt-3.5 pt-3.5 border-t border-border">
            <p class="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">Main-d'œuvre</p>
            <div v-for="t in item.temps" :key="t.id" class="flex items-center gap-2 py-1 text-xs">
              <span class="flex-1">{{ t.mecanicienNom }}</span><span>{{ t.heures }} h</span><span class="text-muted-foreground">{{ formatDate(t.date) }}</span>
            </div>
            <p v-if="!item.temps.length" class="text-xs text-muted-foreground">Aucun temps saisi.</p>
            <div v-if="!item.prestataire && item.statut !== 'cloture' && item.statut !== 'annule' && item.statut !== 'attente_validation'" class="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end mt-2 max-sm:grid-cols-1">
              <div :class="cls.field"><label :class="cls.fieldLabel">Technicien</label><SearchableDropdown v-model="tempsLocal.mecanicienNom" :items="optTechniciens" placeholder="Choisir…" /></div>
              <div :class="cls.field"><label :class="cls.fieldLabel">Heures</label><input v-model.number="tempsLocal.heures" type="number" min="0" step="0.5" :class="cls.fieldInput" /></div>
              <div :class="cls.field"><label :class="cls.fieldLabel">Date</label><input v-model="tempsLocal.date" type="date" :class="cls.fieldInput" /></div>
              <button :class="cls.btnOutline" @click="ajouterTemps">Ajouter</button>
            </div>
            <p v-if="erreurTemps" class="text-[12px] text-danger mt-1.5">{{ erreurTemps }}</p>
          </div>

          <div v-if="item.repriseHistorique" class="mt-3.5 pt-3.5 border-t border-border">
            <span class="text-[11px] text-muted-foreground">Coût repris de l'historique</span><p class="text-sm font-semibold">{{ fmtMontant(item.coutRepriseAr ?? 0) }}</p>
          </div>
          <div v-else class="mt-3.5 pt-3.5 border-t border-border grid grid-cols-4 gap-4 max-sm:grid-cols-1">
            <div><span class="text-[11px] text-muted-foreground">Coût des pièces</span><p class="text-sm font-semibold">{{ fmtMontant(store.coutPieces(item)) }}</p></div>
            <div><span class="text-[11px] text-muted-foreground">Coût de la main-d'œuvre</span><p class="text-sm font-semibold">{{ store.coutMainOeuvre(item) != null ? fmtMontant(store.coutMainOeuvre(item)!) : 'tarif à renseigner' }}</p></div>
            <div><span class="text-[11px] text-muted-foreground">Coût de l'atelier externe</span><p class="text-sm font-semibold">{{ fmtMontant(store.coutSousTraitance(item)) }}</p></div>
            <div><span class="text-[11px] text-muted-foreground">Coût total (pièces, main-d'œuvre et atelier externe)</span><p class="text-sm font-semibold">{{ fmtMontant(store.coutOT(item)) }}</p></div>
          </div>
        </FormSection>

        <!-- 4. ATELIER EXTERNE -->
        <FormSection v-if="!item.repriseHistorique" title="Atelier externe" :recaps="[item.prestataire ?? 'atelier interne']" :default-open="!!item.prestataire">
          <template v-if="item.prestataire">
            <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
              <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Atelier</label><span class="text-sm text-foreground">{{ item.prestataire }}</span></div>
              <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Remis le</label><span class="text-sm text-foreground">{{ item.remiseAtelierLe ? new Date(item.remiseAtelierLe).toLocaleDateString('fr-FR') : '-' }}</span></div>
              <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">{{ item.retourLe ? 'Retour le' : 'Retour prévu le' }}</label><span class="text-sm text-foreground">{{ (item.retourLe ?? item.retourPrevuLe) ? new Date((item.retourLe ?? item.retourPrevuLe)!).toLocaleDateString('fr-FR') : '-' }}</span></div>
              <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Montant du devis</label><span class="text-sm text-foreground">{{ fmtMontant(item.montantDevisAr) }}</span></div>
              <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Montant final</label><span class="text-sm text-foreground">{{ fmtMontant(item.montantFinalAr) }}</span></div>
              <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Avancement</label><span class="text-sm text-foreground">{{ item.avancementExterne ?? '-' }}</span></div>
            </div>
            <template v-if="actif && !item.retourLe">
              <div class="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end mt-4 max-sm:grid-cols-1">
                <div :class="cls.field"><label :class="cls.fieldLabel">Avancement communiqué par l'atelier</label><input v-model="suiviLocal.avancement" :class="cls.fieldInput" placeholder="Ex. pièce reçue, remontage en cours…" /></div>
                <div :class="cls.field"><label :class="cls.fieldLabel">Retour prévu</label><input v-model="suiviLocal.retourPrevuLe" type="date" :class="cls.fieldInput" /></div>
                <div :class="cls.field"><label :class="cls.fieldLabel">Montant du devis ({{ $devise() }})</label><input v-model.number="suiviLocal.montantDevisAr" type="number" min="0" :class="cls.fieldInput" /></div>
                <button :class="cls.btnOutline" @click="majSuivi">Enregistrer</button>
              </div>
              <div class="grid grid-cols-[1fr_1fr_auto] gap-2 items-end mt-3 max-sm:grid-cols-1">
                <div :class="cls.field"><label :class="cls.fieldLabel">Date de retour du véhicule *</label><input v-model="retourLocal.date" type="date" :class="cls.fieldInput" /></div>
                <div :class="cls.field"><label :class="cls.fieldLabel">Montant final ({{ $devise() }})</label><input v-model.number="retourLocal.montantFinalAr" type="number" min="0" :class="cls.fieldInput" /></div>
                <button :class="cls.btnPrimary" @click="retourExterne">Retour : l'atelier déclare l'intervention terminée</button>
              </div>
            </template>
          </template>
          <template v-else-if="actif">
            <button v-if="!externeOuvert" :class="cls.btnOutline" @click="externeOuvert = true">Confier à un atelier externe</button>
            <div v-else class="flex flex-col gap-3">
              <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <div :class="cls.field"><label :class="cls.fieldLabel">Atelier *</label><SearchableDropdown v-model="externeLocal.prestataireId" :items="optAteliers" placeholder="Choisir un atelier autorisé…" /></div>
                <div :class="cls.field"><label :class="cls.fieldLabel">Remise du véhicule *</label><input v-model="externeLocal.remiseLe" type="date" :class="cls.fieldInput" /></div>
                <div :class="cls.field"><label :class="cls.fieldLabel">Retour prévu</label><input v-model="externeLocal.retourPrevuLe" type="date" :class="cls.fieldInput" /></div>
                <div :class="cls.field"><label :class="cls.fieldLabel">Montant du devis ({{ $devise() }})</label><input v-model.number="externeLocal.montantDevisAr" type="number" min="0" :class="cls.fieldInput" /></div>
              </div>
              <div class="flex gap-2"><button :class="cls.btnOutline" @click="externeOuvert = false; erreurExterne = ''">Annuler</button><button :class="cls.btnPrimary" @click="confierExterne">Confier l'intervention</button></div>
            </div>
          </template>
          <p v-else class="text-xs text-muted-foreground">Intervention réalisée par l'atelier interne.</p>
          <p v-if="erreurExterne" class="text-[12px] text-danger mt-2">{{ erreurExterne }}</p>
          <p v-else-if="succesExterne" class="text-[12px] text-success mt-2">{{ succesExterne }}</p>
        </FormSection>

        <!-- 5. CLÔTURE -->
        <FormSection title="Clôture" :recaps="[LIB_STATUT_OT[item.statut]]" :default-open="item.statut !== 'ouvert' && item.statut !== 'diagnostique'">
          <template v-if="item.statut === 'cloture'">
            <div class="flex items-center gap-2 text-success text-sm mb-3"><CheckCircle2 class="w-4 h-4" /> Ordre clôturé le {{ fmtDateHeure(item.clotureLe!) }}<template v-if="item.valideParResponsable">, validé par {{ item.valideParResponsable }}</template></div>
            <p class="text-xs text-foreground leading-relaxed mb-3">{{ item.travauxRealises }}</p>
          </template>
          <template v-else>
            <div :class="cls.field" class="mb-3">
              <label :class="cls.fieldLabel">Travaux réalisés *</label>
              <textarea v-model="travauxLocal" rows="3" :class="cls.fieldTextarea" placeholder="Description des travaux effectués…" :disabled="item.statut === 'attente_validation'"></textarea>
            </div>
            <button v-if="item.statut !== 'attente_validation' && !item.prestataire" :class="cls.btnPrimary" @click="cloturerOT">Le technicien déclare l'intervention terminée</button>

            <div v-else-if="item.statut === 'attente_validation'" class="flex flex-col gap-2 mt-2">
              <div class="flex items-center gap-2 text-xs">
                <CheckCircle2 class="w-4 h-4 text-success" />
                <span>Intervention déclarée terminée par {{ item.termineDeclarePar ?? item.cloturePar }}<template v-if="item.termineDeclareLe">, le {{ fmtDateHeure(item.termineDeclareLe) }}</template></span>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <Circle class="w-4 h-4 text-muted-foreground" />
                <span>Validation du responsable maintenance : en attente</span>
                <template v-if="item.termineDeclarePar !== moi">
                <button :class="cls.btnOutline" class="ml-auto !py-1 !px-2.5 !text-[11px]" @click="refuserFin">Refuser, l'intervention reprend</button>
                <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="validerResp">Valider et clôturer</button>
                </template>
              </div>
            </div>
            <p v-if="erreurCloture" class="text-[12px] text-danger mt-2">{{ erreurCloture }}</p>
          </template>
        </FormSection>

      </div>
    </template>
  </CardModalShell>
</template>
