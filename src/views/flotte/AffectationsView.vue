<template>
  <div :class="L.pageWrap">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Affectations chauffeurs</div>
        <div :class="L.pageSub">Gestion des affectations conducteur ↔ tracteur</div>
      </div>
    </div>

    <!-- Indicateurs -->
    <div class="grid grid-cols-4 gap-2.5 mb-4 max-md:grid-cols-2">
      <div :class="L.kpiCard">
        <div :class="L.kpiIcon" class="bg-primary/10"><UserCheck class="w-[18px] h-[18px] text-primary" /></div>
        <div :class="L.kpiLabel">Affectations actives</div>
        <div :class="L.kpiValue">{{ actives.length }}</div>
      </div>
      <div :class="L.kpiCard">
        <div :class="L.kpiIcon" class="bg-success-bg"><Truck class="w-[18px] h-[18px] text-success" /></div>
        <div :class="L.kpiLabel">Tracteurs libres</div>
        <div :class="L.kpiValue">{{ vehicules.tracteursSansConducteur.length }}</div>
      </div>
      <div :class="L.kpiCard">
        <div :class="L.kpiIcon" class="bg-neutral-bg"><History class="w-[18px] h-[18px] text-neutral" /></div>
        <div :class="L.kpiLabel">Total historique</div>
        <div :class="L.kpiValue">{{ historique.length }}</div>
      </div>
      <div :class="L.kpiCard">
        <div :class="L.kpiIcon" class="bg-danger-bg"><TriangleAlert class="w-[18px] h-[18px] text-danger" /></div>
        <div :class="L.kpiLabel">Alertes pièces</div>
        <div :class="L.kpiValue">{{ alertesActives }}</div>
      </div>
    </div>

    <!-- Affectations actives -->
    <div :class="L.tableCard" class="mb-4">
      <div :class="L.toolbar">
        <span class="text-sm font-semibold text-foreground flex items-center gap-1.5"><UserCheck class="w-4 h-4 text-primary" /> Affectations actives</span>
        <button :class="L.btnPrimary" @click="showForm = !showForm"><Plus class="w-4 h-4" /> Nouvelle affectation</button>
      </div>
      <div class="overflow-x-auto">
        <table :class="L.table">
          <thead>
            <tr>
              <th :class="L.th">Chauffeur</th>
              <th :class="L.th">Tracteur</th>
              <th :class="L.th">Début</th>
              <th :class="L.th">Alerte pièces</th>
              <th :class="L.th" class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in actives" :key="a.id">
              <td :class="L.td">
                <div class="flex items-center gap-2">
                  <UserAvatar :nom="conducteurDe(a)?.nomComplet ?? '?'" taille="sm" />
                  <span class="font-medium">{{ conducteurDe(a)?.nomComplet }}</span>
                </div>
              </td>
              <td :class="L.td" class="font-mono text-xs font-semibold text-primary">{{ tracteurDe(a)?.immatriculation }}</td>
              <td :class="L.td" class="text-muted-foreground">{{ formatDate(a.dateDebut) }}</td>
              <td :class="L.td">
                <span v-if="alertePieces(a.conducteurId)" class="flex items-center gap-1 text-xs text-danger font-medium">
                  <CircleAlert class="w-3.5 h-3.5" /> Pièce expirée
                </span>
                <span v-else class="text-xs text-success font-medium">OK</span>
              </td>
              <td :class="L.td" class="text-right">
                <button class="text-xs text-danger cursor-pointer hover:underline" @click="ouvrirRetrait(a)">Terminer</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="actives.length === 0" :class="L.emptyState">
          <UserCheck class="w-8 h-8" /><p>Aucune affectation active.</p>
        </div>
      </div>
    </div>

    <!-- Nouvelle affectation : panneau en ligne, pas de popup -->
    <div v-if="showForm" class="bg-card border border-border rounded-lg overflow-hidden mb-4">
      <div class="bg-primary text-primary-foreground px-5 py-3">
        <h2 class="font-semibold text-[15px]">Nouvelle affectation</h2>
      </div>
      <div class="p-5">
        <div v-if="alerteBlocage" class="flex items-start gap-2 p-3 mb-4 bg-danger-bg text-danger rounded-md text-[12px] border border-danger/20">
          <TriangleAlert class="w-4 h-4 mt-0.5 shrink-0" />
          <span>{{ alerteBlocage }}</span>
        </div>
        <div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <div>
            <label :class="L.fpFieldLabel">Chauffeur *</label>
            <SearchableDropdown v-model="form.conducteurId" :items="optConducteurs" placeholder="Sélectionner un chauffeur" compact
                                 @update:model-value="verifierBlocage" />
          </div>
          <div>
            <label :class="L.fpFieldLabel">Tracteur *</label>
            <SearchableDropdown v-model="form.tracteurId" :items="optTracteurs" placeholder="Sélectionner un tracteur" compact />
          </div>
          <div>
            <label :class="L.fpFieldLabel">Date début *</label>
            <input v-model="form.dateDebut" type="date" :class="L.fpSelect" class="!h-9 w-full" />
          </div>
        </div>
        <div class="flex gap-3 mt-4 justify-end">
          <button :class="L.btnOutline" @click="showForm = false">Annuler</button>
          <button :class="L.btnPrimary" :disabled="!canSubmit || !!alerteBlocage" @click="submit">Affecter</button>
        </div>
      </div>
    </div>

    <!-- Historique -->
    <div :class="L.tableCard">
      <div :class="L.toolbar">
        <span class="text-sm font-semibold text-foreground flex items-center gap-1.5"><History class="w-4 h-4 text-muted-foreground" /> Historique des affectations</span>
      </div>
      <div class="overflow-x-auto">
        <table :class="L.table">
          <thead>
            <tr>
              <th :class="L.th">Chauffeur</th>
              <th :class="L.th">Tracteur</th>
              <th :class="L.th">Début</th>
              <th :class="L.th">Fin</th>
              <th :class="L.th">Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in historique" :key="a.id">
              <td :class="L.td">{{ conducteurDe(a)?.nomComplet }}</td>
              <td :class="L.td" class="font-mono text-xs">{{ tracteurDe(a)?.immatriculation }}</td>
              <td :class="L.td" class="text-muted-foreground">{{ formatDate(a.dateDebut) }}</td>
              <td :class="L.td" class="text-muted-foreground">{{ formatDate(a.dateFin) }}</td>
              <td :class="L.td" class="text-muted-foreground">{{ duree(a.dateDebut, a.dateFin) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="historique.length === 0" :class="L.emptyState">
          <History class="w-8 h-8" /><p>Aucun historique.</p>
        </div>
      </div>
    </div>

    <ModalShell :ouvert="showRetrait" titre="Terminer l'affectation" @fermer="showRetrait = false">
      <p class="text-[13px] text-foreground mb-3">
        Chauffeur : <strong>{{ retraitCible ? conducteurDe(retraitCible)?.nomComplet : '' }}</strong>
      </p>
      <div :class="F.field">
        <label :class="F.fieldLabel">Date de fin *</label>
        <input v-model="dateFin" type="date" :class="F.fieldInput" />
      </div>
      <template #pied>
        <button :class="cls.btnPrimary" :disabled="!dateFin" @click="confirmerRetrait"><Check class="w-4 h-4" /> Confirmer</button>
        <button :class="cls.btnOutline" @click="showRetrait = false">Annuler</button>
      </template>
    </ModalShell>
  </div>
</template>

<script setup lang="ts">
/**
 * US 1.4.1 · affecter un camion à un conducteur : seul un conducteur actif,
 * habilité, dont les pièces sont en règle, peut être proposé. Le formulaire
 * de création est un panneau en ligne, pas une fenêtre en superposition ·
 * seul le retrait (destructif) garde une confirmation en superposition.
 */
import { ref, computed } from 'vue'
import { Check, CircleAlert, History, Plus, TriangleAlert, Truck, UserCheck } from '@lucide/vue'
import ModalShell from '../../components/ui/ModalShell.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'
import * as cls from '../../lib/formClasses'
import { formatDate } from '../../utils/helpers'
import { aujourdhuiISO } from '../../utils/horloge'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useDocumentsStore } from '../../stores/documentsPersonnel'
import type { AffectationVehicule } from '../../types'

const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const docs = useDocumentsStore()

const actives = computed(() => vehicules.affectations.filter(a => !a.dateFin))
const historique = computed(() => vehicules.affectations.filter(a => !!a.dateFin))

function conducteurDe(a: AffectationVehicule) { return personnel.parId(a.conducteurId) }
function tracteurDe(a: AffectationVehicule) { return vehicules.parId(a.vehiculeId) }

function alertePieces(conducteurId: string) { return !docs.enRegle(conducteurId) }
const alertesActives = computed(() => actives.value.filter(a => alertePieces(a.conducteurId)).length)

function duree(debut: string, fin?: string) {
  if (!fin) return '-'
  const j = Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 86400000)
  return `${j} j`
}

