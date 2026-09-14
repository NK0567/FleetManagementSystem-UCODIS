<template>
  <Teleport to="body">
    <div v-if="ouvert" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40" @click="$emit('fermer')"></div>

      <div class="relative bg-card border border-border rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.20)] w-full max-w-[460px] max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <span class="text-[15px] font-semibold text-foreground">{{ titre }}</span>
          <button class="text-muted-foreground hover:text-foreground cursor-pointer" @click="$emit('fermer')">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="px-5 py-4 overflow-y-auto">
          <slot />
        </div>

        <div v-if="$slots.pied" class="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border">
          <slot name="pied" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from '@lucide/vue'

defineProps<{ ouvert: boolean; titre: string }>()
defineEmits<{ fermer: [] }>()
</script>
