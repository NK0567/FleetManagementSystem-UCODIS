<template>
  <div class="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-3.5 items-start">

    <!-- ══ VOLET GAUCHE · composition de la séquence ══════════ -->
    <div class="flex flex-col gap-3">

      <!-- Trajet de référence -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <h3 :class="L.cardTitle" class="!mb-0"><Bookmark class="w-4 h-4 text-primary" /> Trajet de référence</h3>
        </div>
        <SearchableDropdown
          :model-value="trajetRef"
          :items="optionsTrajets"
          placeholder="Composer un trajet ponctuel…"
          @update:model-value="chargerTrajet"
        />
      </div>

      <!-- Séquence composée -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <h3 :class="L.cardTitle" class="!mb-0"><ListOrdered class="w-4 h-4 text-primary" /> Séquence</h3>
          <span class="text-[11px] text-muted-foreground">{{ nbAller }} aller · {{ nbRetour }} retour</span>
        </div>

        <div v-if="!etapes.length" class="text-xs text-muted-foreground py-4 text-center">
          Ajoutez des sites depuis la liste ci-dessous.
        </div>

        <ul v-else class="flex flex-col gap-1.5">
          <li
            v-for="(e, i) in etapes" :key="e.id" draggable="true"
            class="flex items-start gap-2 rounded-md border px-2 py-1.5 bg-card cursor-grab transition-colors"
            :class="dragIndex === i ? 'border-primary bg-primary/5 opacity-60' : 'border-border hover:bg-background'"
            @dragstart="dragIndex = i" @dragover.prevent="survol(i)" @dragend="dragIndex = null"
          >
            <GripVertical class="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span class="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 text-white"
                  :style="{ backgroundColor: COULEUR_ROLE[e.role] }">{{ i + 1 }}</span>

            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-foreground truncate">{{ e.siteNom }}</p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <select v-model="e.role" class="text-[10px] border border-border rounded px-1 py-0.5 bg-card text-muted-foreground" @change="emettre">
                  <option v-for="(lib, k) in LIB_ROLE_ETAPE" :key="k" :value="k">{{ lib }}</option>
                </select>
                <select v-model="e.volet" class="text-[10px] border border-border rounded px-1 py-0.5 bg-card"
                        :class="e.volet === 'retour' ? 'text-info' : 'text-muted-foreground'"
                        title="Volet du plan de trajet" @change="emettre">
                  <option value="aller">Aller</option>
                  <option value="retour">Retour</option>
                </select>
              </div>

              <div class="flex items-center gap-3 mt-1">
                <label class="flex items-center gap-1">
                  <span class="text-[10px] text-muted-foreground whitespace-nowrap">Trajet max</span>
                  <input v-model.number="e.intervalleMin" type="number" min="0" placeholder="-"
                         class="w-12 text-[10px] border border-border rounded px-1 py-0.5 bg-card"
                         title="Temps maximal pour se rendre depuis l'étape précédente jusqu'à ce site" @change="emettre" />
                  <span class="text-[10px] text-muted-foreground">min</span>
                </label>
                <label v-if="e.role === 'repos' || e.role === 'controle'" class="flex items-center gap-1">
                  <span class="text-[10px] text-muted-foreground whitespace-nowrap">Arrêt max</span>
                  <input v-model.number="e.pausePrevueMin" type="number" min="0" placeholder="-"
                         class="w-12 text-[10px] border border-border rounded px-1 py-0.5 bg-card"
                         title="Durée maximale d'arrêt autorisée sur ce site" @change="emettre" />
                  <span class="text-[10px] text-muted-foreground">min</span>
                </label>
              </div>
            </div>

            <button class="shrink-0 text-muted-foreground hover:text-danger bg-transparent border-0 cursor-pointer p-0.5"
                    title="Retirer ce site" @click="retirer(i)"><X class="w-3.5 h-3.5" /></button>
          </li>
        </ul>

        <div v-if="etapes.length" class="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border text-[11px]">
          <span class="text-muted-foreground">Distance simulée</span>
          <span class="font-semibold text-foreground">{{ distance }} km · {{ fmtDureeMin(duree) }}</span>
        </div>
      </div>

      <!-- Sites disponibles -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <h3 :class="L.cardTitle" class="!mb-0"><MapPin class="w-4 h-4 text-primary" /> Sites disponibles</h3>
        </div>
        <div :class="L.searchBox" class="mb-2">
          <Search class="w-3.5 h-3.5 text-muted-foreground" />
          <input v-model="q" :class="L.searchInput" placeholder="Rechercher un site…" />
        </div>
        <ul class="flex flex-col gap-1 max-h-[240px] overflow-y-auto">
          <li v-for="s in sitesFiltres" :key="s.id">
            <button class="w-full text-left flex items-center gap-2 rounded-md px-2 py-1.5 bg-transparent border-0 cursor-pointer hover:bg-background transition-colors"
                    @click="ajouter(s)">
              <Plus class="w-3.5 h-3.5 text-primary shrink-0" />
              <span class="flex-1 min-w-0">
                <span class="text-xs text-foreground block truncate">{{ s.nom }}</span>
                <span class="text-[10px] text-muted-foreground">{{ s.code }} · {{ s.ville }}</span>
              </span>
            </button>
          </li>
          <li v-if="!sitesFiltres.length" class="text-xs text-muted-foreground py-2 text-center">Aucun site correspondant.</li>
        </ul>
      </div>
    </div>

    <!-- ══ VOLET DROIT · simulation cartographique ════════════ -->
    <div :class="L.card">
      <div class="flex items-center justify-between mb-3">
        <h3 :class="L.cardTitle" class="!mb-0"><Route class="w-4 h-4 text-primary" /> Itinéraire proposé</h3>
        <span class="text-[11px] text-muted-foreground">Simulation - non enregistrée</span>
      </div>
      <FleetMap :trace-prevu="trace" :marqueurs="marqueurs" height="480px" :show-legend="false" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Sélecteur interactif de trajet, copié à la lettre de SelecteurTrajet de
 * le socle FMS : à gauche les sites et leur ordre, à droite la carte qui trace la
 * proposition en direct. Le glisser-déposer réordonne la séquence et la
 * carte se met à jour immédiatement. Le tracé n'est jamais persisté.
 */
