<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { LoaderCircle, X } from '@lucide/vue'

const { t } = useI18n()

withDefaults(
  defineProps<{
    open: boolean
    title?: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
    loading?: boolean
    panelClass?: string
  }>(),
  { panelClass: 'max-w-sm' }
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
      @click="!loading && emit('cancel')"
    >
      <div :class="['bg-card rounded-lg shadow-lg p-6 w-full mx-4', panelClass]" @click.stop>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-semibold text-card-foreground">
            {{ title ?? t('common.confirmTitle') }}
          </h3>
          <button
            @click="emit('cancel')"
            :disabled="loading"
            class="p-1 text-muted-foreground hover:text-card-foreground rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div
          v-if="loading"
          class="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
          role="status"
        >
          <LoaderCircle class="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          {{ t('common.saving') }}
        </div>

        <p v-if="message" class="text-muted-foreground mb-4">{{ message }}</p>
        <slot v-else />

        <div class="flex gap-3 justify-end mt-4">
          <button
            @click="emit('cancel')"
            :disabled="loading"
            class="px-4 py-2 border border-border text-card-foreground rounded hover:bg-accent transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ cancelLabel ?? t('common.cancel') }}
          </button>
          <button
            @click="emit('confirm')"
            :disabled="loading"
            :class="[
              'px-4 py-2 rounded hover:opacity-90 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed',
              destructive ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground'
            ]"
          >
            {{ confirmLabel ?? t('common.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
