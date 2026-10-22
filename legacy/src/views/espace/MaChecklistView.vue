<template>
  <div :class="L.pageWrap" class="max-w-3xl">
    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Checklist sur route</div>
        <div :class="L.pageSub">{{ voyage ? `${voyage.reference} · ${voyage.vehiculePlaque ?? ''} · pause ${prochainePause}` : 'Aucun voyage en cours' }}</div>
      </div>
      <span class="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full" :class="enLigne ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'">
        <component :is="enLigne ? Wifi : WifiOff" class="w-3.5 h-3.5" /> {{ enLigne ? 'En ligne' : 'Hors ligne' }}
      </span>
    </div>

    <div v-if="store.fileAttente.length" class="flex items-center gap-2 bg-warning-bg text-warning rounded-lg px-3.5 py-2.5 mb-3 text-xs">
      <CloudUpload class="w-4 h-4 shrink-0" /> {{ store.fileAttente.length }} relevé(s) en attente de synchronisation.
      <button v-if="enLigne" :class="F.btnOutline" class="ml-auto !py-1 !text-[11px]" @click="synchroniser">Synchroniser</button>
    </div>
    <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
    <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>

    <div v-if="!mesVoyages.length" :class="L.card" class="text-sm text-muted-foreground">Aucun voyage ne vous est confié en ce moment.</div>
    <template v-else>
      <div :class="L.card" class="mb-3.5">
        <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <div :class="F.field"><label :class="F.fieldLabel">Voyage</label>
            <select v-model="voyageId" :class="F.fieldInput"><option v-for="v in mesVoyages" :key="v.id" :value="v.id">{{ v.reference }} · {{ v.vehiculePlaque }}</option></select>
          </div>
          <div :class="F.field"><label :class="F.fieldLabel">Lieu de la pause</label><input v-model="lieu" :class="F.fieldInput" placeholder="ex. Relais Moramanga" /></div>
        </div>
        <button class="text-[12px] text-primary bg-transparent border-0 cursor-pointer p-0 mt-3" @click="toutConforme">Marquer les points restants conformes</button>
      </div>

      <div :class="L.card">
        <div v-for="p in store.pointsActifs" :key="p.code" class="py-2.5 border-b border-border/60 last:border-0">
          <div class="flex items-center gap-3">
            <span class="text-[13px] text-foreground flex-1">{{ p.libelle }}</span>
            <button class="px-3 py-1.5 rounded-md text-[12px] border-0 cursor-pointer" :class="resultats[p.code] === 'conforme' ? 'bg-success-bg text-success font-semibold' : 'bg-background text-muted-foreground'" @click="resultats[p.code] = 'conforme'">Conforme</button>
            <button class="px-3 py-1.5 rounded-md text-[12px] border-0 cursor-pointer" :class="resultats[p.code] === 'anomalie' ? 'bg-danger-bg text-danger font-semibold' : 'bg-background text-muted-foreground'" @click="resultats[p.code] = 'anomalie'">Anomalie</button>
          </div>
          <input v-model="commentaires[p.code]" :class="F.fieldInput" class="mt-2 !h-[34px] !text-[12px]" :placeholder="resultats[p.code] === 'anomalie' ? 'Décrivez l\'anomalie *' : 'Commentaire'" />
        </div>
        <div class="flex justify-end mt-4"><button :class="F.btnPrimary" @click="envoyer">J'atteste ces constats et j'enregistre la pause {{ prochainePause }}</button></div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { maintenant } from '../../utils/horloge'
/** Checklist sur route du chauffeur (FMS-SC-03) : à chaque pause, depuis le
 *  téléphone, même sans réseau ; le relevé se synchronise au retour de la connexion. */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { CircleCheck, CloudUpload, TriangleAlert, Wifi, WifiOff } from '@lucide/vue'
import { useControlesStore } from '../../stores/controles'
import { useVoyagesStore } from '../../stores/voyages'
import { useAuthStore } from '../../stores/auth'
import type { ResultatPoint } from '../../types'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const store = useControlesStore()
const voyages = useVoyagesStore()
const auth = useAuthStore()

const mesVoyages = computed(() => voyages.voyages.filter(v => v.chauffeurId === auth.user?.personnelId && ['planifie', 'confirme', 'pret', 'en_cours'].includes(v.statut)))
const voyageId = ref(mesVoyages.value.find(v => v.statut === 'en_cours')?.id ?? mesVoyages.value[0]?.id ?? '')
const voyage = computed(() => voyages.voyages.find(v => v.id === voyageId.value))
const enAttenteDuVoyage = computed(() => store.fileAttente.filter(s => s.voyageId === voyageId.value).length)
const prochainePause = computed(() => (store.checklists.find(c => c.voyageId === voyageId.value)?.releves.length ?? 0) + enAttenteDuVoyage.value + 1)

const lieu = ref('')
const resultats = ref<Record<string, ResultatPoint>>({})
const commentaires = ref<Record<string, string>>({})
const erreur = ref(''); const succes = ref('')
watch(voyageId, () => { resultats.value = {}; commentaires.value = {} })
function toutConforme() { store.pointsActifs.forEach(p => { if (!resultats.value[p.code]) resultats.value[p.code] = 'conforme' }) }

const enLigne = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const majReseau = () => { enLigne.value = navigator.onLine; if (enLigne.value && store.fileAttente.length) synchroniser() }
onMounted(() => { window.addEventListener('online', majReseau); window.addEventListener('offline', majReseau) })
onUnmounted(() => { window.removeEventListener('online', majReseau); window.removeEventListener('offline', majReseau) })

function envoyer() {
  const pause = prochainePause.value
  const r = store.soumettre({ voyageId: voyageId.value, lieu: lieu.value, resultats: { ...resultats.value }, commentaires: { ...commentaires.value },
    horodatage: maintenant().toISOString(), chauffeurId: auth.user?.personnelId ?? '', chauffeurNom: auth.user?.nom ?? '' }, enLigne.value)
  if (!r.ok) { erreur.value = r.motif ?? ''; succes.value = ''; return }
  const anomalies = Object.values(resultats.value).filter(v => v === 'anomalie').length
  erreur.value = ''
  succes.value = r.horsLigne
    ? `Pause ${pause} signée et enregistrée sur le téléphone : elle sera envoyée dès le retour du réseau.`
    : `Pause ${pause} signée et enregistrée.${anomalies ? ` ${anomalies} anomalie(s) signalée(s) au responsable.` : ''}`
  resultats.value = {}; commentaires.value = {}; lieu.value = ''
}
function synchroniser() {
  const n = store.synchroniser()
  succes.value = n ? `${n} relevé(s) synchronisé(s).` : ''; erreur.value = store.fileAttente.length ? 'Certains relevés n’ont pas pu être synchronisés.' : ''
}
</script>
