<script setup lang="ts">
import { RouterView } from 'vue-router'
import DashboardLayout from './layouts/DashboardLayout.vue'
import { useStatutsVehiculesStore } from './stores/statutsVehicules'
import { useNomenclatureStore } from './stores/nomenclature'

/* Le statut des véhicules suit les faits enregistrés dès l'ouverture de l'application. */
useStatutsVehiculesStore()
useNomenclatureStore()
</script>

<template>
  <DashboardLayout v-if="$route.meta.layout === 'dashboard'">
    <RouterView />
  </DashboardLayout>
  <RouterView v-else />
</template>
