<template>
  <ListPageLayout
    title="Achats & stock de pièces"
    :subtitle="sousTitre"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="totalText"
    :search-placeholder="searchPlaceholder"
    scope-label="Vue :"
    :scope-options="scopeOptions"
    v-model:scope="vue"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
  >
    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-4.5 h-4.5" :class="k.iconColor" /></div>
          <div class="min-w-0">
            <p class="text-xl font-bold leading-none truncate">{{ k.value }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">{{ k.label }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- ══════════ PRODUITS ══════════ -->
    <template #cell-produit="{ item }">
      <span class="font-medium text-foreground">{{ item.designation }}</span>
      <div class="text-[11px] text-muted-foreground font-mono">{{ item.reference }}</div>
    </template>
    <template #cell-sousSysteme="{ item }">
      <span class="text-xs">{{ item.sousSysteme ? LIB_SOUS_SYSTEME[item.sousSysteme] : '-' }}</span>
    </template>
    <template #cell-fournisseur="{ item }">
      <span class="text-xs">{{ achatsStore.getFournisseur(item.fournisseurPrincipalId ?? '')?.nom ?? '-' }}</span>
    </template>
    <template #cell-stock="{ item }">
      <span class="text-xs font-semibold" :class="(item.stockActuel ?? 0) <= (item.seuilAlerte ?? 0) ? 'text-danger' : 'text-foreground'">
        {{ item.stockActuel }}
      </span>
      <span class="text-[11px] text-muted-foreground"> / seuil {{ item.seuilAlerte }}</span>
    </template>
    <template #cell-prix="{ item }">
      <span class="text-xs">{{ fmtAr(item.prixUnitaireAr) }}</span>
    </template>

    <!-- ══════════ FOURNISSEURS ══════════ -->
    <template #cell-nomFournisseur="{ item }">
      <span class="font-medium text-foreground">{{ item.nom }}</span>
      <span v-if="!item.actif" class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-bg text-neutral">Inactif</span>
    </template>
    <template #cell-contact="{ item }">
      <span class="text-xs">{{ item.contact ?? '-' }}</span>
      <div v-if="item.telephone" class="text-[11px] text-muted-foreground">{{ item.telephone }}</div>
    </template>
    <template #cell-delai="{ item }">
      <span class="text-xs">{{ item.delaiLivraisonJoursMoyen != null ? item.delaiLivraisonJoursMoyen + ' j' : '-' }}</span>
    </template>
    <template #cell-piecesFournies="{ item }">
      <span class="text-xs">{{ achatsStore.produits.filter(p => p.fournisseurPrincipalId === item.id).length }} référence(s)</span>
    </template>

    <!-- ══════════ MOUVEMENTS ══════════ -->
    <template #cell-dateMvt="{ item }">
      <span class="text-xs">{{ formatDate(item.date) }}</span>
    </template>
    <template #cell-produitMvt="{ item }">
      <span class="text-xs font-medium">{{ achatsStore.getProduit(item.produitId ?? '')?.designation ?? item.produitId }}</span>
    </template>
    <template #cell-typeMvt="{ item }">
      <span class="text-xs font-medium px-2 py-0.5 rounded-full"
        :class="item.type === 'entree' ? 'bg-success-bg text-success' : 'bg-info-bg text-info'">
        {{ item.type === 'entree' ? 'Entrée' : 'Sortie' }}
      </span>
    </template>
    <template #cell-quantiteMvt="{ item }">
      <span class="text-xs tabular-nums">{{ item.type === 'entree' ? '+' : '-' }}{{ item.quantite }}</span>
    </template>
    <template #cell-lien="{ item }">
      <span v-if="item.ordreTravailId" class="text-[11px] font-mono text-muted-foreground">
        {{ item.ordreTravailId }}<span v-if="item.vehiculePlaque"> · {{ item.vehiculePlaque }}</span>
      </span>
      <span v-else-if="item.numeroBonCommande" class="text-[11px] font-mono text-muted-foreground">{{ item.numeroBonCommande }}</span>
      <span v-else class="text-muted-foreground">-</span>
    </template>

    <template #details-panel="{ item }">
      <!-- Produit -->
      <div v-if="vue === 'produits'" class="flex flex-col gap-3">
        <div>
          <div class="font-medium text-foreground">{{ item.designation }}</div>
          <div class="text-xs text-muted-foreground font-mono">{{ item.reference }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Sous-système</div>{{ item.sousSysteme ? LIB_SOUS_SYSTEME[item.sousSysteme] : '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Prix unitaire</div>{{ fmtAr(item.prixUnitaireAr) }}</div>
          <div><div class="text-muted-foreground text-[11px]">Stock actuel</div>{{ item.stockActuel }}</div>
          <div><div class="text-muted-foreground text-[11px]">Seuil d'alerte</div>{{ item.seuilAlerte }}</div>
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Fournisseur principal</div>
            {{ achatsStore.getFournisseur(item.fournisseurPrincipalId ?? '')?.nom ?? '-' }}</div>
        </div>
        <div v-if="(item.stockActuel ?? 0) <= (item.seuilAlerte ?? 0)" class="bg-danger-bg text-danger rounded-md px-2.5 py-2 text-[11px]">
          Stock au ou sous le seuil - réapprovisionnement à prévoir.
        </div>
        <div class="text-[11px] font-semibold text-muted-foreground mt-1">Derniers mouvements</div>
        <ul class="flex flex-col gap-1.5">
          <li v-for="m in achatsStore.mouvementsDuProduit(item.id).slice(0, 5)" :key="m.id" class="text-[11px] flex justify-between">
            <span>{{ formatDate(m.date) }} · {{ m.motif }}</span>
            <span :class="m.type === 'entree' ? 'text-success' : 'text-info'">{{ m.type === 'entree' ? '+' : '-' }}{{ m.quantite }}</span>
          </li>
        </ul>
      </div>

      <!-- Fournisseur -->
      <div v-else-if="vue === 'fournisseurs'" class="flex flex-col gap-3">
        <div>
          <div class="font-medium text-foreground">{{ item.nom }}</div>
          <div class="text-xs text-muted-foreground">{{ item.contact }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Téléphone</div>{{ item.telephone ?? '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Délai moyen</div>{{ item.delaiLivraisonJoursMoyen ?? '-' }} j</div>
        </div>
        <div class="text-[11px] font-semibold text-muted-foreground mt-1">Références fournies</div>
        <ul class="flex flex-col gap-1">
          <li v-for="p in achatsStore.produits.filter(p => p.fournisseurPrincipalId === item.id)" :key="p.id" class="text-[11px]">
            {{ p.designation }} <span class="text-muted-foreground font-mono">{{ p.reference }}</span>
          </li>
        </ul>
      </div>

      <!-- Mouvement -->
      <div v-else class="flex flex-col gap-3">
        <div>
          <span class="text-xs font-medium px-2 py-0.5 rounded-full"
            :class="item.type === 'entree' ? 'bg-success-bg text-success' : 'bg-info-bg text-info'">
            {{ item.type === 'entree' ? 'Entrée' : 'Sortie' }}
          </span>
          <div class="font-medium text-foreground mt-1.5">{{ achatsStore.getProduit(item.produitId ?? '')?.designation }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Date</div>{{ formatDate(item.date) }}</div>
          <div><div class="text-muted-foreground text-[11px]">Quantité</div>{{ item.type === 'entree' ? '+' : '-' }}{{ item.quantite }}</div>
          <div><div class="text-muted-foreground text-[11px]">Stock après</div>{{ item.stockApres }}</div>
          <div v-if="item.ordreTravailId"><div class="text-muted-foreground text-[11px]">Ordre de travail</div>{{ item.ordreTravailId }}</div>
          <div v-if="item.vehiculePlaque"><div class="text-muted-foreground text-[11px]">Véhicule</div>{{ item.vehiculePlaque }}</div>
          <div v-if="item.kilometrage"><div class="text-muted-foreground text-[11px]">Kilométrage</div>{{ item.kilometrage.toLocaleString('fr-FR') }} km</div>
          <div v-if="item.numeroBonCommande"><div class="text-muted-foreground text-[11px]">Bon de commande</div>{{ item.numeroBonCommande }}</div>
        </div>
        <div class="text-xs">{{ item.motif }}</div>
      </div>
    </template>

    <template #empty><PackageSearch class="w-8 h-8" /><p class="text-sm">{{ messageVide }}</p></template>
  </ListPageLayout>
</template>

<script setup lang="ts">
/**
 * Achats & stock de pièces : Produits, Fournisseurs et Mouvements
 * réunis dans un même écran à trois vues, avec indicateurs au-dessus
 * et panneau d'aperçu à droite.
 */
import { ref, computed, watch } from 'vue'
import { PackageSearch, Package, Truck, TriangleAlert, Wallet } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import { useAchatsStore } from '../../stores/achats'
import { formatDate } from '../../utils/helpers'
import { LIB_SOUS_SYSTEME } from '../../types/maintenance'
import type { SousSysteme } from '../../types/maintenance'
import * as L from '../../lib/listClasses'

const achatsStore = useAchatsStore()
function fmtAr(n?: number) { return n != null ? n.toLocaleString('fr-FR') + ' Ar' : '-' }

type Vue = 'produits' | 'fournisseurs' | 'mouvements'

/** Ligne unifiée : chaque vue n'en renseigne que sa part. */
interface LigneAchats {
  id: string
  reference?: string
  designation?: string
  sousSysteme?: SousSysteme
  fournisseurPrincipalId?: string
  prixUnitaireAr?: number
  stockActuel?: number
  seuilAlerte?: number
  nom?: string
  contact?: string
  telephone?: string
  delaiLivraisonJoursMoyen?: number
  actif?: boolean
  produitId?: string
  type?: 'entree' | 'sortie'
  quantite?: number
  date?: string
  motif?: string
  ordreTravailId?: string
  vehiculePlaque?: string
  kilometrage?: number
  numeroBonCommande?: string
  stockApres?: number
}

const vue = ref<Vue>('produits')
const searchQuery = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = ref(15)

const scopeOptions = [
  { value: 'produits', label: 'Produits en stock' },
  { value: 'fournisseurs', label: 'Fournisseurs' },
  { value: 'mouvements', label: 'Mouvements' },
]

const sousTitre = computed(() =>
  vue.value === 'produits' ? `${achatsStore.produitsSousSeuil.length} référence(s) au ou sous le seuil d'alerte`
  : vue.value === 'fournisseurs' ? `${achatsStore.fournisseurs.filter(f => f.actif).length} fournisseur(s) actif(s)`
  : 'Entrées (réceptions) et sorties (bons de sortie magasin)')

const kpis = computed(() => [
  { label: 'Références catalogue', value: String(achatsStore.produits.length), icon: Package, bg: 'bg-info-bg', iconColor: 'text-info' },
  { label: 'Sous le seuil', value: String(achatsStore.produitsSousSeuil.length), icon: TriangleAlert, bg: 'bg-danger-bg', iconColor: 'text-danger' },
  { label: 'Fournisseurs actifs', value: String(achatsStore.fournisseurs.filter(f => f.actif).length), icon: Truck, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: 'Valeur du stock', value: fmtAr(achatsStore.valeurStock), icon: Wallet, bg: 'bg-warning-bg', iconColor: 'text-warning' },
])

const COLONNES: Record<Vue, ListColumn[]> = {
  produits: [
    { key: 'produit', label: 'Produit', sortable: true, width: 260 },
    { key: 'sousSysteme', label: 'Sous-système', width: 150 },
    { key: 'fournisseur', label: 'Fournisseur', width: 200 },
    { key: 'stock', label: 'Stock', width: 140 },
    { key: 'prix', label: 'Prix unitaire', width: 130 },
  ],
  fournisseurs: [
    { key: 'nomFournisseur', label: 'Fournisseur', sortable: true, width: 220 },
    { key: 'contact', label: 'Contact', width: 200 },
    { key: 'delai', label: 'Délai moyen', width: 110 },
    { key: 'piecesFournies', label: 'Références', width: 140 },
  ],
  mouvements: [
    { key: 'dateMvt', label: 'Date', sortable: true, width: 110 },
    { key: 'produitMvt', label: 'Produit', width: 240 },
    { key: 'typeMvt', label: 'Type', width: 100 },
    { key: 'quantiteMvt', label: 'Quantité', width: 90 },
    { key: 'lien', label: 'Lié à', width: 180 },
  ],
}
const columns = computed(() => COLONNES[vue.value])

const searchPlaceholder = computed(() =>
  vue.value === 'produits' ? 'Référence, désignation…'
  : vue.value === 'fournisseurs' ? 'Nom, contact…'
  : 'Produit, motif, OT…')

const messageVide = computed(() =>
  vue.value === 'produits' ? 'Aucun produit au catalogue'
  : vue.value === 'fournisseurs' ? 'Aucun fournisseur'
  : 'Aucun mouvement de stock')

const donnees = computed<LigneAchats[]>(() => {
  const q = searchQuery.value.toLowerCase()
  if (vue.value === 'produits') {
    return achatsStore.produits.filter(p => !q || `${p.reference} ${p.designation}`.toLowerCase().includes(q))
  }
  if (vue.value === 'fournisseurs') {
    return achatsStore.fournisseurs.filter(f => !q || `${f.nom} ${f.contact ?? ''}`.toLowerCase().includes(q))
  }
  return [...achatsStore.mouvements]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .filter(m => {
      if (!q) return true
      const produit = achatsStore.getProduit(m.produitId)
      return `${produit?.designation ?? ''} ${m.motif} ${m.ordreTravailId ?? ''}`.toLowerCase().includes(q)
    })
})

const totalCount = computed(() => donnees.value.length)
const totalText = computed(() =>
  vue.value === 'produits' ? `${totalCount.value} référence(s)`
  : vue.value === 'fournisseurs' ? `${totalCount.value} fournisseur(s)`
  : `${totalCount.value} mouvement(s)`)

const pageItems = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return donnees.value.slice(start, start + pageSize.value)
})

watch([vue, searchQuery, pageSize], () => { page.value = 1 })
watch(vue, () => { sortKey.value = '' })
</script>