/* ── Nouvelle affectation : panneau en ligne ─────────────────── */
const showForm = ref(false)
const form = ref({ conducteurId: '', tracteurId: '', dateDebut: aujourdhuiISO() })
const alerteBlocage = ref('')

const conducteursEligibles = computed(() => {
  const affectesIds = new Set(actives.value.map(a => a.conducteurId))
  return personnel.conducteurs.filter(c => c.habilite && c.statut === 'actif' && !affectesIds.has(c.id))
})

const optConducteurs = computed<DropdownItem[]>(() =>
  conducteursEligibles.value.map(c => ({ id: c.id, label: c.nomComplet, sublabel: c.matricule })))
const optTracteurs = computed<DropdownItem[]>(() =>
  vehicules.tracteursSansConducteur.map(t => ({ id: t.id, label: t.immatriculation, sublabel: `${t.marque} ${t.modele}` })))

function verifierBlocage(conducteurId: string) {
  form.value.conducteurId = conducteurId
  alerteBlocage.value = ''
  if (conducteurId && !docs.enRegle(conducteurId)) {
    const nom = personnel.parId(conducteurId)?.nomComplet ?? 'ce conducteur'
    alerteBlocage.value = `Blocage : une pièce de ${nom} est expirée ou manquante (permis ou visite médicale).`
  }
}

const canSubmit = computed(() => !!form.value.conducteurId && !!form.value.tracteurId && !!form.value.dateDebut)

function submit() {
  if (!canSubmit.value || alerteBlocage.value) return
  vehicules.affecterConducteur(form.value.tracteurId, form.value.conducteurId, form.value.dateDebut)
  form.value = { conducteurId: '', tracteurId: '', dateDebut: aujourdhuiISO() }
  showForm.value = false
}

/* ── Terminer ─────────────────────────────────────────────────── */
const showRetrait = ref(false)
const retraitCible = ref<AffectationVehicule | null>(null)
const dateFin = ref('')

function ouvrirRetrait(a: AffectationVehicule) {
  retraitCible.value = a
  dateFin.value = aujourdhuiISO()
  showRetrait.value = true
}
function confirmerRetrait() {
  if (!retraitCible.value || !dateFin.value) return
  vehicules.retirerAffectation(retraitCible.value.id, dateFin.value)
  showRetrait.value = false
  retraitCible.value = null
}
</script>
