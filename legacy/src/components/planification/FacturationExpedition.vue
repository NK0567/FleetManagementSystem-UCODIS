<script setup lang="ts">
/**
 * Facturation d'une expédition : prestations faites pour le compte de
 * clients, valorisées selon leur tarification sans ressaisie (à facturer,
 * puis facturée avec sa référence) ; et, pour une expédition confiée à un
 * transporteur externe, contrôle de sa facture face au tarif convenu.
 */
import { ref, computed, watch } from 'vue'
import * as cls from '../../lib/formClasses'
import { useVoyagesStore } from '../../stores/voyages'
import { useAuthStore } from '../../stores/auth'
import { useClientsStore } from '../../stores/clients'
import { useParametresPlanificationStore } from '../../stores/parametresPlanification'
import { fmtDateHeure } from '../../utils/voyageUtils'
import { fmtMontant } from '../../lib/monnaie'
import type { Voyage } from '../../types'

const props = defineProps<{ voyage: Voyage }>()
const store = useVoyagesStore()
const auth = useAuthStore()
const clients = useClientsStore()
const params = useParametresPlanificationStore()
/* Ordre annulé en route : les livraisons faites se facturent, la facture du transporteur se contrôle. */
const peutAgir = computed(() => !auth.lectureSeule && params.peutPiloter(auth.role) && (props.voyage.statut !== 'annule' || props.voyage.etapes.some(e => e.livreParChauffeurLe)))

const message = ref<{ texte: string; erreur: boolean } | null>(null)
function resultat(r: { ok: boolean; motif?: string }, succes: string) {
  message.value = r.ok ? { texte: succes, erreur: false } : { texte: r.motif ?? 'Action impossible.', erreur: true }
  return r.ok
}
watch(() => props.voyage.id, () => { message.value = null })

const lignes = computed(() => props.voyage.etapes.filter(e => e.destinataire && (e.franchi || e.facturation)).map(e => ({ e, val: store.valorisationLivraison(props.voyage, e) })))
const references = ref<Record<string, string>>({})
const refAvoir = ref<Record<string, string>>({})
function emettreAvoir(etapeId: string) { resultat(store.emettreAvoir(props.voyage.id, etapeId, refAvoir.value[etapeId] ?? ''), 'Avoir émis.') }
function facturer(etapeId: string) { resultat(store.marquerFacturee(props.voyage.id, etapeId, references.value[etapeId] ?? ''), 'Livraison marquée facturée.') }

