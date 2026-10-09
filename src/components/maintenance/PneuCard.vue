<script setup lang="ts">
/** Fiche d'un pneu : identité, coût, montage, relevés, rotation et sortie (FMS-MA-14 à MA-17). */
import { ref, computed, watch } from 'vue'
import { TriangleAlert, CircleCheck } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import ChampLecture from './ChampLecture.vue'
import { usePneusStore, LIB_STATUT_PNEU, type Pneu, type StatutPneu } from '../../stores/pneus'
import { useVehiculeStore } from '../../stores/vehicules'
import { useAuthStore } from '../../stores/auth'
import * as F from '../../lib/formClasses'

const props = defineProps<{ pneus: Pneu[]; pneuId: string }>()
const emit = defineEmits<{ close: []; creer: [] }>()

const store = usePneusStore()
const vehiculesStore = useVehiculeStore()
const auth = useAuthStore()

const idCourant = ref(props.pneuId)
const item = computed(() => store.getById(idCourant.value) ?? null)
const index = computed(() => props.pneus.findIndex(p => p.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.pneus.length - 1)
const sidebarItems = computed(() => props.pneus.map(p => ({ no: p.numeroSerie, label: p.vehiculePlaque ?? LIB_STATUT_PNEU[p.statut] })))
function naviguer(delta: number) { const p = props.pneus[index.value + delta]; if (p) idCourant.value = p.id }
function selectSidebar(no: string) { const p = props.pneus.find(x => x.numeroSerie === no); if (p) idCourant.value = p.id }

const CLS_STATUT: Record<StatutPneu, string> = { stock: 'bg-info-bg text-info', monte: 'bg-success-bg text-success', rechapage: 'bg-warning-bg text-warning', rebut: 'bg-neutral-bg text-neutral' }
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR')
const fmtAr = (n: number) => n.toLocaleString('fr-FR') + ' Ar'
const libellePosition = computed(() => item.value ? store.planDuVehicule(item.value.vehiculeId ?? '').find(x => x.code === item.value!.positionCode)?.libelle ?? `position ${item.value.positionCode}` : '')
const alertes = computed(() => item.value ? store.alertesDe(item.value) : [])

/* Opérations */
const erreur = ref('')
const succes = ref('')
watch(idCourant, () => { erreur.value = ''; succes.value = '' })
function resultat(res: { ok: boolean; motif?: string }, ok: string) { erreur.value = res.ok ? '' : (res.motif ?? ''); succes.value = res.ok ? ok : ''; return res.ok }

const montage = ref({ vehiculeId: '', position: '' })
const optVehicules = computed<DropdownItem[]>(() => vehiculesStore.liste.map(v => ({ id: v.id, label: v.immatriculation, sublabel: v.type === 'tracteur' ? 'Tracteur' : 'Semi-remorque' })))
const positionsLibres = computed<DropdownItem[]>(() => {
  if (!montage.value.vehiculeId) return []
  const occupees = new Set(store.pneusDuVehicule(montage.value.vehiculeId).map(p => p.positionCode))
  return store.planDuVehicule(montage.value.vehiculeId).filter(p => !occupees.has(p.code)).map(p => ({ id: p.code, label: `${p.code} · ${p.libelle}` }))
})
watch(() => montage.value.vehiculeId, () => { montage.value.position = '' })
function monter() {
  if (!item.value) return
  if (!montage.value.vehiculeId || !montage.value.position) { erreur.value = 'Choisissez le véhicule et une position libre.'; succes.value = ''; return }
  if (resultat(store.monter(item.value.id, montage.value.vehiculeId, montage.value.position), 'Pneu monté.')) montage.value = { vehiculeId: '', position: '' }
}

const releve = ref({ pression: undefined as number | undefined, sculpture: undefined as number | undefined })
function relever() {
  if (!item.value) return
  if (resultat(store.relever(item.value.id, releve.value.pression ?? NaN, releve.value.sculpture ?? NaN, auth.user?.nom ?? 'Technicien'), 'Relevé enregistré.'))
    releve.value = { pression: undefined, sculpture: undefined }
}

const rotation = ref({ position: '', technicien: '' })
const optRotation = computed<DropdownItem[]>(() => item.value?.vehiculeId
  ? store.planDuVehicule(item.value.vehiculeId).filter(x => x.code !== item.value!.positionCode).map(x => {
      const occupant = store.pneusDuVehicule(item.value!.vehiculeId!).find(p => p.positionCode === x.code)
      return { id: x.code, label: `${x.code} · ${x.libelle}`, sublabel: occupant ? `échange avec ${occupant.numeroSerie}` : 'position libre' }
    })
  : [])
function pivoter() {
  if (!item.value) return
  if (!rotation.value.position) { erreur.value = 'Choisissez la nouvelle position.'; succes.value = ''; return }
  if (resultat(store.pivoter(item.value.id, rotation.value.position, rotation.value.technicien), 'Rotation enregistrée.')) rotation.value = { position: '', technicien: '' }
}

const retrait = ref({ motif: '' })
function demonter() {
  if (!item.value) return
  store.demonter(item.value.id, retrait.value.motif.trim())
  erreur.value = ''; succes.value = 'Pneu démonté et remis en stock.'; retrait.value.motif = ''
}
function retirer(d: 'rechapage' | 'rebut') {
  if (!item.value) return
  if (d === 'rebut' && retrait.value.motif.trim() && !confirm('Mettre ce pneu au rebut ? Il ne pourra plus être monté.')) return
  if (resultat(store.retirer(item.value.id, d, retrait.value.motif), d === 'rebut' ? 'Pneu mis au rebut.' : 'Pneu envoyé au rechapage.')) retrait.value.motif = ''
}
const coutRechapage = ref<number | undefined>(undefined)
function retourRechapage() {
  if (!item.value) return
  if (coutRechapage.value != null && coutRechapage.value < 0) { erreur.value = 'Le coût ne peut pas être négatif.'; succes.value = ''; return }
  if (resultat(store.retourRechapage(item.value.id, coutRechapage.value ?? 0), 'Retour de rechapage enregistré, pneu en stock.')) coutRechapage.value = undefined
}
</script>

<template>
  <CardModalShell
    v-if="item"
    :page-title="item.numeroSerie"
    :page-number="item.numeroSerie"
    banner-label="Maintenance · Pneumatique"
    :is-edit-mode="false"
    :sidebar-items="sidebarItems"
    :current-no="item.numeroSerie"
    :has-prev="hasPrev"
    :has-next="hasNext"
    hide-action-bar
    @close="emit('close')"
    @create="emit('creer')"
    @go-prev="naviguer(-1)"
    @go-next="naviguer(1)"
    @select-sidebar="selectSidebar"
  >
    <template #title-badges>
      <span class="text-xs font-medium px-2.5 py-0.5 rounded-full" :class="CLS_STATUT[item.statut]">{{ LIB_STATUT_PNEU[item.statut] }}</span>
      <span v-for="a in alertes" :key="a" class="text-xs font-medium px-2.5 py-0.5 rounded-full" :class="a.startsWith('Rotation') ? 'bg-warning-bg text-warning' : 'bg-danger-bg text-danger'">{{ a }}</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>

        <!-- 1. IDENTIFICATION -->
        <FormSection title="Identification" :recaps="[item.marque, item.taille]">
          <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Numéro de série" mono>{{ item.numeroSerie }}</ChampLecture>
            <ChampLecture libelle="Marque">{{ item.marque }}</ChampLecture>
            <ChampLecture libelle="Taille">{{ item.taille }}</ChampLecture>
            <ChampLecture libelle="Profil">{{ item.profil ?? '-' }}</ChampLecture>
            <ChampLecture libelle="Charge et vitesse">{{ item.indiceChargeVitesse ?? '-' }}</ChampLecture>
            <ChampLecture libelle="Fabrication">{{ item.dateFabrication ?? '-' }}</ChampLecture>
            <ChampLecture libelle="État">{{ item.neuf ? 'Neuf' : `Rechapé ${item.nbRechapages} fois` }}</ChampLecture>
          </div>
        </FormSection>

        <!-- 2. ACHAT ET COÛT -->
        <FormSection title="Achat et coût" :recaps="[fmtAr(store.coutTotal(item)), store.coutParKm(item) != null ? store.coutParKm(item)!.toFixed(1) + ' Ar/km' : null]">
          <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Fournisseur">{{ item.fournisseur ?? '-' }}</ChampLecture>
            <ChampLecture libelle="Date d'achat">{{ fmtDate(item.dateAchat) }}</ChampLecture>
            <ChampLecture libelle="Prix d'achat">{{ fmtAr(item.prixAr) }}</ChampLecture>
            <ChampLecture libelle="Rechapages">{{ item.nbRechapages }} · {{ fmtAr(item.coutRechapagesAr) }}</ChampLecture>
            <ChampLecture libelle="Kilomètres parcourus">{{ store.kmParcourus(item).toLocaleString('fr-FR') }} km</ChampLecture>
            <ChampLecture libelle="Coût au kilomètre">{{ store.coutParKm(item) != null ? store.coutParKm(item)!.toFixed(1) + ' Ar/km' : '-' }}</ChampLecture>
          </div>
        </FormSection>

        <!-- 3. MONTAGE -->
        <FormSection title="Montage" :recaps="[item.statut === 'monte' ? `${item.vehiculePlaque}, ${libellePosition}` : LIB_STATUT_PNEU[item.statut]]" :default-open="true">
          <template v-if="item.statut === 'monte'">
            <div class="grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-1">
              <ChampLecture libelle="Véhicule" mono>{{ item.vehiculePlaque }}</ChampLecture>
              <ChampLecture libelle="Position">{{ item.positionCode }} · {{ libellePosition }}</ChampLecture>
              <ChampLecture libelle="Km au montage">{{ item.kmVehiculeAuMontage?.toLocaleString('fr-FR') ?? '-' }}</ChampLecture>
              <ChampLecture libelle="Dernière rotation">{{ item.derniereRotationLe ? fmtDate(item.derniereRotationLe) : '-' }}<template v-if="store.rotationDue(item)"> <span class="text-warning text-xs font-medium">· à prévoir</span></template></ChampLecture>
            </div>
            <div class="border-t border-border mt-4 pt-4">
              <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em] mb-2">Rotation</p>
              <div class="grid grid-cols-[1fr_1fr_auto] gap-3 items-end max-sm:grid-cols-1">
                <div :class="F.field"><label :class="F.fieldLabel">Nouvelle position *</label><SearchableDropdown v-model="rotation.position" :items="optRotation" placeholder="Choisir…" /></div>
                <div :class="F.field"><label :class="F.fieldLabel">Validée par *</label><input v-model="rotation.technicien" :class="F.fieldInput" placeholder="Technicien" /></div>
                <button :class="F.btnPrimary" @click="pivoter">Valider la rotation</button>
              </div>
            </div>
          </template>
          <template v-else-if="item.statut === 'stock'">
            <div class="grid grid-cols-[1fr_1fr_auto] gap-3 items-end max-sm:grid-cols-1">
              <div :class="F.field"><label :class="F.fieldLabel">Véhicule *</label><SearchableDropdown v-model="montage.vehiculeId" :items="optVehicules" placeholder="Choisir…" /></div>
              <div :class="F.field"><label :class="F.fieldLabel">Position libre *</label><SearchableDropdown v-model="montage.position" :items="positionsLibres" :placeholder="montage.vehiculeId ? (positionsLibres.length ? 'Choisir…' : 'Aucune position libre') : 'Choisir d\'abord le véhicule'" /></div>
              <button :class="F.btnPrimary" @click="monter">Monter le pneu</button>
            </div>
          </template>
          <template v-else-if="item.statut === 'rechapage'">
            <div class="grid grid-cols-[1fr_auto] gap-3 items-end max-sm:grid-cols-1">
              <div :class="F.field"><label :class="F.fieldLabel">Coût du rechapage (Ar)</label><input v-model.number="coutRechapage" type="number" min="0" :class="F.fieldInput" /></div>
              <button :class="F.btnPrimary" @click="retourRechapage">Retour de rechapage</button>
            </div>
          </template>
          <p v-else class="text-sm text-foreground">Au rebut<template v-if="item.motifRetrait"> : {{ item.motifRetrait }}</template></p>
        </FormSection>

        <!-- 4. RELEVÉS -->
        <FormSection title="Relevés de pression et d'usure" :recaps="[store.dernierReleve(item) ? `${store.dernierReleve(item)!.pressionBar} bar · ${store.dernierReleve(item)!.sculptureMm} mm` : 'aucun relevé']" :default-open="item.statut === 'monte'">
          <div v-if="item.statut === 'monte'" class="grid grid-cols-[1fr_1fr_auto] gap-3 items-end mb-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Pression (bar) *</label><input v-model.number="releve.pression" type="number" step="0.1" min="0" :class="F.fieldInput" :placeholder="`minimum ${store.seuils.pressionMinBar}`" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Sculpture (mm) *</label><input v-model.number="releve.sculpture" type="number" step="0.5" min="0" :class="F.fieldInput" :placeholder="`minimum ${store.seuils.sculptureMinMm}`" /></div>
            <button :class="F.btnPrimary" @click="relever">Enregistrer le relevé</button>
          </div>
          <table v-if="item.releves.length" class="w-full text-sm">
            <thead><tr class="text-[11px] text-muted-foreground uppercase text-left"><th class="py-1.5 font-semibold">Date</th><th class="py-1.5 font-semibold">Pression</th><th class="py-1.5 font-semibold">Sculpture</th><th class="py-1.5 font-semibold">Par</th></tr></thead>
            <tbody>
              <tr v-for="(r, i) in [...item.releves].reverse()" :key="i" class="border-t border-border/60">
                <td class="py-1.5">{{ fmtDate(r.date) }}</td>
                <td class="py-1.5" :class="r.pressionBar < store.seuils.pressionMinBar ? 'text-danger font-semibold' : ''">{{ r.pressionBar }} bar</td>
                <td class="py-1.5" :class="r.sculptureMm < store.seuils.sculptureMinMm ? 'text-danger font-semibold' : ''">{{ r.sculptureMm }} mm</td>
                <td class="py-1.5 text-muted-foreground">{{ r.par }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-xs text-muted-foreground">Aucun relevé enregistré.</p>
        </FormSection>

        <!-- 5. SORTIE -->
        <FormSection v-if="item.statut === 'monte' || item.statut === 'stock'" title="Démontage et retrait" :recaps="[item.statut === 'monte' ? 'monté' : 'en stock']" :default-open="false">
          <div :class="F.field"><label :class="F.fieldLabel">Motif (obligatoire pour un rechapage ou un rebut)</label><input v-model="retrait.motif" :class="F.fieldInput" placeholder="Ex. usure, crevaison, déchirure du flanc…" /></div>
          <div class="flex gap-2 mt-3 flex-wrap">
            <button v-if="item.statut === 'monte'" :class="F.btnOutline" @click="demonter">Démonter, remettre en stock</button>
            <button :class="F.btnOutline" @click="retirer('rechapage')">Envoyer au rechapage</button>
            <button :class="F.btnOutline" class="!text-danger" @click="retirer('rebut')">Mettre au rebut</button>
          </div>
        </FormSection>

        <!-- 6. HISTORIQUE -->
        <FormSection title="Historique" :recaps="[`${item.historique.length} événement(s)`]" :default-open="false">
          <div v-for="(e, i) in [...item.historique].reverse()" :key="i" class="flex gap-3 text-sm py-1.5 border-b border-border/50 last:border-0">
            <span class="text-muted-foreground w-[90px] shrink-0">{{ fmtDate(e.date) }}</span>
            <span class="text-foreground">{{ e.detail }}</span>
          </div>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
