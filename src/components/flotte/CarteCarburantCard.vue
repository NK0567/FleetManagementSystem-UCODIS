<script setup lang="ts">
/** Fiche d'une carte carburant : titulaire, limites, utilisation, transactions et blocage (FMS-CA-02). */
import { ref, computed, watch } from 'vue'
import { CircleCheck, TriangleAlert } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import ChampLecture from '../maintenance/ChampLecture.vue'
import { useCartesCarburantStore, LIB_RATTACHEMENT, type CarteCarburant } from '../../stores/cartesCarburant'
import { useAuthStore } from '../../stores/auth'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as F from '../../lib/formClasses'

const props = defineProps<{ cartes: CarteCarburant[]; carteId: string }>()
const emit = defineEmits<{ close: []; ouvrirTransaction: [id: string] }>()
const store = useCartesCarburantStore()
const auth = useAuthStore()
const moi = computed(() => auth.user?.nom ?? 'Responsable flotte')

const idCourant = ref(props.carteId)
const item = computed(() => store.getById(idCourant.value) ?? null)
const index = computed(() => props.cartes.findIndex(c => c.id === idCourant.value))
const sidebarItems = computed(() => props.cartes.map(c => ({ no: c.id, label: store.titulaire(c) })))
function naviguer(d: number) { const c = props.cartes[index.value + d]; if (c) idCourant.value = c.id }

const erreur = ref(''); const succes = ref('')
function resultat(r: { ok: boolean; motif?: string }, msg: string) { erreur.value = r.ok ? '' : r.motif ?? ''; succes.value = r.ok ? msg : ''; return r.ok }

const limites = ref({ montantMensuelAr: undefined as number | undefined, volumeMensuelL: undefined as number | undefined, transactionsParJour: undefined as number | undefined, heureDebut: undefined as number | undefined, heureFin: undefined as number | undefined, zones: '' })
watch(item, c => {
  erreur.value = ''; succes.value = ''
  if (c) limites.value = { montantMensuelAr: c.limites.montantMensuelAr, volumeMensuelL: c.limites.volumeMensuelL, transactionsParJour: c.limites.transactionsParJour, heureDebut: c.limites.heureDebut, heureFin: c.limites.heureFin, zones: c.limites.zones.join(', ') }
}, { immediate: true })
const vide = (n: unknown) => (n === '' || n == null ? undefined : Number(n))
function enregistrerLimites() {
  if (!item.value) return
  const l = limites.value
  resultat(store.modifierLimites(item.value.id, {
    montantMensuelAr: vide(l.montantMensuelAr), volumeMensuelL: vide(l.volumeMensuelL), transactionsParJour: vide(l.transactionsParJour),
    heureDebut: vide(l.heureDebut), heureFin: vide(l.heureFin), zones: l.zones.split(',').map(z => z.trim()).filter(Boolean),
  }, moi.value), 'Limites enregistrées.')
}
const motifBlocage = ref('')
function bloquer() { if (item.value && resultat(store.bloquer(item.value.id, motifBlocage.value, moi.value), 'Carte bloquée.')) motifBlocage.value = '' }
function debloquer() { if (item.value) resultat(store.debloquer(item.value.id, moi.value), 'Carte débloquée.') }

