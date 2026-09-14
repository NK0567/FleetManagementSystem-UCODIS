<template>
  <div :class="L.pageWrap" class="max-w-[820px]">

    <div class="bg-card border border-border rounded-lg p-8">
      <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        <component :is="infos.icone" class="w-6 h-6" />
      </div>

      <h1 class="text-xl font-bold text-foreground">{{ infos.titre }}</h1>
      <p class="text-[14px] text-muted-foreground mt-2 leading-relaxed">{{ infos.objectif }}</p>

      <div class="bg-background rounded-lg p-4 mt-5">
        <div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2.5">
          Ce que ce module contiendra
        </div>
        <ul class="grid grid-cols-2 gap-x-6 gap-y-1.5 max-sm:grid-cols-1">
          <li v-for="(e, i) in infos.ecrans" :key="i" class="flex gap-2 text-[13px] leading-snug">
            <span class="text-primary shrink-0">•</span><span>{{ e }}</span>
          </li>
        </ul>
      </div>

      <RouterLink :to="{ name: 'admin-tableau-bord' }" :class="L.btnPrimary" class="mt-5">
        <ArrowLeft class="w-4 h-4" /> Revenir à l'administration
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, FolderOpen, IdCard, Truck } from '@lucide/vue'
import * as L from '../lib/listClasses'

const route = useRoute()

interface Infos { titre: string; objectif: string; icone: Component; ecrans: string[] }

const CATALOGUE: Record<string, Infos> = {
  vehicules: {
    titre: 'Module 1 · Gestion des véhicules',
    icone: Truck,
    objectif:
      "Centraliser et structurer la gestion de tous les véhicules, depuis l'acquisition jusqu'à la mise hors service, pour en optimiser l'utilisation, la conformité et la performance opérationnelle.",
    ecrans: [
      'Fiche véhicule et identification',
      'Documents administratifs et conformité',
      'Acquisition, réception et tiers',
      'Affectation, attelage et disponibilité',
      'Contrôles avant et après utilisation',
      'Suivi en temps réel et carte',
      'Registre de suivi du camion',
      'Tableau de bord et indicateurs',
    ],
  },
  conducteurs: {
    titre: 'Module 2 · Gestion des conducteurs',
    icone: IdCard,
    objectif:
      "Centraliser les informations liées aux conducteurs, renforcer la conformité réglementaire, améliorer leurs performances et optimiser leur affectation aux véhicules.",
    ecrans: [
      'Planning et disponibilité',
      'Planning de voyage',
      'Fiche de voyage',
      'Carnet de bord',
      'Inspections avant et après départ',
      'Infractions et score conducteur',
      'Formation et coaching',
      'Tableau de bord et indicateurs',
    ],
  },
  documents: {
    titre: 'Module 9 · Administratifs et documents',
    icone: FolderOpen,
    objectif:
      "Centraliser et sécuriser tous les documents administratifs et automatiser les rappels d'échéance.",
    ecrans: [
      'Dépôt et indexation des pièces',
      'Rappels automatisés',
      'Workflow de validation',
      'Versionnement et archivage',
    ],
  },
}

const infos = computed<Infos>(() => {
  const cle = String(route.meta.module ?? 'vehicules')
  return CATALOGUE[cle] ?? CATALOGUE.vehicules!
})
</script>
