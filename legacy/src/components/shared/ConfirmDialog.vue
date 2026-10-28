<script setup lang="ts">
/**
 * Boîte de dialogue de confirmation, centrée et téléportée dans le body.
 * Sert pour l'abandon de modifications et les suppressions.
 */
import { onMounted, onBeforeUnmount } from 'vue'
import { TriangleAlert } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
  }>(),
  { confirmLabel: 'Confirmer', cancelLabel: 'Annuler', destructive: false },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()

function onKeydown(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') emit('cancel')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="emit('cancel')"></div>
      <div class="relative z-10 w-full max-w-[420px] bg-card border border-border rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.22)] p-5">
        <div class="flex items-start gap-3">
          <div class="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
               :class="destructive ? 'bg-danger-bg text-danger' : 'bg-primary/10 text-primary'">
            <TriangleAlert class="w-5 h-5" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-[15px] font-semibold text-foreground">{{ title }}</h3>
            <p class="text-[13px] text-muted-foreground mt-1 leading-relaxed">{{ message }}</p>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="px-4 py-[7px] rounded-md text-[13px] font-medium cursor-pointer bg-card text-foreground border border-border transition-colors hover:bg-background"
                  @click="emit('cancel')">{{ cancelLabel }}</button>
          <button class="px-4 py-[7px] rounded-md text-[13px] font-medium cursor-pointer text-primary-foreground transition-colors"
                  :class="destructive ? 'bg-danger hover:bg-danger/90' : 'bg-primary hover:bg-primary/90'"
                  @click="emit('confirm')">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
