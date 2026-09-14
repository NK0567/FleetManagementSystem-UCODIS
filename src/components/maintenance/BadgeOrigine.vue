<template>
  <span class="text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1"
    :class="simule ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'">
    <component :is="simule ? FlaskConical : BadgeCheck" class="w-3 h-3" />
    {{ simule ? 'Valeur de simulation' : 'Donnée UCODIS' }}
  </span>
</template>

<script setup lang="ts">
/**
 * Origine d'un groupe de paramètres de l'atelier, copié à la lettre de
 * le socle FMS. Un chiffre simulé produit les mêmes calculs qu'un chiffre réel :
 * rien ne le distingue une fois affiché en bout de chaîne. Ce badge le
 * distingue à la source.
 */
import { computed } from 'vue'
import { FlaskConical, BadgeCheck } from '@lucide/vue'
import { useMaintenanceStore } from '../../stores/maintenance'

const props = defineProps<{ groupe: 'capacite' | 'mainOeuvre' | 'immobilisation' }>()
const store = useMaintenanceStore()
const simule = computed(() => store.estSimule(props.groupe))
</script>
