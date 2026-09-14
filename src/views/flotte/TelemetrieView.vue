<template>
  <div :class="L.pageWrap">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Télémétrie et diagnostics</div>
        <div :class="L.pageSub">Mesures embarquées par tracteur</div>
      </div>
    </div>

    <div class="max-w-xs mb-5">
      <label :class="L.fpFieldLabel">Sélectionner un tracteur</label>
      <SearchableDropdown v-model="selectionId" :items="optTracteurs" placeholder="Choisir un tracteur" />
    </div>

    <template v-if="donnees">
      <div class="grid grid-cols-3 gap-3 mb-6 max-md:grid-cols-2">
        <div :class="L.kpiCard">
          <div :class="L.kpiIcon" class="bg-info-bg"><Gauge class="w-[18px] h-[18px] text-info" /></div>
          <div :class="L.kpiLabel">Kilométrage</div>
          <div :class="L.kpiValue">{{ donnees.kilometrage.toLocaleString('fr-FR') }} km</div>
        </div>
        <div :class="L.kpiCard">
          <div :class="L.kpiIcon" class="bg-success-bg"><Fuel class="w-[18px] h-[18px] text-success" /></div>
          <div :class="L.kpiLabel">Niveau carburant</div>
          <div :class="L.kpiValue">{{ donnees.niveauCarburant }} %</div>
          <div class="h-1.5 bg-border rounded-full overflow-hidden mt-1.5">
            <div class="h-full rounded-full" :class="donnees.niveauCarburant > 25 ? 'bg-success' : 'bg-danger'" :style="{ width: donnees.niveauCarburant + '%' }"></div>
          </div>
        </div>
        <div :class="L.kpiCard">
          <div :class="[L.kpiIcon, donnees.etatMoteur ? 'bg-success-bg' : 'bg-neutral-bg']">
            <Cog class="w-[18px] h-[18px]" :class="donnees.etatMoteur ? 'text-success' : 'text-neutral'" />
          </div>
          <div :class="L.kpiLabel">État moteur</div>
          <div :class="L.kpiValue" class="!text-base">{{ donnees.etatMoteur ? 'En marche' : 'Arrêté' }}</div>
        </div>
        <div :class="L.kpiCard">
          <div :class="[L.kpiIcon, donnees.codeDefaut ? 'bg-warning-bg' : 'bg-success-bg']">
            <Wrench class="w-[18px] h-[18px]" :class="donnees.codeDefaut ? 'text-warning' : 'text-success'" />
          </div>
          <div :class="L.kpiLabel">Code défaut</div>
          <div v-if="donnees.codeDefaut" class="text-[13px] font-semibold text-warning mt-1">{{ donnees.codeDefaut }}</div>
          <div v-else class="text-[13px] font-semibold text-success mt-1">Aucun défaut</div>
        </div>
        <div :class="L.kpiCard">
          <div :class="[L.kpiIcon, donnees.signalOk ? 'bg-success-bg' : 'bg-danger-bg']">
            <component :is="donnees.signalOk ? Wifi : WifiOff" class="w-[18px] h-[18px]" :class="donnees.signalOk ? 'text-success' : 'text-danger'" />
          </div>
          <div :class="L.kpiLabel">Signal</div>
          <div class="text-[13px] font-semibold mt-1" :class="donnees.signalOk ? 'text-success' : 'text-danger'">
            {{ donnees.signalOk ? 'Signal OK' : 'Signal perdu' }}
          </div>
        </div>
        <div :class="L.kpiCard">
          <div :class="L.kpiIcon" class="bg-primary/10"><Clock class="w-[18px] h-[18px] text-primary" /></div>
          <div :class="L.kpiLabel">Dernière mesure</div>
          <div class="text-[13px] font-semibold mt-1">{{ formatHeure(donnees.derniereMAJ) }}</div>
        </div>
      </div>

      <div v-if="historique.length">
        <h2 class="text-[15px] font-semibold text-foreground mb-2.5">Dernières mesures</h2>
        <div :class="L.tableCard">
          <table :class="L.table">
            <thead>
              <tr>
                <th :class="L.th">Horodatage</th>
                <th :class="L.th">Kilométrage</th>
                <th :class="L.th">Carburant</th>
                <th :class="L.th">Moteur</th>
                <th :class="L.th">Code défaut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in historique" :key="idx">
                <td :class="L.td">{{ formatHoro(row.horodatage) }}</td>
                <td :class="L.td">{{ row.kilometrage.toLocaleString('fr-FR') }} km</td>
                <td :class="L.td">
                  <div class="flex items-center gap-2">
                    <div class="w-16 h-1.5 rounded-full bg-background overflow-hidden">
                      <div class="h-full rounded-full" :class="row.niveauCarburant > 25 ? 'bg-success' : 'bg-danger'" :style="{ width: row.niveauCarburant + '%' }"></div>
                    </div>
                    <span class="text-[11px]">{{ row.niveauCarburant }}%</span>
                  </div>
                </td>
                <td :class="L.td">
                  <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="row.etatMoteur ? 'bg-success-bg text-success' : 'bg-neutral-bg text-neutral'">
                    {{ row.etatMoteur ? 'Marche' : 'Arrêt' }}
                  </span>
                </td>
                <td :class="L.td">
                  <span v-if="row.codeDefaut" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-warning-bg text-warning">{{ row.codeDefaut }}</span>
                  <span v-else class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">OK</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-else-if="!selectionId" :class="L.emptyState">
      <Gauge class="w-8 h-8" /><p>Sélectionnez un tracteur pour afficher ses données de télémétrie.</p>
    </div>

    <!-- Un tracteur sans boîtier renvoyait un écran vide sans explication sur le socle FMS aussi : repris à l'identique. -->
    <div v-else :class="L.emptyState">
      <WifiOff class="w-8 h-8" />
      <p>Aucune remontée pour {{ plaqueSelectionnee }} : ce tracteur n'a pas de boîtier embarqué déclaré, ou son signal n'est jamais parvenu.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Clock, Cog, Fuel, Gauge, Wifi, WifiOff, Wrench } from '@lucide/vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import * as L from '../../lib/listClasses'
import { useVehiculeStore } from '../../stores/vehicules'

const vehicules = useVehiculeStore()

const selectionId = ref('')
const optTracteurs = computed<DropdownItem[]>(() =>
  vehicules.tracteurs.map(t => ({ id: t.id, label: t.immatriculation, sublabel: `${t.marque} ${t.modele}` })))

const donnees = computed(() => (selectionId.value ? vehicules.telemetrieDe(selectionId.value) : null))
const historique = computed(() => (selectionId.value ? vehicules.historiqueTelemetrie(selectionId.value) : []))
const plaqueSelectionnee = computed(() => vehicules.parId(selectionId.value)?.immatriculation ?? '')

function formatHeure(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function formatHoro(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>
