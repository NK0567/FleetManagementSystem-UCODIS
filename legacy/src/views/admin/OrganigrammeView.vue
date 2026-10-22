<template>
  <div :class="L.pageWrap">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Organigramme</div>
        <div :class="L.pageSub">Structure organisationnelle d'UCODIS Transport</div>
      </div>
    </div>

    <!-- KPIs identiques à la liste des entités -->
    <div class="grid grid-cols-4 gap-2.5 mb-4 max-md:grid-cols-2">
      <div :class="L.kpiItem">
        <div :class="L.kpiItemIcon" class="bg-success-bg"><Building class="w-[18px] h-[18px] text-success" /></div>
        <div><div :class="L.kpiItemVal">{{ entites.liste.length }}</div><div :class="L.kpiItemLbl">Total entités</div></div>
      </div>
      <div :class="L.kpiItem">
        <div :class="L.kpiItemIcon" class="bg-success-bg"><Users class="w-[18px] h-[18px] text-success" /></div>
        <div><div :class="L.kpiItemVal">{{ personnel.effectif }}</div><div :class="L.kpiItemLbl">Effectif total</div></div>
      </div>
      <div :class="L.kpiItem">
        <div :class="L.kpiItemIcon" class="bg-primary/10"><Check class="w-[18px] h-[18px] text-primary" /></div>
        <div><div :class="L.kpiItemVal">{{ entites.validees.length }}</div><div :class="L.kpiItemLbl">Validées</div></div>
      </div>
      <div :class="L.kpiItem">
        <div :class="[L.kpiItemIcon, entites.enAttente.length > 0 ? 'bg-warning-bg' : 'bg-background']">
          <Clock class="w-[18px] h-[18px]" :class="entites.enAttente.length > 0 ? 'text-warning' : 'text-muted-foreground'" />
        </div>
        <div>
          <div :class="L.kpiItemVal" class="flex items-center gap-1.5">
            {{ entites.enAttente.length }}
            <span v-if="entites.enAttente.length > 0" class="bg-danger text-white text-[9px] font-bold px-[5px] py-px rounded-full">!</span>
          </div>
          <div :class="L.kpiItemLbl">En attente</div>
        </div>
      </div>
    </div>

    <!-- Onglets : même source unique que EntiteListView -->
    <EntiteTabsContent @ouvrir="openCardId = $event" />

    <EntiteCard
      v-if="openCardId !== null"
      :entites="entites.liste"
      :entite-id="openCardId"
      @close="openCardId = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Building, Check, Clock, Users } from '@lucide/vue'
import EntiteTabsContent from '../../components/EntiteTabsContent.vue'
import EntiteCard from '../../components/cards/EntiteCard.vue'
import * as L from '../../lib/listClasses'
import { useEntiteStore } from '../../stores/entites'
import { usePersonnelStore } from '../../stores/personnel'

const entites = useEntiteStore()
const personnel = usePersonnelStore()

const openCardId = ref<string | null>(null)
</script>
