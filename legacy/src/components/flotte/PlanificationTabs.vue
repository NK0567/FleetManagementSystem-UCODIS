<template>
  <div class="flex items-center gap-1.5 mb-4 shrink-0">
    <RouterLink v-for="o in onglets" :key="o.route" :to="{ name: o.route }"
                class="px-3 py-1.5 rounded-md text-[13px] font-medium no-underline transition-colors"
                :class="route.name === o.route ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-card'">
      {{ o.libelle }}
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
/** Les trois espaces du module : le planificateur suit les tournées, les
 *  agents appellent les clients pour les confirmer, l'entrepôt charge et
 *  réceptionne les retours - chaque acteur a son propre écran. */
import { useRoute } from 'vue-router'
const route = useRoute()
const onglets = [
  { route: 'planification-kanban', libelle: 'Tournées' },
  { route: 'planification-confirmations', libelle: 'Confirmations clients' },
  { route: 'planification-chargements', libelle: 'Chargements et retours' },
]
</script>
