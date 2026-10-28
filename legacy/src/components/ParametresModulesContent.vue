<template>
  <div class="flex flex-col gap-2.5">
    <div v-for="m in params.modules" :key="m.cle" :class="L.tableCard" class="px-4 py-3.5 flex items-start gap-3.5">
      <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
        <input type="checkbox" class="sr-only peer" :checked="m.actif" @change="params.basculer(m.cle)" />
        <span :class="toggleTrack"></span>
      </label>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-[14px] font-semibold text-foreground">{{ m.libelle }}</span>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="m.actif ? 'bg-success-bg text-success' : 'bg-neutral-bg text-neutral'">
            {{ m.actif ? 'Activé' : 'Désactivé' }}
          </span>
        </div>
        <p class="text-[13px] text-muted-foreground mt-1">{{ m.description }}</p>
        <p v-if="m.note" class="text-[11px] text-muted-foreground italic mt-1.5 flex items-start gap-1.5">
          <Info class="w-3 h-3 shrink-0 mt-0.5" /> {{ m.note }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Info } from '@lucide/vue'
import * as L from '../lib/listClasses'
import { useParametresModulesStore } from '../stores/parametresModules'

const params = useParametresModulesStore()

const toggleTrack = "w-9 h-5 rounded-full bg-foreground/20 transition-colors peer-checked:bg-primary relative after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:w-3.5 after:h-3.5 after:bg-white after:rounded-full after:shadow after:transition-all peer-checked:after:left-[19px]"
</script>
