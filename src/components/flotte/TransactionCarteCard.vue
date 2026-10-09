<script setup lang="ts">
/** Fiche d'une transaction de carte : contrôle des limites et rapprochement avec un plein (FMS-CA-02). */
import { ref, computed, watch } from 'vue'
import { CircleCheck, TriangleAlert, XCircle } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import ChampLecture from '../maintenance/ChampLecture.vue'
import { useCartesCarburantStore, type TransactionCarte } from '../../stores/cartesCarburant'
import { useCarburantStore } from '../../stores/carburant'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as F from '../../lib/formClasses'

const props = defineProps<{ transactions: TransactionCarte[]; transactionId: string }>()
const emit = defineEmits<{ close: []; ouvrirPlein: [id: string]; creerPlein: [transactionId: string]; ouvrirCarte: [id: string] }>()
const store = useCartesCarburantStore()
const carburant = useCarburantStore()

const idCourant = ref(props.transactionId)
const item = computed(() => store.transactionParId(idCourant.value) ?? null)
const carte = computed(() => item.value ? store.getById(item.value.carteId) : undefined)
const index = computed(() => props.transactions.findIndex(t => t.id === idCourant.value))
const sidebarItems = computed(() => props.transactions.map(t => ({ no: t.id, label: `${t.station} · ${t.litres} L` })))
function naviguer(d: number) { const t = props.transactions[index.value + d]; if (t) idCourant.value = t.id }

const erreur = ref(''); const succes = ref('')
watch(idCourant, () => { erreur.value = ''; succes.value = ''; choix.value = '' })
const depassements = computed(() => item.value ? store.depassements(item.value) : [])
const plein = computed(() => item.value?.rechargeId ? carburant.getById(item.value.rechargeId) : undefined)

/** Pleins du même titulaire à deux jours près, non rapprochés d'une autre transaction. */
const choix = ref('')
const optPleins = computed<DropdownItem[]>(() => {
  const t = item.value; const c = carte.value
  if (!t || !c) return []
  const lies = new Set(store.transactions.filter(x => x.rechargeId && x.id !== t.id).map(x => x.rechargeId))
  return carburant.recharges
    .filter(r => !lies.has(r.id) && (c.rattachement === 'vehicule' ? r.vehiculeId === c.vehiculeId : r.chauffeurId === c.chauffeurId)
      && Math.abs(new Date(r.date).getTime() - new Date(t.date).getTime()) <= 2 * 86_400_000)
    .map(r => ({ id: r.id, label: `${fmtDateHeure(r.date)} · ${r.litres} L`, sublabel: `${r.vehiculePlaque} · ${r.lieu}` }))
})
function rapprocher() {
  if (!item.value || !choix.value) { erreur.value = 'Choisissez le plein à rapprocher.'; succes.value = ''; return }
  const r = store.rapprocher(item.value.id, choix.value)
  erreur.value = r.ok ? '' : r.motif ?? ''; succes.value = r.ok ? 'Transaction rapprochée du plein.' : ''
}
function annuler() { if (item.value) { store.annulerRapprochement(item.value.id); succes.value = 'Rapprochement annulé.'; erreur.value = '' } }
const ecartLitres = computed(() => plein.value && item.value ? Math.round((plein.value.litres - item.value.litres) * 10) / 10 : 0)
const fmtAr = (n: number) => `${n.toLocaleString('fr-FR')} Ar`
</script>

<template>
  <CardModalShell
    v-if="item"
    :page-title="`Transaction ${item.id}`"
    :page-number="item.id"
    banner-label="Flotte · Cartes carburant"
    :is-edit-mode="false"
    :sidebar-items="sidebarItems"
    :current-no="item.id"
    :has-prev="index > 0"
    :has-next="index >= 0 && index < transactions.length - 1"
    hide-action-bar
    @close="emit('close')"
    @go-prev="naviguer(-1)"
    @go-next="naviguer(1)"
    @select-sidebar="no => idCourant = no"
  >
    <template #title-badges>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" :class="item.rechargeId ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'">{{ item.rechargeId ? 'Rapprochée' : 'Non rapprochée' }}</span>
      <span v-if="depassements.length" class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-bg text-danger">{{ depassements.length }} dépassement(s)</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>

        <FormSection title="Transaction" :recaps="[`${item.litres} L`, fmtAr(item.montantAr)]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Carte"><button v-if="carte" class="text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer font-mono" @click="emit('ouvrirCarte', carte.id)">{{ carte.numero }}</button></ChampLecture>
            <ChampLecture libelle="Titulaire">{{ carte ? store.titulaire(carte) : '-' }}</ChampLecture>
            <ChampLecture libelle="Date et heure">{{ fmtDateHeure(item.date) }}</ChampLecture>
            <ChampLecture libelle="Station">{{ item.station }}, {{ item.ville }}</ChampLecture>
            <ChampLecture libelle="Volume">{{ item.litres }} L</ChampLecture>
            <ChampLecture libelle="Montant">{{ fmtAr(item.montantAr) }}</ChampLecture>
            <ChampLecture libelle="Importée le">{{ fmtDateHeure(item.importeLe) }}</ChampLecture>
          </div>
        </FormSection>

        <FormSection title="Contrôle des limites de la carte" :recaps="[depassements.length ? `${depassements.length} dépassement(s)` : 'dans les limites']">
          <p v-if="!depassements.length" class="text-xs text-success flex items-center gap-1.5"><CircleCheck class="w-4 h-4" /> Transaction dans les limites de la carte.</p>
          <ul v-else class="flex flex-col gap-1.5">
            <li v-for="d in depassements" :key="d" class="flex items-center gap-2 bg-danger-bg text-danger rounded-md px-3 py-2 text-xs"><XCircle class="w-4 h-4 shrink-0" /> {{ d }}</li>
          </ul>
        </FormSection>

        <FormSection title="Rapprochement avec un plein" :recaps="[plein ? plein.id : 'aucun plein']" :default-open="true">
          <template v-if="plein">
            <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
              <ChampLecture libelle="Plein rapproché"><button class="text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click="emit('ouvrirPlein', plein.id)">{{ plein.id }} · {{ fmtDateHeure(plein.date) }}</button></ChampLecture>
              <ChampLecture libelle="Écart de volume"><span :class="ecartLitres ? 'text-warning font-medium' : ''">{{ ecartLitres ? `${ecartLitres > 0 ? '+' : ''}${ecartLitres} L` : 'aucun' }}</span></ChampLecture>
              <ChampLecture libelle="Mode">{{ item.rapprochementManuel ? 'Rapproché à la main' : 'Rapproché automatiquement' }}</ChampLecture>
            </div>
            <button :class="F.btnOutline" class="mt-3" @click="annuler">Annuler le rapprochement</button>
          </template>
          <template v-else>
            <p class="text-xs text-muted-foreground mb-3">Aucun plein enregistré ne correspond à cette transaction. Rapprochez-la d'un plein du même titulaire, ou créez le plein à partir de la transaction.</p>
            <div class="flex gap-2 items-end flex-wrap">
              <div :class="F.field" class="flex-1 min-w-[240px]"><label :class="F.fieldLabel">Plein du titulaire (deux jours autour)</label><SearchableDropdown v-model="choix" :items="optPleins" :placeholder="optPleins.length ? 'Choisir…' : 'Aucun plein proche'" /></div>
              <button :class="F.btnOutline" @click="rapprocher">Rapprocher</button>
              <button :class="F.btnPrimary" @click="emit('creerPlein', item.id)">Créer le plein</button>
            </div>
          </template>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
