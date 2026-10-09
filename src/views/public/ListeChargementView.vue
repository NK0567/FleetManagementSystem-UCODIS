<template>
  <div class="min-h-screen bg-white text-black p-8 print:p-0">
    <div class="max-w-2xl mx-auto">
      <template v-if="!voyage">
        <p class="text-sm">Ordre introuvable.</p>
      </template>
      <template v-else>
        <div class="flex items-center justify-between mb-6 print:hidden">
          <h1 class="text-lg font-bold">Liste de chargement</h1>
          <button class="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm" @click="imprimer">Imprimer</button>
        </div>

        <div class="border-b-2 border-black pb-3 mb-4">
          <p class="text-xl font-bold">Liste de chargement</p>
          <p class="text-sm">Ordre de transport {{ voyage.numeroOT || voyage.reference }}</p>
        </div>

        <div class="grid grid-cols-2 gap-2 text-sm mb-6">
          <div><span class="font-semibold">Véhicule :</span> {{ voyage.vehiculePlaque }}</div>
          <div><span class="font-semibold">Chauffeur :</span> {{ voyage.chauffeurNom }}</div>
          <div><span class="font-semibold">Date prévue :</span> {{ new Date(voyage.datePlanifiee).toLocaleDateString('fr-FR') }}</div>
          <div><span class="font-semibold">Marchandise :</span> {{ voyage.marchandise.typeProduit }}</div>
        </div>

        <p class="text-[11px] text-gray-600 mb-3 print:text-black">
          Ordre de chargement, inverse de l'ordre de livraison : le dernier point livré doit être le premier chargé,
          pour rester accessible en dernier dans le véhicule.
        </p>

        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b-2 border-black">
              <th class="text-left py-1.5 w-12">N°</th>
              <th class="text-left py-1.5">Destinataire</th>
              <th class="text-left py-1.5">Adresse</th>
              <th class="text-left py-1.5">Référence</th>
              <th class="text-left py-1.5 w-28">Livraison n°</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, i) in ordreChargement" :key="l.id" class="border-b border-gray-300">
              <td class="py-1.5">{{ i + 1 }}</td>
              <td class="py-1.5">{{ l.destinataire ?? l.siteNom }}</td>
              <td class="py-1.5">{{ l.adresseLivraison ?? l.siteNom }}</td>
              <td class="py-1.5 font-mono">{{ l.referenceExterne ?? '' }}</td>
              <td class="py-1.5">{{ l.ordre }}</td>
            </tr>
          </tbody>
        </table>

        <p class="text-[10px] text-gray-500 mt-8 print:text-black">
          Document généré depuis la maquette FMS Trucks - aucune valeur juridique.
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Liste de chargement imprimable : donne l'ordre dans lequel charger le
 * véhicule, qui est l'inverse de l'ordre de livraison, pour que le
 * premier arrêt soit le plus accessible dans le camion. Page autonome,
 * pensée pour être imprimée (Ctrl+P) plutôt que consultée à l'écran.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { horsTournee } from '../../utils/voyageUtils'
import { useVoyagesStore } from '../../stores/voyages'

const route = useRoute()
const store = useVoyagesStore()
const voyage = computed(() => store.getById(String(route.params.voyageId)) ?? null)
const ordreChargement = computed(() => voyage.value ? [...voyage.value.etapes].filter(e => !horsTournee(e)).sort((a, b) => b.ordre - a.ordre) : [])
function imprimer() { window.print() }
</script>

<style>
@media print {
  @page { margin: 1.5cm; }
}
</style>
