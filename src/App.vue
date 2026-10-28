<script lang="ts" setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useAppBootstrapStore } from '@/stores/appBootstrapStore'
import { useOptionsStore } from '@/stores/optionsStore'
import { useReferenceStore } from '@/stores/referenceStore'
import { useUserStore } from '@/stores/user'

const BOOTSTRAP_FALLBACK_MS = 1200

const route = useRoute()
const router = useRouter()
const { initAuth } = useAuth()
const userStore = useUserStore()
const appBootstrap = useAppBootstrapStore()
const optionsStore = useOptionsStore()
const referenceStore = useReferenceStore()

watch(
  () => userStore.isAuthenticated,
  (authenticated) => {
    if (!authenticated) return
    void optionsStore.fetchOptions()
    void referenceStore.fetchAll()
  },
  { immediate: true }
)

// Pages without a deep-linked card never call finishAppReady: release the overlay after a delay.
let bootstrapFallbackTimer: ReturnType<typeof setTimeout> | null = null

function scheduleBootstrapFallback() {
  if (bootstrapFallbackTimer) clearTimeout(bootstrapFallbackTimer)
  if (!appBootstrap.active || appBootstrap.waitingForCard) return
  bootstrapFallbackTimer = setTimeout(() => {
    if (appBootstrap.active && !appBootstrap.waitingForCard) appBootstrap.finishAppReady()
  }, BOOTSTRAP_FALLBACK_MS)
}

watch(() => route.fullPath, scheduleBootstrapFallback, { immediate: true })

onMounted(() => {
  void initAuth()
  void router.isReady().then(scheduleBootstrapFallback)
})

onUnmounted(() => {
  if (bootstrapFallbackTimer) clearTimeout(bootstrapFallbackTimer)
})
</script>

<template>
  <RouterView />
  <AppBootstrapOverlay />
</template>
