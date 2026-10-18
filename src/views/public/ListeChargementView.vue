<template>
  <div class="min-h-screen bg-white text-black p-8 print:p-0">
    <div class="max-w-2xl mx-auto">
      <template v-if="!voyage">
        <p class="text-sm">Ordre introuvable.</p>
      </template>
      <!-- Bon d'enlèvement : ce que le dépôt doit charger, compartiment par compartiment -->
      <template v-else-if="typeDocument === 'enlevement' && t?.bonEnlevement">
        <div class="flex items-center justify-between mb-6 print:hidden">
          <h1 class="text-lg font-bold">Bon d'enlèvement</h1>
          <button class="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm" @click="imprimer">Imprimer</button>
        </div>
        <div class="border-b-2 border-black pb-3 mb-4">
          <p class="text-xl font-bold">Bon d'enlèvement {{ t.bonEnlevement.numero }}</p>
          <p class="text-sm">Ordre de transport {{ voyage.numeroOT || voyage.reference }} · tournée {{ t.reference }}</p>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm mb-6">
          <div><span class="font-semibold">Dépôt de chargement :</span> {{ t.depotNom }}<template v-if="depot?.proprietaireTiers"> ({{ depot.proprietaireTiers }})</template></div>
          <div><span class="font-semibold">Date :</span> {{ new Date(voyage.datePlanifiee).toLocaleDateString('fr-FR') }}</div>
          <div><span class="font-semibold">Camion :</span> {{ voyage.vehiculePlaque }}</div>
          <div><span class="font-semibold">Citerne :</span> {{ voyage.semiRemorquePlaque }}</div>
          <div><span class="font-semibold">Conducteur :</span> {{ voyage.chauffeurNom }}</div>
          <div><span class="font-semibold">Statut :</span> {{ statutBon ? LIB_STATUT_BON[statutBon] : '' }}</div>
        </div>
        <table class="w-full text-sm border-collapse mb-6">
          <thead><tr class="border-b-2 border-black"><th class="text-left py-1.5 w-28">Compartiment</th><th class="text-left py-1.5">Produit</th><th class="text-left py-1.5">Volume attendu</th><th class="text-left py-1.5">Client</th></tr></thead>
          <tbody>
            <tr v-for="x in planCharge" :key="x.numero" class="border-b border-gray-300">
              <td class="py-1.5">{{ x.numero }}</td><td class="py-1.5">{{ x.produit }}</td><td class="py-1.5">{{ x.nonCharge ? 'Non chargé' : fmtL(x.volumeL) }}</td><td class="py-1.5">{{ x.client }}</td>
            </tr>
          </tbody>
        </table>
        <template v-if="t.bonEnlevement.bsl">
          <p class="text-sm font-semibold mb-2">BSL {{ t.bonEnlevement.bsl.numero }}</p>
          <p v-if="!t.bonEnlevement.bsl.mesures.length" class="text-sm">Aucune mesure saisie.</p>
          <table v-else class="w-full text-sm border-collapse">
            <thead><tr class="border-b-2 border-black"><th class="text-left py-1.5">Compartiment</th><th class="text-left py-1.5">Volume chargé</th><th class="text-left py-1.5">Température</th><th class="text-left py-1.5">Densité</th><th class="text-left py-1.5">Volume à 15 °C</th></tr></thead>
            <tbody>
              <tr v-for="m in t.bonEnlevement.bsl.mesures" :key="m.numero" class="border-b border-gray-300">
                <td class="py-1.5">{{ m.numero }}</td><td class="py-1.5">{{ fmtL(m.volumeL) }}</td><td class="py-1.5">{{ fmtNombre(m.temperature, ' °C') }}</td><td class="py-1.5">{{ fmtNombre(m.densite) }}</td><td class="py-1.5">{{ fmtL(m.volume15) }}<template v-if="m.volume15 != null"> ({{ origineVolume15(m) }})</template></td>
              </tr>
            </tbody>
          </table>
        </template>
      </template>

      <!-- Bon de livraison d'un client -->
      <template v-else-if="typeDocument === 'livraison' && ligne?.bonLivraison">
        <div class="flex items-center justify-between mb-6 print:hidden">
          <h1 class="text-lg font-bold">Bon de livraison</h1>
          <button class="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm" @click="imprimer">Imprimer</button>
        </div>
        <div class="border-b-2 border-black pb-3 mb-4">
          <p class="text-xl font-bold">Bon de livraison {{ ligne.bonLivraison.numero }}</p>
          <p class="text-sm">Ordre de transport {{ voyage.numeroOT || voyage.reference }}<template v-if="ligne.bonLivraison.statut !== 'emis'"> · {{ etatBonLivraison(ligne).libelle }}</template></p>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm mb-6">
          <div><span class="font-semibold">Client :</span> {{ ligne.destinataire }}</div>
          <div><span class="font-semibold">Adresse :</span> {{ ligne.adresseLivraison }}</div>
          <div><span class="font-semibold">Produit :</span> {{ ligne.produit }}</div>
          <div><span class="font-semibold">Date prévue :</span> {{ new Date(voyage.datePlanifiee).toLocaleDateString('fr-FR') }}</div>
          <div><span class="font-semibold">Camion :</span> {{ voyage.vehiculePlaque }} · {{ voyage.semiRemorquePlaque }}</div>
          <div><span class="font-semibold">Conducteur :</span> {{ voyage.chauffeurNom }}</div>
          <div v-if="ligne.devieeDe" class="col-span-2"><span class="font-semibold">Origine :</span> livraison déviée</div>
          <div v-if="rangPart" class="col-span-2"><span class="font-semibold">Commande{{ ligne.referenceExterne ? ` ${ligne.referenceExterne}` : '' }} :</span> livraison {{ rangPart.rang }} sur {{ rangPart.total }}, {{ fmtL(planLigne.reduce((t2, x) => t2 + (x.volumeL ?? 0), 0)) }} pour ce camion</div>
        </div>
        <table class="w-full text-sm border-collapse mb-6">
          <thead><tr class="border-b-2 border-black"><th class="text-left py-1.5">Compartiment</th><th class="text-left py-1.5">Volume prévu</th><th class="text-left py-1.5">Volume chargé à 15 °C</th><th class="text-left py-1.5">Volume dépoté</th><th class="text-left py-1.5">Volume livré à 15 °C</th></tr></thead>
          <tbody>
            <tr v-for="x in planLigne" :key="x.numero" class="border-b border-gray-300">
              <td class="py-1.5">{{ x.numero }}</td><td class="py-1.5">{{ fmtL(x.volumeL) }}</td>
              <td class="py-1.5">{{ fmtL(bsl(x.numero)?.volume15) }}<template v-if="bsl(x.numero)?.volume15 != null"> ({{ origineVolume15(bsl(x.numero)) }})</template></td>
              <td v-if="depote(x.numero)?.volumeL === 0" class="py-1.5" colspan="2">Non livré, {{ depote(x.numero)?.motifNonDepote }}</td>
              <template v-else><td class="py-1.5">{{ fmtL(depote(x.numero)?.volumeL) }}</td><td class="py-1.5">{{ fmtL(depote(x.numero)?.volume15) }}<template v-if="depote(x.numero)?.volume15 != null"> ({{ origineVolume15(depote(x.numero)) }})</template></td></template>
            </tr>
          </tbody>
        </table>
        <p v-if="ligne.ecartNonControle" class="text-sm mb-2">{{ ligne.ecartNonControle }}</p>
        <p class="text-sm">Réception : {{ ligne.receptionConfirmeeClientLe ? `confirmée par ${ligne.eBL?.signePar}` : 'en attente de la confirmation du client' }}</p>
      </template>

      <!-- Dossier documentaire complet de l'expédition -->
      <template v-else-if="typeDocument === 'dossier'">
        <div class="flex items-center justify-between mb-6 print:hidden">
          <h1 class="text-lg font-bold">Dossier documentaire</h1>
          <button class="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm" @click="imprimer">Imprimer</button>
        </div>
        <div class="border-b-2 border-black pb-3 mb-4">
          <p class="text-xl font-bold">Dossier documentaire</p>
          <p class="text-sm">Ordre de transport {{ voyage.numeroOT || voyage.reference }}</p>
        </div>
        <DossierDocumentaire :voyage="voyage" impression />
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
          <div><span class="font-semibold">Véhicule :</span> {{ moyens.vehicule }}</div>
          <div><span class="font-semibold">Conducteur :</span> {{ moyens.conducteur }}</div>
          <div><span class="font-semibold">Date prévue :</span> {{ new Date(voyage.datePlanifiee).toLocaleDateString('fr-FR') }}</div>
          <div><span class="font-semibold">Marchandise :</span> {{ voyage.marchandise.typeProduit }}</div>
        </div>

        <!-- Citerne : chargement compartiment par compartiment, selon le plan validé -->
        <table v-if="t" class="w-full text-sm border-collapse">
          <thead><tr class="border-b-2 border-black"><th class="text-left py-1.5 w-28">Compartiment</th><th class="text-left py-1.5">Produit</th><th class="text-left py-1.5">Volume</th><th class="text-left py-1.5">Client</th><th class="text-left py-1.5 w-28">Livraison n°</th></tr></thead>
          <tbody>
            <tr v-for="x in planCharge.filter(k => !k.nonCharge && rangLivraison(k.commandeId))" :key="x.numero" class="border-b border-gray-300">
              <td class="py-1.5">{{ x.numero }}</td><td class="py-1.5">{{ x.produit }}</td><td class="py-1.5">{{ fmtL(x.volumeL) }}</td><td class="py-1.5">{{ x.client }}</td><td class="py-1.5">{{ rangLivraison(x.commandeId) }}</td>
            </tr>
          </tbody>
        </table>
        <table v-else class="w-full text-sm border-collapse">
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
              <td class="py-1.5">{{ ordreChargement.length - i }}</td>
            </tr>
          </tbody>
        </table>
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
import { useSitesStore } from '../../stores/sites'
import { useCommandesStore } from '../../stores/commandes'
import { useLivraisonCarburantStore, LIB_STATUT_BON, etatBonLivraison } from '../../stores/livraisonCarburant'
import { fmtL, fmtNombre, origineVolume15 } from '../../lib/volume15'
import DossierDocumentaire from '../../components/planification/DossierDocumentaire.vue'

