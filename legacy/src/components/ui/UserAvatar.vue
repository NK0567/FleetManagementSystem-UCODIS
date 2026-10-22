<template>
  <div class="inline-flex shrink-0 overflow-hidden rounded-full" :class="TAILLES[taille]">
    <span
      class="w-full h-full flex items-center justify-center text-white font-bold"
      :style="{ background: couleur }"
    >{{ init }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { initiales } from '../../utils/helpers'

const props = withDefaults(defineProps<{ nom: string; taille?: 'sm' | 'md' | 'lg' }>(), {
  taille: 'md',
})

const TAILLES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-6 h-6 text-[9px]',
  md: 'w-8 h-8 text-[11px]',
  lg: 'w-11 h-11 text-sm',
}

/* Palette sobre : la couleur ne porte aucune information, elle sert
   seulement à distinguer les personnes d'un coup d'œil. */
const COULEURS = ['#E8453C', '#3A4553', '#1D4ED8', '#15803D', '#92400E', '#6D28D9']

const init = computed(() => initiales(props.nom))

const couleur = computed(() => {
  let h = 0
  for (let i = 0; i < props.nom.length; i++) h = props.nom.charCodeAt(i) + ((h << 5) - h)
  return COULEURS[Math.abs(h) % COULEURS.length]
})
</script>