const util = computed(() => item.value ? store.utilisation(item.value) : null)
const transactions = computed(() => item.value ? store.transactionsDe(item.value.id) : [])
const expiree = computed(() => !!item.value && item.value.dateExpiration < new Date().toISOString().slice(0, 10))
const fmtAr = (n: number) => `${n.toLocaleString('fr-FR')} Ar`
const fmtMois = (m: string) => new Date(m + '-01T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
</script>

<template>
  <CardModalShell
    v-if="item"
    :page-title="`Carte ${item.numero}`"
    :page-number="item.id"
    banner-label="Flotte · Cartes carburant"
    :is-edit-mode="false"
    :sidebar-items="sidebarItems"
    :current-no="item.id"
    :has-prev="index > 0"
    :has-next="index >= 0 && index < cartes.length - 1"
    hide-action-bar
    @close="emit('close')"
    @go-prev="naviguer(-1)"
    @go-next="naviguer(1)"
    @select-sidebar="no => idCourant = no"
  >
    <template #title-badges>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" :class="item.statut === 'active' && !expiree ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ expiree ? 'Expirée' : item.statut === 'active' ? 'Active' : 'Bloquée' }}</span>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-bg text-neutral">{{ LIB_RATTACHEMENT[item.rattachement] }} · {{ store.titulaire(item) }}</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>

        <FormSection title="Carte" :recaps="[store.fournisseur(item), store.titulaire(item)]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Numéro" mono>{{ item.numero }}</ChampLecture>
            <ChampLecture libelle="Fournisseur">{{ store.fournisseur(item) }}</ChampLecture>
            <ChampLecture :libelle="`Rattachée au ${LIB_RATTACHEMENT[item.rattachement].toLowerCase()}`" :mono="item.rattachement === 'vehicule'">{{ store.titulaire(item) }}</ChampLecture>
            <ChampLecture libelle="Expiration">{{ new Date(item.dateExpiration).toLocaleDateString('fr-FR') }}<span v-if="expiree" class="text-danger"> · expirée</span></ChampLecture>
          </div>
        </FormSection>

        <FormSection title="Utilisation" :recaps="[util?.tauxPct != null ? `${util.tauxPct} % du plafond` : 'sans plafond']">
          <p v-if="!util?.mois" class="text-xs text-muted-foreground">Aucune transaction importée pour cette carte.</p>
          <template v-else>
            <p class="text-[11px] text-muted-foreground mb-2">Dernier mois d'activité : {{ fmtMois(util.mois) }}</p>
            <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
              <ChampLecture libelle="Montant">{{ fmtAr(util.montant) }}<template v-if="item.limites.montantMensuelAr"> sur {{ fmtAr(item.limites.montantMensuelAr) }}</template></ChampLecture>
              <ChampLecture libelle="Volume">{{ util.litres.toLocaleString('fr-FR') }} L<template v-if="item.limites.volumeMensuelL"> sur {{ item.limites.volumeMensuelL.toLocaleString('fr-FR') }} L</template></ChampLecture>
              <ChampLecture libelle="Taux d'utilisation"><span class="font-semibold" :class="(util.tauxPct ?? 0) > 100 ? 'text-danger' : (util.tauxPct ?? 0) > 80 ? 'text-warning' : ''">{{ util.tauxPct != null ? util.tauxPct + ' %' : '-' }}</span></ChampLecture>
            </div>
            <div v-if="util.tauxPct != null" class="h-2 bg-border rounded-full overflow-hidden mt-3"><div class="h-full rounded-full" :class="util.tauxPct > 100 ? 'bg-danger' : util.tauxPct > 80 ? 'bg-warning' : 'bg-primary'" :style="{ width: Math.min(100, util.tauxPct) + '%' }"></div></div>
          </template>
        </FormSection>

        <FormSection title="Limites" :recaps="[item.limites.zones.length ? item.limites.zones.join(', ') : 'toutes zones']">
          <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Montant par mois (Ar)</label><input v-model.number="limites.montantMensuelAr" type="number" min="0" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Volume par mois (L)</label><input v-model.number="limites.volumeMensuelL" type="number" min="0" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Transactions par jour</label><input v-model.number="limites.transactionsParJour" type="number" min="0" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Horaire : début (h)</label><input v-model.number="limites.heureDebut" type="number" min="0" max="23" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Horaire : fin (h)</label><input v-model.number="limites.heureFin" type="number" min="0" max="23" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Zone (villes)</label><input v-model="limites.zones" :class="F.fieldInput" placeholder="vide : partout" /></div>
          </div>
          <button :class="F.btnPrimary" class="mt-3" @click="enregistrerLimites">Enregistrer les limites</button>
        </FormSection>

        <FormSection title="Transactions" :recaps="[`${transactions.length} transaction(s)`]">
          <p v-if="!transactions.length" class="text-xs text-muted-foreground">Aucune transaction.</p>
          <table v-else class="w-full text-xs">
            <tbody>
              <tr v-for="t in transactions" :key="t.id" class="border-b border-border/60 last:border-0">
                <td class="py-1.5"><button class="text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click="emit('ouvrirTransaction', t.id)">{{ fmtDateHeure(t.date) }}</button></td>
                <td class="py-1.5">{{ t.station }}</td>
                <td class="py-1.5 text-right">{{ t.litres }} L</td>
                <td class="py-1.5 text-right">{{ fmtAr(t.montantAr) }}</td>
                <td class="py-1.5 text-right">
                  <span v-if="store.depassements(t).length" class="text-danger font-medium">{{ store.depassements(t).length }} dépassement(s)</span>
                  <span v-else-if="!t.rechargeId" class="text-warning font-medium">non rapprochée</span>
                  <span v-else class="text-success">rapprochée</span>
                </td>
              </tr>
            </tbody>
          </table>
        </FormSection>

        <FormSection title="Blocage" :recaps="[item.statut === 'bloquee' ? 'bloquée' : 'active']" :default-open="item.statut === 'bloquee'">
          <template v-if="item.statut === 'bloquee'">
            <p class="text-xs text-foreground mb-3">Motif : {{ item.motifBlocage }}</p>
            <button :class="F.btnPrimary" @click="debloquer">Débloquer la carte</button>
          </template>
          <div v-else class="flex gap-2 items-end">
            <div :class="F.field" class="flex-1"><label :class="F.fieldLabel">Motif du blocage *</label><input v-model="motifBlocage" :class="F.fieldInput" placeholder="ex. carte perdue, véhicule immobilisé…" /></div>
            <button :class="F.btnOutline" class="!text-danger" @click="bloquer">Bloquer la carte</button>
          </div>
        </FormSection>

        <FormSection title="Historique" :recaps="[`${item.historique.length} événement(s)`]" :default-open="false">
          <p v-if="!item.historique.length" class="text-xs text-muted-foreground">Aucun événement.</p>
          <div v-for="(h, i) in [...item.historique].reverse()" :key="i" class="text-xs border-b border-border/60 py-1.5 last:border-0">
            {{ h.action }}<div class="text-[11px] text-muted-foreground">{{ fmtDateHeure(h.le) }} · {{ h.par }}</div>
          </div>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
