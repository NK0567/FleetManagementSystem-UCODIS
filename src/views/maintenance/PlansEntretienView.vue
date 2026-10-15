<template>
  <div :class="L.pageWrap">
    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Plans d'entretien</div>
        <div :class="L.pageSub">Les échéances constructeur, par modèle de véhicule · {{ store.plans.length }} plan(s)</div>
      </div>
      <button :class="L.btnPrimary" @click="ouvrirCreation()"><Plus class="w-4 h-4" /> Nouveau plan</button>
    </div>

    <div v-if="modelesSansPlan.length || plansInactifsUtilises.length" class="flex items-start gap-2.5 bg-warning-bg text-warning rounded-lg px-3.5 py-3 mb-3.5">
      <FileQuestion class="w-4 h-4 shrink-0 mt-px" />
      <div class="flex-1">
        <p v-if="modelesSansPlan.length" class="text-xs font-medium">{{ modelesSansPlan.length }} modèle(s) du parc sans plan d'entretien</p>
        <div v-if="modelesSansPlan.length" class="flex flex-wrap gap-1.5 mt-2">
          <button v-for="m in modelesSansPlan" :key="`${m.marque} ${m.modele}`"
            class="text-[11px] font-medium px-2.5 py-1 rounded-full border border-warning/30 bg-card text-warning cursor-pointer inline-flex items-center gap-1 hover:bg-warning/10"
            @click="ouvrirCreation(m.marque, m.modele)">
            <Plus class="w-3 h-3" /> {{ m.marque }} {{ m.modele }} <span class="opacity-70">({{ m.nb }} véh.)</span>
          </button>
        </div>
        <p v-if="plansInactifsUtilises.length" class="text-xs font-medium" :class="modelesSansPlan.length ? 'mt-3' : ''">{{ plansInactifsUtilises.length }} plan(s) inactif(s) pour des véhicules du parc</p>
        <div v-if="plansInactifsUtilises.length" class="flex flex-wrap gap-1.5 mt-2">
          <button v-for="p in plansInactifsUtilises" :key="p.id"
            class="text-[11px] font-medium px-2.5 py-1 rounded-full border border-warning/30 bg-card text-warning cursor-pointer inline-flex items-center gap-1 hover:bg-warning/10"
            @click="store.basculerPlanActif(p.id)">
            Réactiver {{ p.marque }} {{ p.modele }} <span class="opacity-70">({{ nbVehicules(p) }} véh.)</span>
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-3.5">
      <div v-for="plan in store.plans" :key="plan.id" :class="L.card">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div :class="L.cardTitle" class="!mb-0"><Wrench class="w-4 h-4 text-primary" /> {{ plan.marque }} {{ plan.modele }}</div>
          <div class="flex items-center gap-2">
            <span class="text-[11px]" :class="nbVehicules(plan) ? 'text-muted-foreground' : 'text-warning'">
              {{ plan.operations.length }} opération(s) · {{ nbVehicules(plan) }} véhicule(s) concerné(s)
            </span>
            <button class="text-[11px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer" :class="plan.actif ? 'bg-success-bg text-success' : 'bg-neutral-bg text-neutral'" @click="store.basculerPlanActif(plan.id)">
              {{ plan.actif ? 'Actif' : 'Inactif' }}
            </button>
            <button class="text-[11px] text-primary hover:underline bg-transparent border-0 cursor-pointer flex items-center gap-1" @click="ouvrirDuplication(plan.id)"><Copy class="w-3 h-3" /> Dupliquer</button>
            <button class="text-[11px] text-danger hover:underline bg-transparent border-0 cursor-pointer flex items-center gap-1" @click="demanderSuppression(plan)"><Trash2 class="w-3 h-3" /> Supprimer</button>
          </div>
        </div>

        <div v-if="plan.provisoire" class="flex items-start gap-2 text-[11px] text-warning bg-warning-bg rounded-md px-2.5 py-2 mb-3 leading-relaxed">
          <span class="flex-1">Intervalles à confirmer.<template v-if="plan.source"> {{ plan.source }}</template></span>
          <button class="text-[11px] font-medium underline bg-transparent border-0 cursor-pointer p-0 text-warning shrink-0" @click="plan.provisoire = false">Intervalles confirmés</button>
        </div>
        <button v-else class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0 mb-2" @click="plan.provisoire = true">Marquer comme provisoire</button>

        <div v-if="!plan.operations.length" class="text-xs text-warning py-3">Aucune opération.</div>
        <table v-else :class="L.table">
          <thead><tr><th :class="L.th">Opération</th><th :class="L.th">Sous-système</th><th :class="L.th">Nature</th><th :class="L.th">Intervalle</th><th :class="L.th"></th></tr></thead>
          <tbody>
            <tr v-for="op in plan.operations" :key="op.id">
              <td :class="L.td"><span class="text-xs font-medium">{{ op.libelle }}</span></td>
              <td :class="L.td"><span class="text-xs text-muted-foreground">{{ LIB_SOUS_SYSTEME[op.sousSysteme] }}</span></td>
              <td :class="L.td"><span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="CLS_NATURE[op.nature]">{{ LIB_NATURE_OPERATION[op.nature] }}</span></td>
              <td :class="L.td">
                <span v-if="op.intervalleKm || op.intervalleHeures || op.intervalleJours" class="text-xs">tous les {{ [op.intervalleKm ? op.intervalleKm.toLocaleString('fr-FR') + ' km' : '', op.intervalleHeures ? op.intervalleHeures.toLocaleString('fr-FR') + ' heures' : '', op.intervalleJours ? op.intervalleJours + ' jours' : ''].filter(Boolean).join(' ou ') }}</span>
                <span v-else class="text-[11px] text-danger">aucun intervalle</span>
              </td>
              <td :class="L.td"><button class="w-6 h-6 rounded border-0 bg-transparent text-muted-foreground cursor-pointer inline-flex items-center justify-center hover:text-danger hover:bg-danger-bg" @click="store.supprimerOperation(plan.id, op.id)"><X class="w-3.5 h-3.5" /></button></td>
            </tr>
          </tbody>
        </table>

        <div v-if="brouillons[plan.id]" class="grid grid-cols-1 sm:grid-cols-[1fr_150px_130px_100px_90px_90px_auto] gap-2 mt-3 items-end">
          <div :class="F.field"><label :class="F.fieldLabel">Opération</label><input v-model="brouillons[plan.id]!.libelle" type="text" :class="F.fieldInput" class="!h-[32px] !text-xs" placeholder="ex. Vidange du pont" @keyup.enter="ajouter(plan.id)" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Sous-système</label><SearchableDropdown v-model="brouillons[plan.id]!.sousSysteme" :items="optSousSystemes" placeholder="Sous-système…" compact /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Nature</label><SearchableDropdown v-model="brouillons[plan.id]!.nature" :items="optNatures" placeholder="Nature…" compact /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Tous les … km</label><input v-model.number="brouillons[plan.id]!.intervalleKm" type="number" min="0" step="1000" :class="F.fieldInput" class="!h-[32px] !text-xs" placeholder="15000" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">ou … heures</label><input v-model.number="brouillons[plan.id]!.intervalleHeures" type="number" min="0" :class="F.fieldInput" class="!h-[32px] !text-xs" placeholder="500" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">ou … jours</label><input v-model.number="brouillons[plan.id]!.intervalleJours" type="number" min="0" :class="F.fieldInput" class="!h-[32px] !text-xs" placeholder="180" /></div>
          <div class="flex gap-1.5"><button :class="cls.btnPrimary" class="!h-[32px] !py-0" @click="ajouter(plan.id)">Ajouter</button><button :class="cls.btnOutline" class="!h-[32px] !py-0" @click="delete brouillons[plan.id]; delete erreursOp[plan.id]">Annuler</button></div>
        </div>
        <p v-if="brouillons[plan.id] && erreursOp[plan.id]" class="text-[12px] text-danger mt-1.5">{{ erreursOp[plan.id] }}</p>
        <button v-if="!brouillons[plan.id]" :class="cls.btnOutline" class="mt-3" @click="brouillons[plan.id] = { libelle: '', sousSysteme: 'moteur', nature: 'remplacer', intervalleKm: undefined, intervalleHeures: undefined, intervalleJours: undefined }">
          <Plus class="w-3.5 h-3.5" /> Ajouter une opération
        </button>
      </div>

      <div v-if="!store.plans.length" :class="L.emptyState"><Wrench class="w-8 h-8" /><p>Aucun plan d'entretien.</p></div>
    </div>

    <!-- Création / duplication -->
    <div v-if="formOuvert" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4" @click.self="formOuvert = false">
      <div class="bg-card rounded-lg border border-border shadow-lg w-full max-w-md p-4">
        <h3 class="text-sm font-semibold text-foreground mb-3">{{ duplicationSourceId ? 'Dupliquer le plan' : 'Nouveau plan d\'entretien' }}</h3>
        <div class="grid grid-cols-2 gap-3">
          <div :class="F.field"><label :class="F.fieldLabel">Marque *</label><input v-model="formPlan.marque" type="text" :class="F.fieldInput" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Modèle *</label><input v-model="formPlan.modele" type="text" :class="F.fieldInput" /></div>
        </div>
        <p v-if="erreurPlan" class="text-[12px] text-danger mt-2">{{ erreurPlan }}</p>
        <div class="flex justify-end gap-2 mt-4">
          <button :class="cls.btnOutline" @click="formOuvert = false">Annuler</button>
          <button :class="cls.btnPrimary" @click="validerFormPlan">{{ duplicationSourceId ? 'Dupliquer' : 'Créer' }}</button>
        </div>
      </div>
    </div>

    <!-- Suppression -->
    <div v-if="aSupprimer" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4" @click.self="aSupprimer = null">
      <div class="bg-card rounded-lg border border-border shadow-lg w-full max-w-md p-4">
        <h3 class="text-sm font-semibold text-foreground mb-2">Supprimer le plan {{ aSupprimer.marque }} {{ aSupprimer.modele }} ?</h3>
        <template v-if="nbVehicules(aSupprimer)">
          <p class="text-[13px] text-danger leading-relaxed">Ce plan concerne encore {{ nbVehicules(aSupprimer) }} véhicule(s) du parc : suppression impossible tant qu'ils portent ce modèle.</p>
          <div class="flex justify-end mt-4"><button :class="cls.btnOutline" @click="aSupprimer = null">Fermer</button></div>
        </template>
        <template v-else>
          <p class="text-[13px] text-muted-foreground leading-relaxed">Aucun véhicule du parc ne porte ce modèle.</p>
          <div class="flex justify-end gap-2 mt-4">
            <button :class="cls.btnOutline" @click="aSupprimer = null">Annuler</button>
            <button :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90" @click="confirmerSuppression">Supprimer</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Plans d'entretien par marque et modèle : chaque opération porte un seuil
 * en kilomètres, en heures moteur ou en jours. Chaque véhicule hérite du
 * plan actif de sa marque et de son modèle.
 */
