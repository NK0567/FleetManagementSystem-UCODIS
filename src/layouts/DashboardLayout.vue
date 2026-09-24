<script setup lang="ts">
/**
 * Coquille de l'application : barre sombre, barre de navigation, puis
 * la barre latérale et le contenu. Même structure que sur les projets
 * de flotte précédents pour que les habitudes se transposent.
 *
 * Le module Planification n'a pas de barre latérale : un seul écran,
 * le tableau kanban, qui a besoin de toute la largeur disponible pour
 * que ses cinq colonnes restent visibles sans défilement horizontal -
 * fidèle à la référence étudiée, qui n'a elle-même aucune barre
 * latérale sur cet écran.
 */
import AppTopBar from '../components/AppTopBar.vue'
import AppNavBar from '../components/AppNavBar.vue'
import AppSidebar from '../components/AppSidebar.vue'
import { useNavigationStore } from '../stores/navigation'

const nav = useNavigationStore()
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <AppTopBar />
    <!-- Les fiches en superposition se téléportent ici : elles recouvrent
         la navigation et la liste, mais pas la barre sombre. -->
    <div id="below-topbar" class="flex flex-col flex-1 min-h-0 relative">
      <AppNavBar />
      <div class="flex flex-1 min-h-0">
        <AppSidebar v-if="nav.moduleActif !== 'planification'" />
        <main class="flex-1 min-w-0 overflow-y-auto bg-background zone-scroll">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.zone-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.zone-scroll::-webkit-scrollbar-track { background: transparent; }
.zone-scroll::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 4px; }
.zone-scroll::-webkit-scrollbar-thumb:hover { background: var(--color-muted-foreground); }
</style>