const route = useRoute()
const store = useVoyagesStore()
const voyage = computed(() => store.getById(String(route.params.voyageId)) ?? null)
/* Ni les lignes sorties de la tournée, ni celles annulées par le client avant
 * le départ : elles ne sont pas chargées. Le rang de livraison se compte sur
 * les seules lignes chargées, comme dans la simulation de la fiche. */
const ordreChargement = computed(() => voyage.value ? [...voyage.value.etapes].filter(e => !horsTournee(e) && !e.annuleeAvantDepart).sort((a, b) => b.ordre - a.ordre) : [])
/* Véhicule et conducteur annoncés, y compris pour un transporteur externe. */
const moyens = computed(() => voyage.value ? store.moyensDe(voyage.value) : { vehicule: '', conducteur: '' })
function imprimer() { window.print() }

/* ── Carburant : bon d'enlèvement, bon de livraison et chargement par compartiment ── */
const typeDocument = computed(() => String(route.query.document ?? ''))
const t = computed(() => voyage.value?.carburant ?? null)
const depot = computed(() => t.value ? useSitesStore().getById(t.value.depotId) : undefined)
const statutBon = computed(() => voyage.value ? useLivraisonCarburantStore().statutBon(voyage.value) : null)
const planCharge = computed(() => (t.value?.plan ?? []).filter(x => (x.volumeL ?? 0) > 0).sort((a, b) => a.numero - b.numero))
const ligne = computed(() => voyage.value?.etapes.find(e => e.id === String(route.query.ligne ?? '')) ?? null)
/* Un bon dévié reste lisible : ses compartiments gardent la commande d'origine. */
const planLigne = computed(() => planCharge.value.filter(x => x.commandeId === ligne.value?.commandeId || (ligne.value?.bonLivraison?.statut === 'devie' && x.commandeOrigineId === ligne.value?.commandeId)))
const bsl = (n: number) => t.value?.bonEnlevement?.bsl?.mesures.find(m => m.numero === n)
/** Commande répartie sur plusieurs camions : rang de cette livraison. */
const rangPart = computed(() => ligne.value?.commandeId ? useCommandesStore().rangPart(ligne.value.commandeId) : null)
const depote = (n: number) => ligne.value?.mesuresDepotees?.find(m => m.numero === n)
/** Rang de livraison d'une commande parmi les livraisons chargées. */
function rangLivraison(commandeId?: string) {
  const livrees = [...ordreChargement.value].reverse()
  const i = livrees.findIndex(e => e.commandeId === commandeId)
  return i >= 0 ? i + 1 : 0
}
</script>

<style>
@media print {
  @page { margin: 1.5cm; }
}
</style>
