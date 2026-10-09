<template>
  <div class="fixed inset-0 z-[1000] flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto" @click.self="emit('close')">
    <div class="bg-card rounded-lg shadow-xl w-full max-w-3xl">
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h2 class="text-base font-semibold text-foreground">Commandes à planifier</h2>
        <button class="bg-transparent border-0 cursor-pointer text-muted-foreground hover:text-foreground" @click="emit('close')"><X class="w-5 h-5" /></button>
      </div>

      <div class="px-5 py-4">
        <p class="text-[12px] text-muted-foreground mb-4 leading-relaxed">
          Ce sont les commandes de transport qui attendent un véhicule. Dans l'application réelle, elles arrivent
          automatiquement du système de gestion des commandes (ventes, achats, transferts entre sites). Dans cette
          maquette, on les saisit ici pour simuler cette arrivée. Le planificateur les regroupe ensuite dans un ordre
          de transport, en cochant celles qui partent ensemble, sous contrôle du poids et du volume du véhicule.
        </p>

        <!-- Formulaire d'ajout -->
        <div class="rounded-lg border border-border px-4 py-3.5 mb-4">
          <div class="flex items-center gap-2 mb-3">
            <button :class="type === 'client' ? cls.btnPrimary : cls.btnOutline" class="!py-1.5 !text-[12px]" @click="type = 'client'"><Package class="w-3.5 h-3.5" /> Livraison client</button>
            <button :class="type === 'transfert' ? cls.btnPrimary : cls.btnOutline" class="!py-1.5 !text-[12px]" @click="type = 'transfert'"><Truck class="w-3.5 h-3.5" /> Transfert interne</button>
          </div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <input v-if="type === 'client'" v-model="form.destinataire" :class="cls.fieldInput" placeholder="Nom du client…" />
            <SearchableDropdown v-else v-model="form.siteId" :items="optSites" placeholder="Site interne…" />
            <input v-model="form.adresse" :class="cls.fieldInput" placeholder="Adresse de livraison…" />
            <input v-model="form.contenu" :class="cls.fieldInput" placeholder="Contenu (ex. produits alimentaires secs)…" />
            <input v-model.number="form.poidsKg" type="number" min="0" :class="cls.fieldInput" placeholder="Poids (kg)" />
            <input v-model.number="form.volumeM3" type="number" min="0" :class="cls.fieldInput" placeholder="Volume (m³, facultatif)" />
            <input v-model="form.dateSouhaitee" type="date" :class="cls.fieldInput" />
            <div v-if="type === 'client'" class="flex flex-col gap-1 col-span-2">
              <label class="text-[11px] text-muted-foreground">Notifications de livraison (par défaut celles de la fiche client, précisables pour cette commande)</label>
              <select v-model="form.canal" :class="cls.fieldInput"><option v-for="(lib, k) in LIB_CANAL" :key="k" :value="k">{{ lib }}</option></select>
            </div>
          </div>
          <div class="flex justify-end">
            <button :class="cls.btnPrimary" :disabled="!peutCreer" @click="ajouter"><Plus class="w-4 h-4" /> Enregistrer la commande</button>
          </div>
        </div>

        <!-- Liste des commandes en attente -->
        <div class="flex flex-col gap-2 max-h-[340px] overflow-y-auto">
          <div v-for="c in store.enAttente" :key="c.id" class="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
            <Package class="w-4 h-4 text-muted-foreground shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-[13px] text-foreground font-medium truncate">{{ c.destinataire }}</p>
              <p class="text-[11px] text-muted-foreground truncate">{{ c.adresseLivraison }} · {{ c.contenu }} · {{ c.poidsKg }} kg{{ c.volumeM3 ? ` · ${c.volumeM3} m³` : '' }} · souhaitée le {{ fmtJour(c.dateSouhaitee) }}<template v-if="c.canalNotification"> · {{ LIB_CANAL[c.canalNotification] }}</template></p>
            </div>
            <button class="text-danger bg-transparent border-0 cursor-pointer p-1 shrink-0" title="Retirer" @click="retirer(c.id)"><Trash2 class="w-4 h-4" /></button>
          </div>
          <p v-if="!store.enAttente.length" class="text-[12px] text-muted-foreground italic text-center py-4">Aucune commande en attente.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Les commandes s'enregistrent ici au fur et à mesure qu'elles arrivent,
 * indépendamment de tout véhicule : le planificateur les regroupe ensuite
 * en chargement à la création d'un ordre de transport (voir le formulaire
 * de création, section Regroupement des commandes).
 */
import { ref, computed, watch } from 'vue'
import { X, Plus, Package, Truck, Trash2 } from '@lucide/vue'
import { useCommandesStore } from '../../stores/commandes'
import { useSitesStore } from '../../stores/sites'
import { useClientsStore, LIB_CANAL, type CanalNotification } from '../../stores/clients'
import * as cls from '../../lib/formClasses'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'

const emit = defineEmits<{ close: [] }>()
const store = useCommandesStore()
const sitesStore = useSitesStore()
const clientsStore = useClientsStore()
const optSites = computed<DropdownItem[]>(() => sitesStore.sites.map(s => ({ id: s.id, label: s.nom })))
function fmtJour(iso: string) { return iso ? new Date(iso).toLocaleDateString('fr-FR') : '' }

const type = ref<'client' | 'transfert'>('client')
const form = ref({ destinataire: '', siteId: '', adresse: '', contenu: '', poidsKg: 0, volumeM3: undefined as number | undefined, dateSouhaitee: '', canal: 'sms' as CanalNotification })
/* Le canal se pré-remplit avec celui de la fiche client dès que le nom est reconnu. */
watch(() => form.value.destinataire, nom => { form.value.canal = clientsStore.canalPour(nom.trim()) })
const peutCreer = computed(() => (type.value === 'client' ? !!form.value.destinataire.trim() : !!form.value.siteId) && !!form.value.adresse.trim() && !!form.value.contenu.trim() && form.value.poidsKg > 0 && !!form.value.dateSouhaitee)

function positionSimulee() {
  const base = sitesStore.sites.find(s => s.code === 'DEP-TNJ')
  const lat = (base?.lat ?? -18.8792) + (Math.random() - 0.5) * 0.6
  const lng = (base?.lng ?? 47.5079) + (Math.random() - 0.5) * 0.6
  return { lat, lng }
}

function ajouter() {
  if (!peutCreer.value) return
  let destinataire: string, lat: number, lng: number, siteId: string | undefined
  if (type.value === 'client') {
    destinataire = form.value.destinataire.trim()
    ;({ lat, lng } = positionSimulee())
  } else {
    const site = sitesStore.getById(form.value.siteId)
    if (!site) return
    destinataire = site.nom; lat = site.lat; lng = site.lng; siteId = site.id
  }
  store.creer({
    destinataire, adresseLivraison: form.value.adresse.trim(), lat, lng, siteId,
    contenu: form.value.contenu.trim(), poidsKg: form.value.poidsKg, volumeM3: form.value.volumeM3,
    dateSouhaitee: form.value.dateSouhaitee,
    canalNotification: type.value === 'client' ? form.value.canal : undefined,
  })
  form.value = { destinataire: '', siteId: '', adresse: '', contenu: '', poidsKg: 0, volumeM3: undefined, dateSouhaitee: '', canal: 'sms' }
}
function retirer(id: string) {
  const res = store.supprimer(id)
  if (!res.ok) alert(res.motif)
}
</script>
