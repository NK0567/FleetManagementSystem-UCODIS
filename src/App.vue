<script setup lang="ts">
import { RouterView } from 'vue-router'
import DashboardLayout from './layouts/DashboardLayout.vue'
</script>

<template>
  <DashboardLayout v-if="$route.meta.layout === 'dashboard'">
    <RouterView />
  </DashboardLayout>
  <RouterView v-else />
</template>
