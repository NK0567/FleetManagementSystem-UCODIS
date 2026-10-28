<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Check, LoaderCircle, X, Plus, CircleAlert } from '@lucide/vue'

const { t } = useI18n()

defineProps<{
  title: string
  bannerLabel: string
  createLabel: string
  isSaving: boolean
  saveError: string | null
}>()

const emit = defineEmits<{
  close: []
  create: []
}>()

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="#below-topbar">
    <div class="absolute inset-0 z-50 flex">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-md" @click="emit('close')"></div>

      <div class="relative z-10 flex flex-col w-full h-full bg-white overflow-hidden mx-0 lg:mx-24">
        <div
          class="bg-primary text-primary-foreground px-6 py-2 flex items-center justify-between text-sm shrink-0"
        >
          <div class="flex items-center gap-2">
            <button
              @click="emit('close')"
              class="p-1 hover:bg-white/20 rounded transition"
              :title="t('common.cancel')"
            >
              <ArrowLeft class="w-5 h-5" />
            </button>
            <span>{{ bannerLabel }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="flex items-center gap-1 text-yellow-200">
              <Plus class="w-4 h-4" />
              {{ t('common.creation') }}
            </span>
          </div>
        </div>

        <div class="bg-card border-b border-border px-6 py-4 shrink-0">
          <div class="flex items-center justify-between">
            <h1 class="text-2xl font-semibold text-card-foreground">{{ title }}</h1>
            <div class="flex items-center gap-2">
              <button
                @click="emit('create')"
                :disabled="isSaving"
                class="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-primary rounded hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LoaderCircle v-if="isSaving" class="animate-spin w-4 h-4" />
                <Check v-else class="w-4 h-4" />
                {{ isSaving ? t('common.creating') : createLabel }}
              </button>
              <button
                @click="emit('close')"
                :disabled="isSaving"
                class="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-card-foreground border border-border rounded hover:bg-accent transition disabled:opacity-50"
              >
                <X class="w-4 h-4" />
                {{ t('common.cancel') }}
              </button>
            </div>
          </div>

          <div
            v-if="saveError"
            class="mt-3 px-4 py-2 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive flex items-center gap-2"
          >
            <CircleAlert class="w-4 h-4 shrink-0" />
            {{ saveError }}
          </div>
        </div>

        <div class="flex flex-1 overflow-hidden">
          <slot name="form" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--color-muted);
}
::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-muted-foreground);
}
</style>
