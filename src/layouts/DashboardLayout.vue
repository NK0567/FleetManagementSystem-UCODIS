<script setup lang="ts">
/**
 * Coquille de l'application : barre sombre, barre de navigation, puis
 * la barre latérale et le contenu. Même structure que sur les projets
 * de flotte précédents pour que les habitudes se transposent.
 */
import AppTopBar from '../components/AppTopBar.vue'
import AppNavBar from '../components/AppNavBar.vue'
import AppSidebar from '../components/AppSidebar.vue'
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <AppTopBar />
    <!-- Les fiches en superposition se téléportent ici : elles recouvrent
         la navigation et la liste, mais pas la barre sombre. -->
    <div id="below-topbar" class="flex flex-col flex-1 min-h-0 relative">
      <AppNavBar />
      <div class="flex flex-1 min-h-0">
        <AppSidebar />
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
