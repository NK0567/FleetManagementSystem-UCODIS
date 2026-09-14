<template>
  <span
    class="text-xs font-medium px-2.5 py-[3px] rounded-full whitespace-nowrap"
    :class="cfg.classe"
  >{{ cfg.libelle }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StatutDemande } from '../../stores/absences'

const props = defineProps<{ statut: StatutDemande }>()

const CONFIG: Record<StatutDemande, { libelle: string; classe: string }> = {
  brouillon: { libelle: 'Brouillon', classe: 'bg-neutral-bg text-neutral' },
  attente:   { libelle: 'En attente', classe: 'bg-warning-bg text-warning' },
  approuve:  { libelle: 'Approuvé',   classe: 'bg-success-bg text-success' },
  refuse:    { libelle: 'Refusé',     classe: 'bg-danger-bg text-danger' },
  retourne:  { libelle: 'Retourné',   classe: 'bg-info-bg text-info' },
}

const cfg = computed(() => CONFIG[props.statut])
</script>