import { ref, reactive, computed } from 'vue'
import { Copy, FileQuestion, Plus, Trash2, Wrench, X } from '@lucide/vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useVehiculeStore } from '../../stores/vehicules'
import { LIB_SOUS_SYSTEME, LIB_NATURE_OPERATION } from '../../types/maintenance'
import { useNomenclatureStore } from '../../stores/nomenclature'
import type { SousSysteme, NatureOperation, PlanEntretien } from '../../types/maintenance'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'
import * as cls from '../../lib/formClasses'

const store = useMaintenanceStore()
const vehicules = useVehiculeStore()

const CLS_NATURE: Record<NatureOperation, string> = {
  verifier: 'bg-info-bg text-info', lubrifier: 'bg-primary/10 text-primary', remplacer: 'bg-warning-bg text-warning',
}

const meme = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
function nbVehicules(plan: PlanEntretien) { return vehicules.auParc.filter(v => meme(v.marque, plan.marque) && meme(v.modele, plan.modele)).length }

/** Modèles du parc sans aucun plan ; un plan inactif n'en fait pas partie : il se réactive. */
const modelesSansPlan = computed(() => {
  const acc = new Map<string, { marque: string; modele: string; nb: number }>()
  vehicules.auParc.forEach(v => {
    if (store.planDe(v.marque, v.modele)) return
    const cle = `${v.marque}|${v.modele}`.toLowerCase()
    const e = acc.get(cle) ?? { marque: v.marque, modele: v.modele, nb: 0 }
    e.nb += 1
    acc.set(cle, e)
  })
  return [...acc.values()]
})
const plansInactifsUtilises = computed(() => store.plans.filter(p => !p.actif && nbVehicules(p)))

