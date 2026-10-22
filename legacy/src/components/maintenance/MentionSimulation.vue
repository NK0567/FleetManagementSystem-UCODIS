<template>
  <RouterLink v-if="simule" :to="{ name: 'maintenance-parametres' }"
    class="inline-flex items-center gap-1 text-[11px] font-medium text-warning no-underline hover:underline"
    :title="justification">
    <FlaskConical class="w-3 h-3 shrink-0" />
    <span>{{ texte }}</span>
  </RouterLink>
</template>

<script setup lang="ts">
/**
 * Mention « valeur de simulation », reprise du socle FMS. Un taux
 * calculé sur une capacité simulée s'affiche exactement comme un taux
 * calculé sur la capacité réelle : rien ne les distingue en bout de
 * chaîne sans cette mention. Le lien renvoie directement à la saisie.
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { FlaskConical } from '@lucide/vue'
import { useMaintenanceStore } from '../../stores/maintenance'

const props = withDefaults(defineProps<{
  groupe: 'capacite' | 'mainOeuvre' | 'immobilisation'
  texte?: string
}>(), {
  texte: 'valeur de simulation',
})

const store = useMaintenanceStore()
const simule = computed(() => store.estSimule(props.groupe))
const justification = computed(() =>
  store.parametresAtelier[props.groupe].justification ?? 'Valeur de départ, à remplacer par la donnée réelle.')
</script>
