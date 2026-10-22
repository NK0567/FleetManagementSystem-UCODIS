<script lang="ts" setup>
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommandPalette } from '@/composables/useCommandPalette'
import { Search, FileText, LoaderCircle, ArrowRight, CornerDownLeft, X } from '@lucide/vue'

const { t } = useI18n()
const {
  isOpen,
  query,
  activeIndex,
  isSearching,
  selectedEntityKey,
  filteredPages,
  entityResults,
  allResults,
  searchableEntities,
  close,
  selectResult,
  selectEntityTab,
  onKeydown
} = useCommandPalette()

const inputRef = ref<HTMLInputElement | null>(null)
const resultsRef = ref<HTMLDivElement | null>(null)

watch(isOpen, async (open) => {
  if (open) {
    await nextTick()
    inputRef.value?.focus()
  }
})

watch(activeIndex, async () => {
  await nextTick()
  const activeEl = resultsRef.value?.querySelector('[data-active="true"]')
  activeEl?.scrollIntoView({ block: 'nearest' })
})

const entityIcon = (key: string) =>
  searchableEntities.value.find((entity) => entity.key === key)?.icon ?? FileText

const onOverlayClick = () => {
  close()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="palette-overlay">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
        @click.self="onOverlayClick"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="onOverlayClick" />

        <Transition name="palette-modal">
          <div
            v-if="isOpen"
            class="relative w-full max-w-[600px] mx-4 bg-white rounded-xl shadow-2xl border border-primary/20 overflow-hidden flex flex-col max-h-[60vh]"
            @keydown="onKeydown"
          >
            <div class="flex items-center gap-3 px-4 py-3 border-b border-primary/10">
              <Search class="w-5 h-5 text-primary shrink-0" />
              <input
                ref="inputRef"
                v-model="query"
                type="text"
                :placeholder="t('common.commandPalette.placeholder')"
                class="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400 text-gray-900"
              />
              <div class="flex items-center gap-2">
                <kbd
                  class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded border border-gray-200"
                >
                  ESC
                </kbd>
                <button
                  type="button"
                  class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  :title="t('common.close')"
                  @click="close"
                >
                  <X class="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              v-if="searchableEntities.length > 0"
              class="flex items-center gap-1 px-4 py-2 border-b border-primary/5 overflow-x-auto"
            >
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150',
                  !selectedEntityKey
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-gray-500 hover:text-primary hover:bg-primary/5'
                ]"
                @click="selectEntityTab('')"
              >
                <FileText class="w-3.5 h-3.5" />
                {{ t('common.commandPalette.pages') }}
              </button>

              <button
                v-for="entity in searchableEntities"
                :key="entity.key"
                :class="[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150 whitespace-nowrap',
                  selectedEntityKey === entity.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-gray-500 hover:text-primary hover:bg-primary/5'
                ]"
                @click="selectEntityTab(entity.key)"
              >
                <component :is="entity.icon" class="w-3.5 h-3.5" />
                {{ t(entity.labelKey) }}
              </button>
            </div>

            <div ref="resultsRef" class="flex-1 overflow-y-auto overscroll-contain">
              <div v-if="isSearching" class="flex items-center gap-2 px-4 py-8 justify-center">
                <LoaderCircle class="w-5 h-5 animate-spin text-primary" />
                <span class="text-sm text-gray-500">{{
                  t('common.commandPalette.searching')
                }}</span>
              </div>

              <div
                v-else-if="allResults.length === 0 && query.trim()"
                class="px-4 py-8 text-center text-sm text-gray-500"
              >
                {{ t('common.commandPalette.noResults') }}
              </div>

              <template v-else>
                <div v-if="!selectedEntityKey && filteredPages.length > 0">
                  <div class="px-4 pt-3 pb-1">
                    <span class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      {{ t('common.commandPalette.pages') }}
                    </span>
                  </div>
                  <div class="py-1">
                    <button
                      v-for="(page, idx) in filteredPages"
                      :key="page.to"
                      :data-active="activeIndex === idx"
                      :class="[
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        activeIndex === idx
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-700 hover:bg-primary/5'
                      ]"
                      @click="selectResult(page)"
                      @mouseenter="activeIndex = idx"
                    >
                      <FileText
                        :class="[
                          'w-4 h-4 shrink-0',
                          activeIndex === idx ? 'text-primary-foreground/80' : 'text-gray-400'
                        ]"
                      />
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium truncate">
                          {{ t(page.labelKey) }}
                        </div>
                        <div
                          v-if="page.parentLabelKey"
                          :class="[
                            'text-xs truncate',
                            activeIndex === idx ? 'text-primary-foreground/70' : 'text-gray-500'
                          ]"
                        >
                          {{ t(page.parentLabelKey) }}
                          → {{ page.to }}
                        </div>
                      </div>
                      <ArrowRight
                        v-if="activeIndex === idx"
                        class="w-4 h-4 text-primary-foreground/70 shrink-0"
                      />
                    </button>
                  </div>
                </div>

                <div v-if="selectedEntityKey && entityResults.length > 0">
                  <div class="px-4 pt-3 pb-1">
                    <span class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      {{ t('common.commandPalette.results') }}
                    </span>
                  </div>
                  <div class="py-1">
                    <button
                      v-for="(result, idx) in entityResults"
                      :key="result.id"
                      :data-active="activeIndex === idx"
                      :class="[
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        activeIndex === idx
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-700 hover:bg-primary/5'
                      ]"
                      @click="selectResult(result)"
                      @mouseenter="activeIndex = idx"
                    >
                      <component
                        :is="entityIcon(result.entityKey)"
                        :class="[
                          'w-4 h-4 shrink-0',
                          activeIndex === idx ? 'text-primary-foreground/80' : 'text-gray-400'
                        ]"
                      />
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium truncate">{{ result.title }}</div>
                        <div
                          v-if="result.subtitle"
                          :class="[
                            'text-xs truncate',
                            activeIndex === idx ? 'text-primary-foreground/70' : 'text-gray-500'
                          ]"
                        >
                          {{ result.subtitle }}
                        </div>
                      </div>
                      <ArrowRight
                        v-if="activeIndex === idx"
                        class="w-4 h-4 text-primary-foreground/70 shrink-0"
                      />
                    </button>
                  </div>
                </div>

                <div
                  v-if="!selectedEntityKey && !query.trim() && filteredPages.length > 0"
                  class="px-4 py-2 border-t border-primary/5"
                >
                  <div class="flex items-center gap-4 text-[11px] text-gray-400">
                    <span class="inline-flex items-center gap-1">
                      <kbd
                        class="px-1 py-0.5 bg-gray-100 rounded border border-gray-200 text-[10px] font-mono"
                        >↑</kbd
                      >
                      <kbd
                        class="px-1 py-0.5 bg-gray-100 rounded border border-gray-200 text-[10px] font-mono"
                        >↓</kbd
                      >
                      {{ t('common.commandPalette.navigate') }}
                    </span>
                    <span class="inline-flex items-center gap-1">
                      <CornerDownLeft class="w-3 h-3" />
                      {{ t('common.commandPalette.select') }}
                    </span>
                    <span class="inline-flex items-center gap-1">
                      <kbd
                        class="px-1 py-0.5 bg-gray-100 rounded border border-gray-200 text-[10px] font-mono"
                        >ESC</kbd
                      >
                      {{ t('common.close') }}
                    </span>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Overlay */
.palette-overlay-enter-active {
  transition: opacity 0.2s ease;
}
.palette-overlay-leave-active {
  transition: opacity 0.15s ease;
}
.palette-overlay-enter-from,
.palette-overlay-leave-to {
  opacity: 0;
}

/* Modal */
.palette-modal-enter-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.palette-modal-leave-active {
  transition: all 0.15s ease;
}
.palette-modal-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
.palette-modal-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(-5px);
}
</style>
