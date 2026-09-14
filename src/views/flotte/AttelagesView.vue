<template>
  <div :class="L.pageWrap">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Attelages</div>
        <div :class="L.pageSub">Gestion des attelages tracteur ↔ semi-remorque</div>
      </div>
    </div>

    <!-- Indicateurs -->
    <div class="grid grid-cols-4 gap-2.5 mb-4 max-md:grid-cols-2">
      <div :class="L.kpiCard">
        <div :class="L.kpiIcon" class="bg-primary/10"><Link2 class="w-[18px] h-[18px] text-primary" /></div>
        <div :class="L.kpiLabel">Attelages actifs</div>
        <div :class="L.kpiValue">{{ actifs.length }}</div>
      </div>
      <div :class="L.kpiCard">
        <div :class="L.kpiIcon" class="bg-success-bg"><Truck class="w-[18px] h-[18px] text-success" /></div>
        <div :class="L.kpiLabel">Tracteurs libres</div>
        <div :class="L.kpiValue">{{ vehicules.tracteursLibres.length }}</div>
      </div>
      <div :class="L.kpiCard">
        <div :class="L.kpiIcon" class="bg-info-bg"><Container class="w-[18px] h-[18px] text-info" /></div>
        <div :class="L.kpiLabel">Semi-remorques libres</div>
        <div :class="L.kpiValue">{{ vehicules.semiRemorquesLibres.length }}</div>
      </div>
      <div :class="L.kpiCard">
        <div :class="L.kpiIcon" class="bg-neutral-bg"><History class="w-[18px] h-[18px] text-neutral" /></div>
        <div :class="L.kpiLabel">Total historique</div>
        <div :class="L.kpiValue">{{ historique.length }}</div>
      </div>
    </div>

    <!-- Attelages actifs -->
    <div :class="L.tableCard" class="mb-4">
      <div :class="L.toolbar">
        <span class="text-sm font-semibold text-foreground flex items-center gap-1.5"><Link2 class="w-4 h-4 text-primary" /> Attelages actifs</span>
        <button :class="L.btnPrimary" @click="showForm = !showForm"><Plus class="w-4 h-4" /> Nouvel attelage</button>
      </div>
      <div class="overflow-x-auto">
        <table :class="L.table">
          <thead>
            <tr>
              <th :class="L.th">Tracteur</th>
              <th :class="L.th">Semi-remorque</th>
              <th :class="L.th">Type remorque</th>
              <th :class="L.th">Début</th>
              <th :class="L.th" class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in actifs" :key="a.id">
              <td :class="L.td" class="font-mono text-xs font-semibold text-primary">{{ tracteurDe(a)?.immatriculation }}</td>
              <td :class="L.td" class="font-mono text-xs">{{ semiDe(a)?.immatriculation }}</td>
              <td :class="L.td">
                <span class="text-[11px] text-info bg-info-bg px-2 py-0.5 rounded-full">{{ typeRemorque(a) }}</span>
              </td>
              <td :class="L.td" class="text-muted-foreground">{{ formatDate(a.dateDebut) }}</td>
              <td :class="L.td" class="text-right">
                <button class="text-xs text-danger cursor-pointer hover:underline" @click="ouvrirDetelage(a)">Dételer</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="actifs.length === 0" :class="L.emptyState">
          <Link2 class="w-8 h-8" /><p>Aucun attelage actif.</p>
        </div>
      </div>
    </div>

    <!-- Nouvel attelage : panneau en ligne, pas de popup, comme la référence -->
    <div v-if="showForm" class="bg-card border border-border rounded-lg overflow-hidden mb-4">
      <div class="bg-primary text-primary-foreground px-5 py-3">
        <h2 class="font-semibold text-[15px]">Nouvel attelage</h2>
      </div>
      <div class="p-5">
        <div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <div>
            <label :class="L.fpFieldLabel">Tracteur *</label>
            <SearchableDropdown v-model="form.tracteurId" :items="optTracteurs" placeholder="Sélectionner un tracteur" compact />
          </div>
          <div>
            <label :class="L.fpFieldLabel">Semi-remorque *</label>
            <SearchableDropdown v-model="form.semiRemorqueId" :items="optSemis" placeholder="Sélectionner une semi-remorque" compact />
          </div>
          <div>
            <label :class="L.fpFieldLabel">Date début *</label>
            <input v-model="form.dateDebut" type="date" :class="L.fpSelect" class="!h-9 w-full" />
          </div>
        </div>
        <p v-if="erreur" class="text-[12px] text-danger mt-3">{{ erreur }}</p>
        <div class="flex gap-3 mt-4 justify-end">
          <button :class="L.btnOutline" @click="showForm = false">Annuler</button>
          <button :class="L.btnPrimary" :disabled="!canSubmit" @click="submit">Atteler</button>
        </div>
      </div>
    </div>

    <!-- Historique -->
    <div :class="L.tableCard">
      <div :class="L.toolbar">
        <span class="text-sm font-semibold text-foreground flex items-center gap-1.5"><History class="w-4 h-4 text-muted-foreground" /> Historique des attelages</span>
      </div>
      <div class="overflow-x-auto">
        <table :class="L.table">
          <thead>
            <tr>
              <th :class="L.th">Tracteur</th>
              <th :class="L.th">Semi-remorque</th>
              <th :class="L.th">Début</th>
              <th :class="L.th">Fin</th>
              <th :class="L.th">Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in historique" :key="a.id">
              <td :class="L.td" class="font-mono text-xs">{{ tracteurDe(a)?.immatriculation }}</td>
              <td :class="L.td" class="font-mono text-xs">{{ semiDe(a)?.immatriculation }}</td>
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

    <!-- Dételer reste une petite confirmation en superposition -->
    <ModalShell :ouvert="showDeteler" titre="Dételer" @fermer="showDeteler = false">
      <p class="text-[13px] text-foreground mb-3">
        <strong>{{ detelerCible ? tracteurDe(detelerCible)?.immatriculation : '' }}</strong>
        ↔ <strong>{{ detelerCible ? semiDe(detelerCible)?.immatriculation : '' }}</strong>
      </p>
      <div :class="F.field">
        <label :class="F.fieldLabel">Date de fin *</label>
        <input v-model="dateFin" type="date" :class="F.fieldInput" />
      </div>
      <template #pied>
        <button :class="cls.btnPrimary" :disabled="!dateFin" @click="confirmerDetelage"><Check class="w-4 h-4" /> Confirmer</button>
        <button :class="cls.btnOutline" @click="showDeteler = false">Annuler</button>
      </template>
    </ModalShell>
  </div>
