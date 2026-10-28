<template>
  <div :class="L.pageWrap">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Journal d'activité</div>
        <div :class="L.pageSub">
          Qui a fait quoi, et quand. Le journal ne se modifie pas.
        </div>
      </div>
      <button :class="L.btnOutline"><Download class="w-4 h-4" /> Exporter</button>
    </div>

    <div :class="L.tableCard">
      <div :class="L.toolbar">
        <div :class="L.searchBox">
          <Search class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input v-model="recherche" type="text" placeholder="Auteur, action, cible…" :class="L.searchInput" />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table :class="L.table">
          <thead>
            <tr>
              <th :class="L.th">Horodatage</th>
              <th :class="L.th">Auteur</th>
              <th :class="L.th">Action</th>
              <th :class="L.th">Cible</th>
              <th :class="L.th">Détail</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="j in filtres" :key="j.id">
              <td :class="L.td" class="text-muted-foreground tabular-nums whitespace-nowrap">{{ j.horodatage }}</td>
              <td :class="L.td">
                <div class="flex items-center gap-2">
                  <UserAvatar v-if="j.auteur !== 'Système'" :nom="j.auteur" taille="sm" />
                  <span
                    v-else
                    class="w-6 h-6 rounded-full bg-neutral-bg text-neutral flex items-center justify-center shrink-0"
                  ><Cpu class="w-3 h-3" /></span>
                  <span>{{ j.auteur }}</span>
                </div>
              </td>
              <td :class="L.td" class="font-medium">{{ j.action }}</td>
              <td :class="L.td">{{ j.cible }}</td>
              <td :class="L.td" class="text-muted-foreground">{{ j.detail || '-' }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="filtres.length === 0" :class="L.emptyState">
          <Inbox class="w-8 h-8" /><p>Aucune entrée ne correspond.</p>
        </div>
      </div>
    </div>

    <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed max-w-3xl">
      Chaque modification sensible est horodatée et attribuée à son auteur, pour garder une
      traçabilité complète de ce qui a changé et par qui.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Cpu, Download, Inbox, Search } from '@lucide/vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import * as L from '../../lib/listClasses'
import { useJournalStore } from '../../stores/journal'

const journal = useJournalStore()
const recherche = ref('')

const filtres = computed(() => {
  const q = recherche.value.trim().toLowerCase()
  if (!q) return journal.liste
  return journal.liste.filter(j =>
    `${j.auteur} ${j.action} ${j.cible} ${j.detail ?? ''}`.toLowerCase().includes(q),
  )
})
</script>
