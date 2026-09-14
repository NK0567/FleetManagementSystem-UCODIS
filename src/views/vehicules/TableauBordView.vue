<template>
  <div class="px-7 py-6 max-w-[1400px] mx-auto w-full max-[640px]:px-4">

    <div class="flex items-center justify-between mb-3.5 gap-3 flex-wrap">
      <div>
        <div class="text-lg font-semibold">Tableau de bord Véhicules</div>
        <div class="text-[13px] text-muted-foreground mt-px">
          Parc UCODIS Transport · {{ vehicules.liste.length }} véhicules
        </div>
      </div>
      <RouterLink :to="{ name: 'vehicules-liste' }" :class="btnPrimary">
        <Truck class="w-4 h-4" /> Voir le parc
      </RouterLink>
    </div>

    <!-- Indicateurs -->
    <div class="grid grid-cols-4 gap-2.5 mb-3.5 max-lg:grid-cols-2">
      <div :class="kpiCard">
        <div :class="kpiAccent" class="bg-info-bg"><Truck class="w-[17px] h-[17px] text-info" /></div>
        <div :class="kpiLabel">Parc total</div>
        <div :class="kpiValue">{{ vehicules.liste.length }}</div>
        <div :class="kpiSub">{{ vehicules.tracteurs.length }} tracteurs · {{ vehicules.semiRemorques.length }} semi-remorques</div>
      </div>
      <div :class="kpiCard">
        <div :class="kpiAccent" class="bg-success-bg"><CircleCheck class="w-[17px] h-[17px] text-success" /></div>
        <div :class="kpiLabel">Disponibles</div>
        <div :class="kpiValue">{{ vehicules.disponibles.length }}</div>
        <div :class="kpiSub">prêts à être affectés</div>
      </div>
      <div :class="kpiCard">
        <div :class="kpiAccent" class="bg-primary/10"><Route class="w-[17px] h-[17px] text-primary" /></div>
        <div :class="kpiLabel">En circulation</div>
        <div :class="kpiValue">{{ vehicules.enCirculation.length }}</div>
        <div :class="kpiSub">affectés à un conducteur</div>
      </div>
      <div :class="kpiCard">
        <div :class="kpiAccent" class="bg-danger-bg"><TriangleAlert class="w-[17px] h-[17px] text-danger" /></div>
        <div :class="kpiLabel">Immobilisés</div>
        <div :class="kpiValue">{{ vehicules.immobilises.length }}</div>
        <div :class="kpiSub">en réparation ou hors service</div>
      </div>
    </div>

    <!-- Bandeau : véhicules immobilisés -->
    <div v-if="vehicules.immobilises.length" class="bg-card border border-danger/25 rounded-lg overflow-hidden mb-4">
      <div class="flex items-center gap-2 px-4 py-2.5 bg-danger-bg border-b border-danger/15">
        <TriangleAlert class="w-4 h-4 text-danger shrink-0" />
        <span class="text-[13px] font-semibold text-danger">
          {{ vehicules.immobilises.length }} véhicule(s) immobilisé(s)
        </span>
      </div>
      <div class="divide-y divide-border">
        <RouterLink
          v-for="v in vehicules.immobilises" :key="v.id"
          :to="{ name: 'vehicules-liste' }"
          class="flex items-center gap-3 px-4 py-2.5 no-underline text-foreground hover:bg-background"
        >
          <div class="w-9 h-9 rounded-lg bg-background flex items-center justify-center shrink-0">
            <Truck class="w-4 h-4 text-muted-foreground" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[13px] font-medium truncate">{{ v.immatriculation }} · {{ v.marque }} {{ v.modele }}</div>
            <div class="text-[11px] text-muted-foreground">{{ v.motifIndisponibilite }}</div>
          </div>
          <StatusPill :statut="v.statut" :libelle="vehicules.LIBELLES_STATUT[v.statut]" />
        </RouterLink>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3 max-lg:grid-cols-1">

      <!-- Attelages -->
      <div :class="card" class="col-span-2 max-lg:col-span-1">
        <div :class="cardTitle"><Link2 class="w-4 h-4 text-primary" /> Attelages et conducteurs</div>
        <div class="flex flex-col gap-2">
          <div v-for="tr in vehicules.tracteurs" :key="tr.id" class="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
            <span class="font-mono text-xs font-semibold text-primary w-[85px] shrink-0">{{ tr.immatriculation }}</span>
            <StatusPill :statut="tr.statut" :libelle="vehicules.LIBELLES_STATUT[tr.statut]" />
            <span class="text-muted-foreground text-xs">→</span>
            <span class="text-[12px] flex-1 min-w-0 truncate">
              <template v-if="attelageDe(tr.id)">{{ semiDe(tr.id) }}</template>
              <template v-else class="italic text-muted-foreground">Non attelé</template>
            </span>
            <UserAvatar v-if="conducteurDe(tr.id)" :nom="conducteurDe(tr.id)!" taille="sm" />
            <span class="text-[12px] text-muted-foreground w-[140px] shrink-0 truncate">
              {{ conducteurDe(tr.id) ?? 'Non affecté' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Répartition par statut -->
      <div :class="card">
        <div :class="cardTitle"><ChartColumn class="w-4 h-4 text-primary" /> Répartition du parc</div>
        <div class="flex flex-col gap-2.5">
          <div v-for="s in repartition" :key="s.statut" class="flex items-center gap-2.5">
            <span class="w-2 h-2 rounded-full shrink-0" :class="s.couleur"></span>
            <span class="text-[13px] flex-1">{{ vehicules.LIBELLES_STATUT[s.statut] }}</span>
            <span class="text-[13px] font-semibold tabular-nums">{{ s.nb }}</span>
          </div>
        </div>
        <p class="text-[11px] text-muted-foreground mt-3.5 pt-3 border-t border-border leading-relaxed">
          Le statut ne se saisit pas à la main : il se déduit des faits enregistrés
          (attelage, affectation, ordre de réparation).
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ChartColumn, CircleCheck, Link2, Route, TriangleAlert, Truck } from '@lucide/vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import type { StatutVehicule } from '../../types'

const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()

const btnPrimary = 'px-4 py-[7px] rounded-md text-[13px] font-medium cursor-pointer flex items-center gap-1.5 bg-primary text-primary-foreground no-underline transition-colors hover:bg-primary/90'
const kpiCard = 'bg-card border border-border rounded-lg px-3.5 py-3'
const kpiAccent = 'w-8 h-8 rounded-md flex items-center justify-center mb-2'
const kpiLabel = 'text-[13px] text-muted-foreground mb-1'
const kpiValue = 'text-[28px] font-semibold leading-none'
const kpiSub = 'text-xs text-muted-foreground mt-[3px]'
const card = 'bg-card border border-border rounded-lg p-3.5'
const cardTitle = 'flex items-center gap-1.5 text-sm font-semibold text-foreground mb-3'

function attelageDe(tracteurId: string) { return vehicules.attelageActif(tracteurId) }
function semiDe(tracteurId: string) {
  const at = vehicules.attelageActif(tracteurId)
  if (!at) return null
  return vehicules.parId(at.semiRemorqueId)?.immatriculation ?? null
}
function conducteurDe(tracteurId: string) {
  const af = vehicules.affectationActive(tracteurId)
  if (!af) return null
  return personnel.parId(af.conducteurId)?.nomComplet ?? null
}

const COULEURS: Record<StatutVehicule, string> = {
  actif: 'bg-success', affecte: 'bg-primary', reparation: 'bg-warning',
  hors_service: 'bg-danger', vendu: 'bg-neutral',
}
const repartition = computed(() => {
  const ordre: StatutVehicule[] = ['actif', 'affecte', 'reparation', 'hors_service', 'vendu']
  return ordre
    .map(statut => ({ statut, nb: vehicules.liste.filter(v => v.statut === statut).length, couleur: COULEURS[statut] }))
    .filter(s => s.nb > 0)
})
</script>
