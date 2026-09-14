<script setup lang="ts">
/**
 * Fiche d'ordre de travail, reprise de la structure du socle FMS :
 * déclaration, diagnostic ISO 14224, pièces et main-d'œuvre, clôture.
 * La clôture suit la règle du cahier des charges UCODIS - plus stricte
 * que celle du socle FMS - avec triple validation technicien, responsable,
 * puis directeur, chacune horodatée.
 */
import { ref, computed, watch } from 'vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { CheckCircle2, Circle, TriangleAlert } from '@lucide/vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import {
  LIB_ORIGINE_OT, LIB_SOUS_SYSTEME, LIB_MODE_DEFAILLANCE, LIB_CAUSE_RACINE,
  LIB_TYPE_MAINTENANCE, LIB_GRAVITE_OT, LIB_STATUT_OT,
} from '../../types/maintenance'
import type { OrdreTravail, SousSysteme, ModeDefaillance, CauseRacine } from '../../types/maintenance'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as cls from '../../lib/formClasses'

const props = defineProps<{ ordres: OrdreTravail[]; ordreId: string }>()
const emit = defineEmits<{ close: [] }>()

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

/* ── Diagnostic ISO 14224 ─────────────────────────────────────── */
const diagOuvert = ref(false)
const diagLocal = ref({ sousSysteme: '' as SousSysteme | '', modeDefaillance: '' as ModeDefaillance | '', causeRacine: '' as CauseRacine | '' })
function ouvrirDiag() {
  if (!item.value) return
  diagLocal.value = { sousSysteme: item.value.sousSysteme ?? '', modeDefaillance: item.value.modeDefaillance ?? '', causeRacine: item.value.causeRacine ?? '' }
  diagOuvert.value = true
}
function validerDiag() {
  if (!item.value || !diagLocal.value.sousSysteme || !diagLocal.value.modeDefaillance || !diagLocal.value.causeRacine) return
  store.diagnostiquer(item.value.id, {
    sousSysteme: diagLocal.value.sousSysteme, modeDefaillance: diagLocal.value.modeDefaillance, causeRacine: diagLocal.value.causeRacine,
  }, 'Rakoto Andrianina')
  diagOuvert.value = false
}
const optSousSysteme: DropdownItem[] = Object.entries(LIB_SOUS_SYSTEME).map(([id, label]) => ({ id, label }))
const optModeDefaillance: DropdownItem[] = Object.entries(LIB_MODE_DEFAILLANCE).map(([id, label]) => ({ id, label }))
const optCauseRacine: DropdownItem[] = Object.entries(LIB_CAUSE_RACINE).map(([id, label]) => ({ id, label }))

/* ── Pièces ───────────────────────────────────────────────────── */
const pieceOuverte = ref(false)
const pieceLocale = ref({ reference: '', designation: '', quantite: 1, prixUnitaireAr: 0, origine: 'stock' as 'stock' | 'achat' })
function ajouterPiece() {
  if (!item.value || !pieceLocale.value.designation.trim()) return
  store.ajouterPiece(item.value.id, { ...pieceLocale.value })
  pieceOuverte.value = false
  pieceLocale.value = { reference: '', designation: '', quantite: 1, prixUnitaireAr: 0, origine: 'stock' }
}

