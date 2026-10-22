<template>
  <div class="h-screen bg-white flex flex-col overflow-hidden">
    <TopBar />

    <div id="below-topbar" class="flex-1 flex flex-col min-h-0 relative">
      <NavBar />

      <main class="flex-1 overflow-y-auto px-0 sm:px-2 md:px-4 lg:px-14 xl:px-16">
        <slot />
      </main>
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