</template>

<script setup lang="ts">
/**
 * US 1.4.2 · atteler un tracteur à une semi-remorque. Le formulaire de
 * création est un panneau qui s'ouvre dans la page, pas une fenêtre en
 * superposition · seul le dételage (destructif) reste une confirmation
 * en superposition, comme sur les projets de référence.
 */
import { ref, computed } from 'vue'
import { Check, Container, History, Link2, Plus, Truck } from '@lucide/vue'
import ModalShell from '../../components/ui/ModalShell.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'
import * as cls from '../../lib/formClasses'
import { formatDate } from '../../utils/helpers'
import { aujourdhuiISO } from '../../utils/horloge'
import { useVehiculeStore } from '../../stores/vehicules'
import type { Attelage } from '../../types'

const vehicules = useVehiculeStore()

const actifs = computed(() => vehicules.attelages.filter(a => !a.dateFin))
const historique = computed(() => vehicules.attelages.filter(a => !!a.dateFin))

function tracteurDe(a: Attelage) { return vehicules.parId(a.tracteurId) }
function semiDe(a: Attelage) { return vehicules.parId(a.semiRemorqueId) }

/** Le type de remorque n'est pas un champ dédié : on le lit dans le modèle
    (« Fourgon 3 essieux » → « Fourgon »), comme UCODIS les distingue déjà. */
function typeRemorque(a: Attelage) {
  return semiDe(a)?.modele.split(' ')[0] ?? '-'
}

function duree(debut: string, fin?: string) {
  if (!fin) return '-'
  const j = Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 86400000)
  return `${j} j`
}

/* ── Nouvel attelage : panneau en ligne ───────────────────────── */
const showForm = ref(false)
const form = ref({ tracteurId: '', semiRemorqueId: '', dateDebut: aujourdhuiISO() })
const erreur = ref('')

const optTracteurs = computed<DropdownItem[]>(() =>
  vehicules.tracteursLibres.map(t => ({ id: t.id, label: t.immatriculation, sublabel: `${t.marque} ${t.modele}` })))
const optSemis = computed<DropdownItem[]>(() =>
  vehicules.semiRemorquesLibres.map(s => ({ id: s.id, label: s.immatriculation, sublabel: `${s.marque} ${s.modele}` })))

const canSubmit = computed(() => !!form.value.tracteurId && !!form.value.semiRemorqueId && !!form.value.dateDebut)

function submit() {
  if (!canSubmit.value) return
  const ok = vehicules.atteler(form.value.tracteurId, form.value.semiRemorqueId, form.value.dateDebut)
  if (!ok) { erreur.value = "Le tracteur ou la semi-remorque n'est plus libre."; return }
  form.value = { tracteurId: '', semiRemorqueId: '', dateDebut: aujourdhuiISO() }
  erreur.value = ''
  showForm.value = false
}

/* ── Dételer ──────────────────────────────────────────────────── */
const showDeteler = ref(false)
const detelerCible = ref<Attelage | null>(null)
const dateFin = ref('')

function ouvrirDetelage(a: Attelage) {
  detelerCible.value = a
  dateFin.value = aujourdhuiISO()
  showDeteler.value = true
}
function confirmerDetelage() {
  if (!detelerCible.value || !dateFin.value) return
  vehicules.dételer(detelerCible.value.id, dateFin.value)
  showDeteler.value = false
  detelerCible.value = null
}
</script>
