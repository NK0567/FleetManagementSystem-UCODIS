<script setup lang="ts">
/**
 * Fiche d'ordre de travail, reprise de la structure du socle FMS :
 * déclaration, diagnostic ISO 14224, pièces et main-d'œuvre, clôture.
 * La fin d'intervention se fait en deux temps : le technicien interne,
 * ou l'atelier externe, déclare l'intervention terminée ; le responsable
 * maintenance valide, ce qui clôture l'ordre.
 */
import { ref, computed, watch } from 'vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { CheckCircle2, Circle, TriangleAlert } from '@lucide/vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { usePrestatairesStore } from '../../stores/prestataires'
import {
  LIB_ORIGINE_OT, LIB_SOUS_SYSTEME, LIB_MODE_DEFAILLANCE, LIB_CAUSE_RACINE,
  LIB_TYPE_MAINTENANCE, LIB_GRAVITE_OT, LIB_STATUT_OT,
} from '../../types/maintenance'
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
function refuserFin() { if (item.value) store.refuserFin(item.value.id) }

/* ── Atelier externe ──────────────────────────────────────────── */
const prestatairesStore = usePrestatairesStore()
const optAteliers = computed<DropdownItem[]>(() => prestatairesStore.ateliersAutorises.map(p => ({ id: p.id, label: p.nom })))
const externeOuvert = ref(false)
const externeLocal = ref({ prestataireId: '', remiseLe: '', retourPrevuLe: '', montantDevisAr: undefined as number | undefined })
function confierExterne() {
  const p = prestatairesStore.getById(externeLocal.value.prestataireId)
  if (!item.value || !p || !externeLocal.value.remiseLe) { alert("Choisissez l'atelier et la date de remise du véhicule."); return }
  if (!p.autorise) { alert(`${p.nom} n'est pas un atelier autorisé.`); return }
  const r = store.confierAtelierExterne(item.value.id, { prestataireId: p.id, prestataireNom: p.nom, remiseLe: externeLocal.value.remiseLe,
    retourPrevuLe: externeLocal.value.retourPrevuLe || undefined, montantDevisAr: externeLocal.value.montantDevisAr })
  if (!r.ok) { alert(r.motif); return }
  externeOuvert.value = false
}
const avancementLocal = ref('')
watch(item, v => { avancementLocal.value = v?.avancementExterne ?? '' }, { immediate: true })
function majAvancement() { if (item.value) store.suivreAtelierExterne(item.value.id, { avancement: avancementLocal.value }) }
const retourLocal = ref('')
function retourExterne() {
  if (!item.value) return
  if (!retourLocal.value) { alert('Indiquez la date de retour du véhicule.'); return }
  const r = store.retourAtelierExterne(item.value.id, travauxLocal.value, retourLocal.value)
  if (!r.ok) alert(r.motif)
}
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

        <!-- 4. ATELIER EXTERNE -->
        <FormSection title="Atelier externe" :recaps="[item.prestataire ?? 'atelier interne']" :default-open="!!item.prestataire">
          <template v-if="item.prestataire">
            <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
              <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Atelier</label><span class="text-sm text-foreground">{{ item.prestataire }}</span></div>
              <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Remis le</label><span class="text-sm text-foreground">{{ item.remiseAtelierLe ? new Date(item.remiseAtelierLe).toLocaleDateString('fr-FR') : '-' }}</span></div>
              <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">{{ item.retourLe ? 'Retour le' : 'Retour prévu le' }}</label><span class="text-sm text-foreground">{{ (item.retourLe ?? item.retourPrevuLe) ? new Date((item.retourLe ?? item.retourPrevuLe)!).toLocaleDateString('fr-FR') : '-' }}</span></div>
              <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase">Montant du devis</label><span class="text-sm text-foreground">{{ item.montantDevisAr != null ? item.montantDevisAr.toLocaleString('fr-FR') + ' Ar' : '-' }}</span></div>
            </div>
            <p class="text-[11px] text-muted-foreground mt-3">Le travail interne de l'atelier externe n'est pas planifié ici : seule l'exécution de l'intervention est suivie. Sa qualification (diagnostic, cause, pièces, coût) reste la même que pour l'atelier interne.</p>
            <template v-if="item.statut !== 'cloture' && item.statut !== 'attente_validation'">
              <div :class="cls.field" class="mt-3">
                <label :class="cls.fieldLabel">Avancement communiqué par l'atelier</label>
                <div class="flex gap-2"><input v-model="avancementLocal" :class="cls.fieldInput" class="flex-1" placeholder="Ex. pièce reçue, remontage en cours…" /><button :class="cls.btnOutline" @click="majAvancement">Enregistrer</button></div>
              </div>
              <div :class="cls.field" class="mt-3">
                <label :class="cls.fieldLabel">Retour du véhicule</label>
                <div class="flex gap-2 items-center flex-wrap"><input v-model="retourLocal" type="date" :class="cls.fieldInput" class="!w-[180px]" /><button :class="cls.btnPrimary" @click="retourExterne">Retour : l'atelier déclare l'intervention terminée</button></div>
                <span class="text-[11px] text-muted-foreground">Les travaux réalisés se décrivent dans la section Clôture ; le responsable valide ensuite.</span>
              </div>
            </template>
          </template>
          <template v-else-if="item.statut !== 'cloture' && item.statut !== 'attente_validation'">
            <p class="text-xs text-muted-foreground mb-3">L'intervention est faite par l'atelier interne. Elle peut être confiée à un atelier externe autorisé.</p>
            <button v-if="!externeOuvert" :class="cls.btnOutline" @click="externeOuvert = true">Confier à un atelier externe</button>
            <div v-else class="flex flex-col gap-3">
              <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <div :class="cls.field"><label :class="cls.fieldLabel">Atelier *</label><SearchableDropdown v-model="externeLocal.prestataireId" :items="optAteliers" placeholder="Choisir un atelier autorisé…" /></div>
                <div :class="cls.field"><label :class="cls.fieldLabel">Remise du véhicule *</label><input v-model="externeLocal.remiseLe" type="date" :class="cls.fieldInput" /></div>
                <div :class="cls.field"><label :class="cls.fieldLabel">Retour prévu</label><input v-model="externeLocal.retourPrevuLe" type="date" :class="cls.fieldInput" /></div>
                <div :class="cls.field"><label :class="cls.fieldLabel">Montant du devis (Ar)</label><input v-model.number="externeLocal.montantDevisAr" type="number" min="0" :class="cls.fieldInput" /></div>
              </div>
              <div class="flex gap-2"><button :class="cls.btnOutline" @click="externeOuvert = false">Annuler</button><button :class="cls.btnPrimary" @click="confierExterne">Confier l'intervention</button></div>
            </div>
          </template>
          <p v-else class="text-xs text-muted-foreground">Intervention réalisée par l'atelier interne.</p>
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
            <p v-else-if="item.statut !== 'attente_validation'" class="text-[11px] text-muted-foreground">Intervention confiée à {{ item.prestataire }} : la fin se déclare au retour du véhicule (section Atelier externe).</p>

            <div v-else class="flex flex-col gap-2 mt-2">
              <div class="flex items-center gap-2 text-xs">
                <CheckCircle2 class="w-4 h-4 text-success" />
                <span>Intervention déclarée terminée par {{ item.termineDeclarePar ?? item.cloturePar }}<template v-if="item.termineDeclareLe">, le {{ fmtDateHeure(item.termineDeclareLe) }}</template></span>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <Circle class="w-4 h-4 text-muted-foreground" />
                <span>Validation du responsable maintenance : en attente</span>
                <button :class="cls.btnOutline" class="ml-auto !py-1 !px-2.5 !text-[11px]" @click="refuserFin">Refuser, l'intervention reprend</button>
                <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="validerResp">Valider et clôturer</button>
              </div>
              <p class="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1"><TriangleAlert class="w-3.5 h-3.5" /> La validation clôture l'ordre et rend le véhicule de nouveau disponible.</p>
            </div>
          </template>
        </FormSection>

      </div>
    </template>
  </CardModalShell>
</template>
