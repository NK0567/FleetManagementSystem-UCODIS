<script setup lang="ts">
/**
 * Fiche de débriefing d'un voyage : numéro de bon, dates de chargement et de
 * déchargement, lieu, véhicule, citerne, gain ou coulage qualifié et
 * observations. Préremplie depuis le voyage quand la donnée existe,
 * modifiable tant que la tournée n'est pas clôturée.
 */
import { ref, computed, watch } from 'vue'
import * as cls from '../../lib/formClasses'
import { useVoyagesStore } from '../../stores/voyages'
import { useAuthStore } from '../../stores/auth'
import { useParametresPlanificationStore } from '../../stores/parametresPlanification'
import { fmtDateHeure } from '../../utils/voyageUtils'
import type { Voyage } from '../../types'

const props = defineProps<{ voyage: Voyage; lectureSeule?: boolean }>()
const store = useVoyagesStore()
const auth = useAuthStore()
const params = useParametresPlanificationStore()

const modifiable = computed(() => !props.lectureSeule && !auth.lectureSeule && params.peutPiloter(auth.role)
  && (props.voyage.statut === 'en_cours' || props.voyage.statut === 'livre' || (props.voyage.statut === 'annule' && store.suiteOuverte(props.voyage))))
/** Le gain ou coulage qualifié découle des écarts qualifiés : non ressaisi. */
const gainDerive = computed(() => !!store.debriefingPrerempli(props.voyage).gainOuCoulage)
/** Fiche déjà enregistrée : sa saisie est gardée, mais le gain ou coulage suit les écarts qualifiés. */
const vide = () => {
  const pre = store.debriefingPrerempli(props.voyage)
  return { ...pre, ...(props.voyage.debriefing ?? {}), ...(pre.gainOuCoulage ? { gainOuCoulage: pre.gainOuCoulage } : {}) }
}
const form = ref(vide())
const edition = ref(false)
const message = ref<{ texte: string; erreur: boolean } | null>(null)
watch(() => props.voyage.id, () => { form.value = vide(); edition.value = false; message.value = null })
watch(() => props.voyage.debriefing, () => { if (!edition.value) form.value = vide() }, { deep: true })

function ouvrir() { form.value = vide(); edition.value = true; message.value = null }
function enregistrer() {
  const x = form.value
  const r = store.enregistrerDebriefing(props.voyage.id, {
    numeroBon: x.numeroBon, dateChargement: x.dateChargement, dateDechargement: x.dateDechargement, lieu: x.lieu,
    vehicule: x.vehicule, citerne: x.citerne, gainOuCoulage: x.gainOuCoulage, observations: x.observations,
  })
  message.value = r.ok ? { texte: 'Fiche de débriefing enregistrée.', erreur: false } : { texte: r.motif ?? '', erreur: true }
  if (r.ok) edition.value = false
}
const lbl = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]'
const val = 'text-[13px] text-foreground'
const champs = computed(() => {
  const f = props.voyage.debriefing ?? store.debriefingPrerempli(props.voyage)
  return [
    ['Numéro de bon', f.numeroBon], ['Date de chargement', fmtDateHeure(f.dateChargement)], ['Date de déchargement', fmtDateHeure(f.dateDechargement)],
    ['Lieu', f.lieu], ['Véhicule', f.vehicule], ['Citerne', f.citerne], ['Gain ou coulage qualifié', f.gainOuCoulage], ['Observations', f.observations],
  ] as [string, string][]
})
</script>

<template>
  <div>
    <template v-if="!edition">
      <div class="grid grid-cols-2 gap-x-6 gap-y-3 max-sm:grid-cols-1">
        <div v-for="[l, v] in champs" :key="l" class="flex flex-col gap-0.5" :class="l === 'Observations' || l === 'Gain ou coulage qualifié' ? 'col-span-2 max-sm:col-span-1' : ''">
          <span :class="lbl">{{ l }}</span><span :class="val">{{ v || '-' }}</span>
        </div>
      </div>
      <p v-if="voyage.debriefing" class="text-[11px] text-muted-foreground mt-2">Enregistrée le {{ fmtDateHeure(voyage.debriefing.enregistreeLe) }} par {{ voyage.debriefing.enregistreePar }}</p>
      <div v-if="modifiable" class="flex justify-end mt-3">
        <button :class="cls.btnOutline" class="!py-1.5 !text-[12px]" @click="ouvrir">{{ voyage.debriefing ? 'Modifier la fiche' : 'Remplir la fiche' }}</button>
      </div>
    </template>
    <template v-else>
      <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <div class="flex flex-col gap-1"><label :class="lbl">Numéro de bon</label><input v-model="form.numeroBon" :class="cls.fieldInput" /></div>
        <div class="flex flex-col gap-1"><label :class="lbl">Lieu</label><input v-model="form.lieu" :class="cls.fieldInput" /></div>
        <div class="flex flex-col gap-1"><label :class="lbl">Date de chargement</label><input v-model="form.dateChargement" type="datetime-local" :class="cls.fieldInput" /></div>
        <div class="flex flex-col gap-1"><label :class="lbl">Date de déchargement</label><input v-model="form.dateDechargement" type="datetime-local" :class="cls.fieldInput" /></div>
        <div class="flex flex-col gap-1"><label :class="lbl">Véhicule</label><input v-model="form.vehicule" :class="cls.fieldInput" /></div>
        <div class="flex flex-col gap-1"><label :class="lbl">Citerne</label><input v-model="form.citerne" :class="cls.fieldInput" /></div>
        <div class="flex flex-col gap-1 col-span-2 max-sm:col-span-1"><label :class="lbl">Gain ou coulage qualifié</label><input v-model="form.gainOuCoulage" :class="cls.fieldInput" :readonly="gainDerive" :disabled="gainDerive" /></div>
        <div class="flex flex-col gap-1 col-span-2 max-sm:col-span-1"><label :class="lbl">Observations</label><textarea v-model="form.observations" rows="2" :class="cls.fieldTextarea"></textarea></div>
      </div>
      <div class="flex justify-end gap-2 mt-3">
        <button :class="cls.btnOutline" class="!py-1.5 !text-[12px]" @click="edition = false; message = null">Renoncer</button>
        <button :class="cls.btnPrimary" class="!py-1.5 !text-[12px]" @click="enregistrer">Enregistrer la fiche</button>
      </div>
    </template>
    <p v-if="message" class="text-[12px] mt-2" :class="message.erreur ? 'text-danger' : 'text-success'">{{ message.texte }}</p>
  </div>
</template>