const nomenclature = useNomenclatureStore()
const optSousSystemes = computed<DropdownItem[]>(() => nomenclature.optSousSystemes)
const optNatures: DropdownItem[] = Object.entries(LIB_NATURE_OPERATION).map(([id, label]) => ({ id, label }))

const brouillons = reactive<Record<string, { libelle: string; sousSysteme: SousSysteme; nature: NatureOperation; intervalleKm?: number; intervalleHeures?: number; intervalleJours?: number }>>({})
const erreursOp = reactive<Record<string, string>>({})
const nombre = (v: unknown) => (v === '' || v == null ? undefined : Number(v))
function ajouter(planId: string) {
  const b = brouillons[planId]
  if (!b) return
  const r = store.ajouterOperation(planId, { ...b, intervalleKm: nombre(b.intervalleKm), intervalleHeures: nombre(b.intervalleHeures), intervalleJours: nombre(b.intervalleJours) })
  if (r.ok) { delete brouillons[planId]; delete erreursOp[planId] }
  else erreursOp[planId] = r.motif ?? ''
}

/* ── Création / duplication ──────────────────────────────────── */
const formOuvert = ref(false)
const duplicationSourceId = ref<string | null>(null)
const formPlan = ref({ marque: '', modele: '' })
const erreurPlan = ref('')

