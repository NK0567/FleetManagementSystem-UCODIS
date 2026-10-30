<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowRight, X } from '@lucide/vue'
import { useOptionsStore } from '@/stores/optionsStore'
import { useUserStore } from '@/stores/user'
import { ROLE_GUIDES, type GuideText } from '../guideContent'

const emit = defineEmits<{ close: [] }>()

const { t, locale } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const optionsStore = useOptionsStore()

const profile = computed(() => userStore.user?.profile ?? null)
const guide = computed(() => (profile.value ? ROLE_GUIDES[profile.value] : null))
const roleName = computed(() =>
  profile.value ? optionsStore.getOptionLabel('userProfile', profile.value) : ''
)
const text = (value: GuideText) => (locale.value.startsWith('en') ? value.en : value.fr)

onMounted(() => {
  void optionsStore.fetchOptions()
})

function open(to: string | undefined) {
  if (!to) return
  emit('close')
  void router.push(to)
}
</script>

<template>
  <div class="fixed inset-0 z-[2000] flex justify-end" role="dialog" aria-modal="true">
    <button
      type="button"
      class="absolute inset-0 bg-black/30 cursor-default"
      :aria-label="t('common.close')"
      @click="emit('close')"
    />
    <aside
      class="relative w-full max-w-md h-full bg-card text-card-foreground shadow-xl flex flex-col"
    >
      <header class="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
        <div>
          <h2 class="text-lg font-semibold">{{ t('guide.title') }}</h2>
          <p v-if="roleName" class="text-sm text-primary font-medium">{{ roleName }}</p>
          <p v-if="guide" class="text-sm text-muted-foreground mt-1">{{ text(guide.intro) }}</p>
        </div>
        <button
          type="button"
          class="cursor-pointer p-1 text-muted-foreground hover:text-card-foreground"
          :aria-label="t('common.close')"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>
      </header>
      <ol v-if="guide" class="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <li
          v-for="(item, index) in guide.steps"
          :key="index"
          class="flex gap-3 rounded border border-border p-3"
        >
          <span
            class="w-7 h-7 shrink-0 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center"
          >
            {{ index + 1 }}
          </span>
          <div class="flex-1 min-w-0">
            <p class="font-medium">{{ text(item.title) }}</p>
            <p class="text-sm text-muted-foreground">{{ text(item.detail) }}</p>
            <button
              v-if="item.to"
              type="button"
              class="cursor-pointer mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              @click="open(item.to)"
            >
              {{ t('guide.open') }} <ArrowRight class="w-4 h-4" />
            </button>
          </div>
        </li>
      </ol>
      <p v-else class="px-5 py-4 text-sm text-muted-foreground">{{ t('guide.empty') }}</p>
    </aside>
  </div>
</template>
