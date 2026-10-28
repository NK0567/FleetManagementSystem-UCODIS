<script lang="ts" setup>
import { useNavLayout } from '@/composables/useNavLayout'

const { mode } = useNavLayout()
</script>

<template>
  <div class="h-screen bg-white flex flex-col overflow-hidden">
    <TopBar />

    <div id="below-topbar" class="flex-1 flex flex-col min-h-0 relative">
      <template v-if="mode === 'sidebar'">
        <ModuleBar class="hidden md:block" />
        <NavBar class="md:hidden" />
      </template>
      <NavBar v-else />

      <div class="flex-1 flex min-h-0">
        <SideBar v-if="mode === 'sidebar'" class="hidden md:block" />
        <main
          class="flex-1 min-w-0 overflow-y-auto"
          :class="
            mode === 'sidebar' ? 'px-0 sm:px-2 md:px-4' : 'px-0 sm:px-2 md:px-4 lg:px-14 xl:px-16'
          "
        >
          <slot />
        </main>
      </div>
    </div>

    <CommandPalette />
  </div>
</template>

<style scoped>
::-webkit-scrollbar {
  height: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--color-primary);
  border-radius: 2px;
}
</style>