/* ── Clôture et triple validation ─────────────────────────────── */
const travauxLocal = ref('')
watch(item, v => { travauxLocal.value = v?.travauxRealises ?? '' })
function cloturerOT() {
  if (!item.value) return
  const ok = store.cloturer(item.value.id, travauxLocal.value, 'Rakoto Andrianina')
  if (!ok) alert("Diagnostic incomplet ou description des travaux manquante : la clôture n'est pas possible.")
}
function validerResp() { if (item.value) store.validerParResponsable(item.value.id, 'Hery Andriamalala') }
function validerDir() { if (item.value) store.validerParDirecteur(item.value.id, 'Directeur UCODIS') }
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
        <FormSection title="Déclaration" :recaps="[item.vehiculePlaque, LIB_ORIGINE_OT[item.origine]]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Véhicule</label><span class="text-sm font-mono text-foreground">{{ item.vehiculePlaque }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Déclaré par</label><span class="text-sm text-foreground">{{ item.declarePar }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Origine</label><span class="text-sm text-foreground">{{ LIB_ORIGINE_OT[item.origine] }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Déclaré le</label><span class="text-sm text-foreground">{{ fmtDateHeure(item.declareLe) }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Type</label><span class="text-sm text-foreground">{{ LIB_TYPE_MAINTENANCE[item.typeMaintenance] }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Kilométrage</label><span class="text-sm text-foreground">{{ item.kilometrage?.toLocaleString('fr-FR') ?? '-' }} km</span></div>
          </div>
          <div class="flex flex-col gap-1 mt-4">
            <label class="text-[11px] font-semibold text-muted-foreground uppercase">Symptôme constaté</label>
            <p class="text-sm text-foreground leading-relaxed">{{ item.symptome }}</p>
          </div>
        </FormSection>

        <!-- 2. DIAGNOSTIC ISO 14224 -->
        <FormSection title="Diagnostic" :recaps="[item.sousSysteme ? LIB_SOUS_SYSTEME[item.sousSysteme] : 'à établir']">
          <div v-if="item.sousSysteme && !diagOuvert" class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Sous-système</label><span class="text-sm text-foreground">{{ LIB_SOUS_SYSTEME[item.sousSysteme] }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Mode de défaillance</label><span class="text-sm text-foreground">{{ item.modeDefaillance ? LIB_MODE_DEFAILLANCE[item.modeDefaillance] : '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Cause racine</label><span class="text-sm text-foreground">{{ item.causeRacine ? LIB_CAUSE_RACINE[item.causeRacine] : '-' }}</span></div>
          </div>
          <div v-if="!diagOuvert" class="mt-3">
            <button :class="cls.btnOutline" @click="ouvrirDiag">{{ item.sousSysteme ? 'Modifier le diagnostic' : 'Établir le diagnostic' }}</button>
          </div>
          <div v-else class="flex flex-col gap-3 mt-2">
            <div :class="cls.field"><label :class="cls.fieldLabel">Sous-système *</label><SearchableDropdown v-model="diagLocal.sousSysteme" :items="optSousSysteme" placeholder="Sélectionner…" /></div>
            <div :class="cls.field"><label :class="cls.fieldLabel">Mode de défaillance *</label><SearchableDropdown v-model="diagLocal.modeDefaillance" :items="optModeDefaillance" placeholder="Sélectionner…" /></div>
            <div :class="cls.field"><label :class="cls.fieldLabel">Cause racine *</label><SearchableDropdown v-model="diagLocal.causeRacine" :items="optCauseRacine" placeholder="Sélectionner…" /></div>
            <div class="flex gap-2"><button :class="cls.btnOutline" @click="diagOuvert = false">Annuler</button><button :class="cls.btnPrimary" @click="validerDiag">Enregistrer le diagnostic</button></div>
          </div>
          <p v-if="!item.sousSysteme" class="text-[11px] text-warning mt-2">La clôture de cet ordre est impossible tant que le diagnostic n'est pas établi.</p>
        </FormSection>

        <!-- 3. PIÈCES ET MAIN-D'ŒUVRE -->
        <FormSection title="Pièces et main-d'œuvre" :recaps="[`${item.pieces.length} pièce(s)`, store.heuresOT(item) ? store.heuresOT(item) + ' h' : null]">
          <table class="w-full border-collapse mb-3" v-if="item.pieces.length">
            <thead><tr class="border-b border-border">
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Désignation</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Qté</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Prix unit.</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Origine</th>
            </tr></thead>
            <tbody>
              <tr v-for="p in item.pieces" :key="p.id" class="border-b border-border/60">
                <td class="py-2 text-xs">{{ p.designation }}</td>
                <td class="py-2 text-xs">{{ p.quantite }}</td>
                <td class="py-2 text-xs">{{ p.prixUnitaireAr.toLocaleString('fr-FR') }} Ar</td>
                <td class="py-2 text-xs">{{ p.origine === 'stock' ? 'Stock' : 'Achat' }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-xs text-muted-foreground mb-3">Aucune pièce consommée.</p>

          <button v-if="!pieceOuverte" :class="cls.btnOutline" @click="pieceOuverte = true">Ajouter une pièce</button>
          <div v-else class="flex flex-col gap-3 mt-2">
            <div class="grid grid-cols-2 gap-3">
              <div :class="cls.field"><label :class="cls.fieldLabel">Référence</label><input v-model="pieceLocale.reference" :class="cls.fieldInput" /></div>
              <div :class="cls.field"><label :class="cls.fieldLabel">Désignation *</label><input v-model="pieceLocale.designation" :class="cls.fieldInput" /></div>
              <div :class="cls.field"><label :class="cls.fieldLabel">Quantité</label><input v-model.number="pieceLocale.quantite" type="number" min="1" :class="cls.fieldInput" /></div>
              <div :class="cls.field"><label :class="cls.fieldLabel">Prix unitaire (Ar)</label><input v-model.number="pieceLocale.prixUnitaireAr" type="number" min="0" :class="cls.fieldInput" /></div>
            </div>
            <div class="flex gap-2"><button :class="cls.btnOutline" @click="pieceOuverte = false">Annuler</button><button :class="cls.btnPrimary" @click="ajouterPiece">Ajouter</button></div>
          </div>

          <div class="mt-3.5 pt-3.5 border-t border-border grid grid-cols-2 gap-4">
            <div><span class="text-[11px] text-muted-foreground">Coût des pièces</span><p class="text-sm font-semibold">{{ store.coutPieces(item).toLocaleString('fr-FR') }} Ar</p></div>
            <div><span class="text-[11px] text-muted-foreground">Coût total (pièces + main-d'œuvre)</span><p class="text-sm font-semibold">{{ store.coutOT(item).toLocaleString('fr-FR') }} Ar</p></div>
          </div>
        </FormSection>

        <!-- 4. CLÔTURE -->
        <FormSection title="Clôture" :recaps="[LIB_STATUT_OT[item.statut]]" :default-open="item.statut !== 'ouvert' && item.statut !== 'diagnostique'">
          <template v-if="item.statut === 'cloture'">
            <div class="flex items-center gap-2 text-success text-sm mb-3"><CheckCircle2 class="w-4 h-4" /> Ordre clôturé le {{ fmtDateHeure(item.clotureLe!) }}</div>
            <p class="text-xs text-foreground leading-relaxed mb-3">{{ item.travauxRealises }}</p>
          </template>
          <template v-else>
            <div :class="cls.field" class="mb-3">
              <label :class="cls.fieldLabel">Travaux réalisés *</label>
              <textarea v-model="travauxLocal" rows="3" :class="cls.fieldTextarea" placeholder="Description des travaux effectués…" :disabled="item.statut === 'attente_validation'"></textarea>
            </div>
            <button v-if="item.statut !== 'attente_validation'" :class="cls.btnPrimary" @click="cloturerOT">Soumettre à validation</button>

            <div v-else class="flex flex-col gap-2 mt-2">
              <p class="text-[11px] text-muted-foreground mb-1">La clôture exige la double validation hiérarchique : responsable, puis directeur.</p>
              <div class="flex items-center gap-2 text-xs">
                <component :is="item.valideParResponsable ? CheckCircle2 : Circle" class="w-4 h-4" :class="item.valideParResponsable ? 'text-success' : 'text-muted-foreground'" />
                <span>Responsable : {{ item.valideParResponsable ? `${item.valideParResponsable}, le ${fmtDateHeure(item.valideParResponsableLe!)}` : 'en attente' }}</span>
                <button v-if="!item.valideParResponsable" :class="cls.btnOutline" class="ml-auto !py-1 !px-2.5 !text-[11px]" @click="validerResp">Valider</button>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <component :is="item.valideParDirecteur ? CheckCircle2 : Circle" class="w-4 h-4" :class="item.valideParDirecteur ? 'text-success' : 'text-muted-foreground'" />
                <span>Directeur : {{ item.valideParDirecteur ? `${item.valideParDirecteur}, le ${fmtDateHeure(item.valideParDirecteurLe!)}` : 'en attente' }}</span>
                <button v-if="!item.valideParDirecteur" :class="cls.btnOutline" class="ml-auto !py-1 !px-2.5 !text-[11px] disabled:opacity-40 disabled:cursor-not-allowed" :disabled="!item.valideParResponsable" @click="validerDir">Valider</button>
              </div>
              <p v-if="!item.valideParResponsable" class="text-[11px] text-warning flex items-center gap-1.5 mt-1"><TriangleAlert class="w-3.5 h-3.5" /> Le directeur ne peut valider qu'après le responsable.</p>
            </div>
          </template>
        </FormSection>

      </div>
    </template>
  </CardModalShell>
</template>
