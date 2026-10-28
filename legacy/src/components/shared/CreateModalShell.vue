<script setup lang="ts">
/**
 * Coquille de création en page pleine, reprise à la lettre de
 * CreateModalShell des projets de référence : bannière avec retour et
 * indicateur « Création », barre de titre avec les actions Créer/Annuler,
 * contenu au centre. Se distingue de CardModalShell par l'absence de
 * navigateur latéral entre fiches · il n'y a rien à parcourir tant que
 * l'enregistrement n'existe pas encore.
 */
import { onMounted, onUnmounted } from 'vue'
import { ArrowLeft, Check, LoaderCircle, X, CircleAlert, Plus } from '@lucide/vue'

defineProps<{
  title: string
  bannerLabel: string
  createLabel?: string
  isSaving?: boolean
  saveError?: string | null
}>()

const emit = defineEmits<{ close: []; create: [] }>()

function onKeydown(e: KeyboardEvent) { if (e.key === 'Escape') emit('close') }
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  window.scrollTo({ top: 0 })
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="#below-topbar" defer>
    <div class="absolute inset-0 z-50 flex">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-md" @click="emit('close')"></div>

      <div class="relative z-10 flex flex-col w-full h-full bg-card overflow-hidden mx-4 lg:mx-auto lg:max-w-[1040px] shadow-[0_8px_32px_rgba(0,0,0,0.16)]">
        <!-- Bannière -->
        <div class="bg-primary text-primary-foreground px-6 py-2 flex items-center justify-between text-sm shrink-0">
          <div class="flex items-center gap-2">
            <button class="p-1 hover:bg-white/20 rounded transition cursor-pointer" title="Annuler" @click="emit('close')">
              <ArrowLeft class="w-5 h-5" />
            </button>
            <span>{{ bannerLabel }}</span>
          </div>
          <span class="flex items-center gap-1 text-yellow-200">
            <Plus class="w-4 h-4" /> Création
          </span>
        </div>

        <!-- Barre de titre -->
        <div class="bg-card border-b border-border px-6 py-4 shrink-0">
          <div class="flex items-center justify-between">
            <h1 class="text-2xl font-semibold text-card-foreground">{{ title }}</h1>
            <div class="flex items-center gap-2">
              <button
                class="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                :disabled="isSaving" @click="emit('create')"
              >
                <LoaderCircle v-if="isSaving" class="animate-spin w-4 h-4" />
                <Check v-else class="w-4 h-4" />
                {{ isSaving ? 'Création…' : (createLabel ?? 'Créer') }}
              </button>
              <button
                class="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-card-foreground border border-border rounded-md hover:bg-background transition disabled:opacity-50 cursor-pointer"
                :disabled="isSaving" @click="emit('close')"
              >
                <X class="w-4 h-4" /> Annuler
              </button>
            </div>
          </div>

          <div v-if="saveError" class="mt-3 px-4 py-2 bg-danger-bg border border-danger/30 rounded-md text-sm text-danger flex items-center gap-2">
            <CircleAlert class="w-4 h-4 shrink-0" /> {{ saveError }}
          </div>
        </div>

        <!-- Contenu -->
        <div class="flex-1 overflow-y-auto">
          <slot name="form" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
