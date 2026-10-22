<template>
  <div :class="L.pageWrap">
    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">{{ titre }}</div>
        <div :class="L.pageSub">{{ sousTitre }}</div>
      </div>
    </div>

    <div class="bg-card border border-border rounded-lg p-8 flex flex-col items-center text-center max-w-2xl mx-auto mt-8">
      <div class="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <component :is="icone" class="w-6 h-6 text-primary" />
      </div>
      <h2 class="text-[16px] font-semibold text-foreground mb-2">Fonctionnalité activée, données à construire</h2>
      <p class="text-[13px] text-muted-foreground leading-relaxed mb-4">{{ explication }}</p>
      <div class="bg-background border border-border rounded-lg px-4 py-3 text-[12px] text-muted-foreground text-left w-full">
        <strong class="text-foreground">Pourquoi cet écran n'est pas encore rempli :</strong> {{ raison }}
      </div>
      <RouterLink :to="{ name: 'admin-parametres' }" class="text-[12px] text-primary hover:underline mt-4">
        Gérer les modules activés dans Paramètres →
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import * as L from '../../lib/listClasses'
import type { Component } from 'vue'

defineProps<{ titre: string; sousTitre: string; explication: string; raison: string; icone: Component }>()
</script>