function ouvrirCreation(marque = '', modele = '') {
  duplicationSourceId.value = null
  formPlan.value = { marque, modele }
  erreurPlan.value = ''
  formOuvert.value = true
}
function ouvrirDuplication(planId: string) {
  duplicationSourceId.value = planId
  formPlan.value = { marque: '', modele: '' }
  erreurPlan.value = ''
  formOuvert.value = true
}
function validerFormPlan() {
  erreurPlan.value = ''
  if (!formPlan.value.marque.trim() || !formPlan.value.modele.trim()) { erreurPlan.value = 'Marque et modèle sont obligatoires.'; return }
  const id = duplicationSourceId.value
    ? store.dupliquerPlan(duplicationSourceId.value, formPlan.value.marque, formPlan.value.modele)
    : store.creerPlan(formPlan.value.marque, formPlan.value.modele)
  if (!id) { erreurPlan.value = 'Un plan existe déjà pour cette marque et ce modèle.'; return }
  formOuvert.value = false
}

/* ── Suppression ──────────────────────────────────────────────── */
const aSupprimer = ref<PlanEntretien | null>(null)
function demanderSuppression(plan: PlanEntretien) { aSupprimer.value = plan }
function confirmerSuppression() {
  if (aSupprimer.value) store.supprimerPlan(aSupprimer.value.id)
  aSupprimer.value = null
}
</script>