import { ref, computed, watch } from 'vue'
import { Bookmark, GripVertical, ListOrdered, MapPin, Plus, Route, Search, X } from '@lucide/vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import FleetMap from './FleetMap.vue'
import { useTrajetsStore } from '../../stores/trajets'
import { useSitesStore } from '../../stores/sites'
import { LIB_ROLE_ETAPE } from '../../utils/voyageUtils'
import type { EtapeVoyage, RoleEtape } from '../../types'
import * as L from '../../lib/listClasses'

const props = defineProps<{ modelValue?: EtapeVoyage[] }>()
const emit = defineEmits<{ 'update:modelValue': [etapes: EtapeVoyage[]]; 'trajet-ref': [id: string] }>()

const trajetsStore = useTrajetsStore()
const sitesStore = useSitesStore()

const optionsTrajets = computed<DropdownItem[]>(() =>
  trajetsStore.recurrents.map(t => ({ id: t.id, label: t.libelle, sublabel: t.code })))

const nbAller = computed(() => etapes.value.filter(e => (e.volet ?? 'aller') === 'aller').length)
const nbRetour = computed(() => etapes.value.filter(e => e.volet === 'retour').length)

const COULEUR_ROLE: Record<RoleEtape, string> = {
  depart: '#0B4480', chargement: '#0072C5', livraison: '#16a34a',
  controle: '#6b7280', repos: '#ca8a04', arrivee: '#0B4480',
}

const etapes = ref<EtapeVoyage[]>([...(props.modelValue ?? [])])
const trajetRef = ref('')
const q = ref('')
const dragIndex = ref<number | null>(null)

watch(() => props.modelValue, v => {
  if (v && JSON.stringify(v) !== JSON.stringify(etapes.value)) etapes.value = [...v]
})

const sitesFiltres = computed(() => {
  const s = q.value.toLowerCase()
  return sitesStore.sites.filter(x => x.actif).filter(x => !s || `${x.nom} ${x.code} ${x.ville}`.toLowerCase().includes(s))
})

const trace = computed(() => etapes.value.map(e => ({ lat: e.lat, lng: e.lng })))
const marqueurs = computed(() => etapes.value.map((e, i) => ({
  id: e.id, lat: e.lat, lng: e.lng, libelle: `${i + 1}. ${e.siteNom}`, sousTitre: LIB_ROLE_ETAPE[e.role],
  couleur: COULEUR_ROLE[e.role], numero: i + 1,
})))

const distance = computed(() => trajetsStore.distanceSimulee(etapes.value))
const duree = computed(() => trajetsStore.dureeSimulee(etapes.value))
function fmtDureeMin(min: number) {
  if (!min) return '0 min'
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60 ? (min % 60) + ' min' : ''}`.trim() : `${min} min`
}

function emettre() {
  etapes.value = trajetsStore.renumeroter(etapes.value)
  emit('update:modelValue', etapes.value)
}

function ajouter(site: { id: string; nom: string; lat: number; lng: number }) {
  const role: RoleEtape = etapes.value.length === 0 ? 'depart' : 'livraison'
  etapes.value.push({ ...trajetsStore.nouvelleEtape(site, etapes.value.length + 1, role), franchi: false })
  emettre()
}
function retirer(i: number) { etapes.value.splice(i, 1); emettre() }

/** Réordonnancement par glisser-déposer : la carte suit immédiatement. */
function survol(i: number) {
  const from = dragIndex.value
  if (from === null || from === i) return
  const item = etapes.value[from]
  if (!item) return
  etapes.value.splice(from, 1)
  etapes.value.splice(i, 0, item)
  dragIndex.value = i
  emettre()
}

function chargerTrajet(id: string) {
  trajetRef.value = id
  if (!id) { emit('trajet-ref', ''); return }
  const t = trajetsStore.getById(id)
  if (!t) return
  etapes.value = t.etapes.map(e => ({ ...e, id: `${e.id}-c${Date.now()}`, franchi: false }))
  emit('trajet-ref', t.id)
  emettre()
}
</script>