const attendu = computed(() => store.montantAttenduTransporteur(props.voyage))
const facture = computed(() => props.voyage.factureTransporteur)
/* Expédition couverte par une facture du transporteur regroupant plusieurs expéditions. */
const groupee = computed(() => store.factureGroupeeDe(props.voyage.id))
const rapprochementGroupee = computed(() => groupee.value ? store.rapprochementFacture(groupee.value.voyageIds, groupee.value.montantTotal) : null)
const ecartFacture = computed(() => facture.value && attendu.value ? facture.value.montantFacture - attendu.value.montant : null)
const horsTolerance = computed(() => store.ecartFactureHorsTolerance(props.voyage) != null)
const sansTarifPermis = computed(() => !attendu.value && params.peutValiderSansTarif(auth.role))
const motifSansTarif = ref('')
const saisie = ref<{ reference: string; montant: number | null }>({ reference: '', montant: null })
const saisieOuverte = ref(false)
function saisir() {
  if (resultat(store.saisirFactureTransporteur(props.voyage.id, { reference: saisie.value.reference, montantFacture: Number(saisie.value.montant) }), 'Facture du transporteur enregistrée, à contrôler.')) saisieOuverte.value = false
}
const motifRefus = ref('')
function valider() { resultat(store.validerFactureTransporteur(props.voyage.id, motifSansTarif.value), 'Facture du transporteur validée.') }
function refuser() { if (resultat(store.refuserFactureTransporteur(props.voyage.id, motifRefus.value), 'Facture du transporteur refusée.')) motifRefus.value = '' }
const livrees = computed(() => props.voyage.etapes.filter(e => e.role === 'livraison'))
const lbl = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]'
const LIB_FACTURE = { a_controler: 'À contrôler', validee: 'Validée', refusee: 'Refusée' } as const
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>
      <p :class="lbl" class="mb-1.5">Prestations pour le compte de clients</p>
      <p v-if="!lignes.length" class="text-[12px] text-muted-foreground">Aucune livraison déclarée pour l'instant.</p>
      <div v-for="{ e, val } in lignes" :key="e.id" class="flex items-start gap-3 py-2 border-b border-border last:border-0 flex-wrap">
        <div class="flex-1 min-w-[220px]">
          <p class="text-[12px] font-medium text-foreground">{{ e.destinataire }}</p>
          <p v-if="val.ok" class="text-[12px] text-foreground">{{ clients.getById(val.clientId!)?.nom }} · {{ fmtMontant(val.montant) }} <span class="text-muted-foreground">({{ val.detail }})</span></p>
          <p v-if="val.ok && val.tacite && !e.facturation" class="text-[11px] text-muted-foreground">Confirmée tacitement</p>
          <div v-if="e.facturation?.avoirAEmettre" class="flex items-center gap-2 flex-wrap mt-1" data-avoir>
            <span class="text-[12px] text-warning">{{ e.facturation.avoirAEmettre.emisLe ? `Avoir ${e.facturation.avoirAEmettre.reference} émis` : 'Avoir à émettre' }} : {{ fmtMontant(e.facturation.avoirAEmettre.montant) }}</span>
            <template v-if="peutAgir && !e.facturation.avoirAEmettre.emisLe">
              <input v-model="refAvoir[e.id]" :class="cls.fieldInput" class="!h-[28px] !text-[12px] !w-[150px]" placeholder="Référence de l'avoir" />
              <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" :disabled="!refAvoir[e.id]?.trim()" @click="emettreAvoir(e.id)">Marquer l'avoir émis</button>
            </template>
          </div>
          <p v-else class="text-[12px] text-muted-foreground">{{ val.motif }}</p>
        </div>
        <template v-if="e.facturation?.statut === 'facturee'">
          <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success-bg text-success shrink-0">Facturée</span>
          <span class="text-[11px] text-muted-foreground shrink-0">{{ e.facturation.reference }} · {{ fmtDateHeure(e.facturation.factureeLe) }}</span>
        </template>
        <template v-else-if="val.ok">
          <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-warning-bg text-warning shrink-0">À facturer</span>
          <div v-if="peutAgir" class="flex items-center gap-2 shrink-0">
            <input v-model="references[e.id]" :class="cls.fieldInput" class="!h-[30px] !text-[12px] !w-[150px]" placeholder="Référence de facture" />
            <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" :disabled="!references[e.id]?.trim()" @click="facturer(e.id)">Marquer facturée</button>
          </div>
        </template>
      </div>
    </div>

    <div v-if="voyage.moyen === 'externe'">
      <p :class="lbl" class="mb-1.5">Facture du transporteur · {{ voyage.transporteurNom }}</p>
      <p class="text-[12px] text-foreground">
        Montant convenu : <template v-if="attendu">{{ fmtMontant(attendu.montant) }} <span class="text-muted-foreground">({{ attendu.detail }}<template v-if="attendu.retenues">, moins {{ fmtMontant(attendu.retenues) }} de retenue</template>)</span></template>
        <span v-else class="text-muted-foreground">aucune grille tarifaire du transporteur ne s'applique</span>
        <RouterLink :to="{ name: 'admin-parametres' }" class="text-[11px] text-primary underline ml-2">Voir les grilles tarifaires</RouterLink>
      </p>
      <p class="text-[12px] text-muted-foreground">Livraisons : {{ livrees.filter(e => e.franchi).length }} déclarée(s) sur {{ livrees.length }}<template v-if="livrees.some(e => e.ligneAnnuleeLe)">, {{ livrees.filter(e => e.ligneAnnuleeLe).length }} refusée(s) ou annulée(s)</template></p>
      <div v-if="groupee && rapprochementGroupee" class="rounded-md border px-3 py-2 mt-1.5" :class="rapprochementGroupee.horsTolerance ? 'border-danger/40 bg-danger-bg/40' : 'border-border'" data-facture-groupee>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-mono text-[12px] font-semibold">{{ groupee.numero }}</span>
          <span class="text-[12px] text-foreground">{{ fmtMontant(groupee.montantTotal) }} pour {{ groupee.voyageIds.length }} expédition(s)</span>
          <span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="groupee.statut === 'validee' ? 'bg-success-bg text-success' : groupee.statut === 'refusee' ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'">{{ LIB_FACTURE[groupee.statut] }}</span>
        </div>
        <p class="text-[12px] text-muted-foreground">Total convenu : {{ fmtMontant(rapprochementGroupee.totalConvenu) }}<template v-if="rapprochementGroupee.ecart"> · écart {{ rapprochementGroupee.ecart > 0 ? '+' : '' }}{{ fmtMontant(rapprochementGroupee.ecart) }}</template></p>
        <p class="text-[11px] text-muted-foreground">Contrôlée depuis la fiche du transporteur.</p>
      </div>
      <div v-else-if="facture" class="rounded-md border px-3 py-2 mt-1.5" :class="horsTolerance ? 'border-danger/40 bg-danger-bg/40' : 'border-border'">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-mono text-[12px] font-semibold">{{ facture.reference }}</span>
          <span class="text-[12px] text-foreground">{{ fmtMontant(facture.montantFacture) }}</span>
          <span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="facture.statut === 'validee' ? 'bg-success-bg text-success' : facture.statut === 'refusee' ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'">{{ LIB_FACTURE[facture.statut] }}</span>
        </div>
        <p v-if="ecartFacture" class="text-[12px] mt-0.5" :class="horsTolerance ? 'text-danger' : 'text-muted-foreground'">Écart avec le montant convenu : {{ ecartFacture > 0 ? '+' : '' }}{{ fmtMontant(ecartFacture) }}<template v-if="!horsTolerance">, dans l'écart toléré</template></p>
        <p v-if="facture.motifValidationSansTarif" class="text-[12px] text-muted-foreground">Validée sans grille tarifaire : {{ facture.motifValidationSansTarif }}</p>
        <p v-if="facture.motifRefus" class="text-[12px] text-danger">Refusée : {{ facture.motifRefus }}</p>
        <p v-if="facture.decideeLe" class="text-[11px] text-muted-foreground">{{ facture.statut === 'validee' ? 'Validée' : 'Refusée' }} le {{ fmtDateHeure(facture.decideeLe) }} par {{ facture.decideePar }}</p>
        <div v-if="peutAgir && facture.statut === 'a_controler'" class="flex items-center gap-2 mt-2 flex-wrap">
          <input v-if="sansTarifPermis" v-model="motifSansTarif" :class="cls.fieldInput" class="!h-[30px] !text-[12px] w-full" placeholder="Motif de la validation sans grille tarifaire (obligatoire)…" />
          <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="valider">Valider la facture</button>
          <input v-model="motifRefus" :class="cls.fieldInput" class="!h-[30px] !text-[12px] flex-1 min-w-[200px]" placeholder="Motif du refus…" />
          <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px] !text-danger" :disabled="!motifRefus.trim()" @click="refuser">Refuser</button>
        </div>
      </div>
      <button v-if="peutAgir && !groupee && facture?.statut !== 'validee' && !saisieOuverte" class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0 mt-1.5" @click="saisieOuverte = true; saisie = { reference: '', montant: null }">{{ facture ? 'Saisir une facture corrigée' : 'Saisir la facture du transporteur' }}</button>
      <div v-if="saisieOuverte" class="flex items-center gap-2 mt-1.5 flex-wrap">
        <input v-model="saisie.reference" :class="cls.fieldInput" class="!h-[30px] !text-[12px] !w-[160px]" placeholder="Référence" />
        <input v-model.number="saisie.montant" type="number" min="0" :class="cls.fieldInput" class="!h-[30px] !text-[12px] !w-[150px]" placeholder="Montant facturé" />
        <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="saisieOuverte = false">Renoncer</button>
        <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="saisir">Enregistrer</button>
      </div>
    </div>
    <p v-if="message" class="text-[12px]" :class="message.erreur ? 'text-danger' : 'text-success'">{{ message.texte }}</p>
  </div>
</template>
