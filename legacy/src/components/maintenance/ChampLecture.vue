<script setup lang="ts">
/** Libellé et valeur en lecture, au format des autres fiches. */
defineProps<{ libelle: string; mono?: boolean; large?: boolean }>()
</script>

<template>
  <div class="flex flex-col gap-1" :class="large && 'col-span-full'">
    <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">{{ libelle }}</label>
    <span class="text-sm text-foreground" :class="mono && 'font-mono'"><slot /></span>
  </div>
</template>
