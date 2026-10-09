<template>
  <div class="min-h-screen bg-background flex flex-col">
    <header class="bg-[#111827] px-5 py-3.5 flex items-center gap-2">
      <Truck class="w-5 h-5 text-white shrink-0" />
      <span class="text-white font-semibold text-[15px]">FMS Trucks</span>
      <span class="text-white/50 text-[12px]">· Suivi de livraison</span>
    </header>

    <div class="flex-1 flex items-start justify-center px-4 py-8">
      <div class="w-full max-w-md">

        <template v-if="!trouve">
          <div :class="L.card" class="text-center py-10">
            <AlertTriangle class="w-8 h-8 text-warning mx-auto mb-3" />
            <p class="text-sm font-medium text-foreground">Lien invalide ou expiré</p>
            <p class="text-[12px] text-muted-foreground mt-1">Ce lien de suivi ne correspond à aucune livraison connue.</p>
          </div>
        </template>

        <template v-else>
          <div :class="L.card" class="mb-4">
            <p class="text-[11px] text-muted-foreground uppercase tracking-[0.04em]">Livraison pour</p>
            <p class="text-lg font-bold text-foreground">{{ etape.destinataire }}</p>
            <p class="text-[13px] text-muted-foreground">{{ etape.adresseLivraison }}</p>
            <div class="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <Package class="w-3.5 h-3.5" /> {{ voyage.marchandise.typeProduit }} · Réf. {{ voyage.numeroOT || voyage.reference }}
            </div>
          </div>

          <!-- Étapes de progression -->
          <div :class="L.card" class="mb-4">
            <div class="flex flex-col gap-0">
              <div v-for="(etapeProgres, i) in etapesProgres" :key="etapeProgres.cle" class="flex gap-3">
                <div class="flex flex-col items-center">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                       :class="etapeProgres.atteinte ? 'bg-success text-white' : 'bg-border text-muted-foreground'">
                    <Check v-if="etapeProgres.atteinte" class="w-3.5 h-3.5" />
                    <span v-else class="text-[10px] font-bold">{{ i + 1 }}</span>
                  </div>
                  <div v-if="i < etapesProgres.length - 1" class="w-0.5 flex-1 min-h-[24px]" :class="etapeProgres.atteinte ? 'bg-success' : 'bg-border'" />
                </div>
                <div class="pb-5">
                  <p class="text-[13px] font-medium" :class="etapeProgres.atteinte ? 'text-foreground' : 'text-muted-foreground'">{{ etapeProgres.libelle }}</p>
                  <p v-if="etapeProgres.detail" class="text-[11px] text-muted-foreground">{{ etapeProgres.detail }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Ce que l'entrepôt a chargé pour moi : je sais à l'avance ce que je dois
               recevoir, ce qui limite les refus à l'arrivée du chauffeur. -->
          <div v-if="voyage.chargementEntrepotLe && etape.contenuCharge && !horsTournee(etape)" :class="L.card" class="mb-4">
            <div class="flex items-center gap-2 mb-2">
              <Package class="w-4 h-4 text-primary" />
              <p class="text-[13px] font-semibold text-foreground">Ce qui a été chargé pour vous</p>
            </div>
            <ul class="flex flex-col gap-1 mb-2">
              <li v-for="a in articlesAffiches" :key="a.id" class="text-[12px] flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="a.statut === 'non_livre' ? 'bg-warning' : 'bg-primary'"></span>
                <span :class="a.statut === 'non_livre' ? 'line-through text-muted-foreground' : 'text-foreground'">{{ a.libelle }}</span>
                <span v-if="a.statut === 'non_livre'" class="text-[11px] text-warning">non livré : {{ a.motif }}</span>
              </li>
            </ul>
            <p class="text-[11px] text-muted-foreground">Déclaré par l'entrepôt le {{ fmtDateHeure(voyage.chargementEntrepotLe) }}. Si quelque chose ne correspond pas à votre commande, vous pourrez le signaler à la livraison.</p>
          </div>

          <!-- Indisponible : la livraison sort de cette tournée et sera replanifiée -->
          <div v-if="horsTournee(etape)" :class="L.card" class="!border-warning/30 bg-warning-bg/30">
            <div class="flex items-center gap-2 text-warning mb-1">
              <CalendarClock class="w-5 h-5" />
              <p class="text-[13px] font-semibold">{{ titreHors }}</p>
            </div>
            <p class="text-[11px] text-muted-foreground mb-2">{{ detailHors }}</p>

            <p v-if="etape.dateConfirmeeLe" class="text-[12px] text-success font-medium">Livraison replanifiée au {{ fmtJour(etape.dateProposeePlanif) }}, date confirmée.</p>

            <!-- Chemin normal : c'est moi qui connais mon programme, je propose ma date -->
            <template v-else-if="!etape.dateProposeePlanif">
              <p class="text-[12px] text-foreground mb-1">À partir de quelle date puis-je être livré ?</p>
              <div v-if="!proposerOuvert" class="flex items-center gap-3">
                <p v-if="etape.dateDisponibleClient" class="text-[12px] text-foreground">J'ai indiqué le <span class="font-semibold">{{ fmtJour(etape.dateDisponibleClient) }}</span>.</p>
                <button class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0" @click="proposerOuvert = true; maDate = etape.dateDisponibleClient ?? ''">{{ etape.dateDisponibleClient ? 'Changer cette date' : 'Indiquer une date' }}</button>
              </div>
              <div v-else class="flex flex-col gap-2">
                <input v-model="maDate" type="date" :class="cls.fieldInput" />
                <div class="flex items-center gap-2">
                  <button :class="cls.btnOutline" class="flex-1 justify-center" @click="proposerOuvert = false">Renoncer</button>
                  <button :class="cls.btnPrimary" class="flex-1 justify-center" :disabled="!maDate" @click="envoyerMaDate">Envoyer</button>
                </div>
              </div>
            </template>

            <!-- Secours seulement : le planificateur a proposé une date en mon absence -->
            <template v-else>
              <p class="text-[12px] text-foreground mb-2">Le planificateur vous propose : <span class="font-semibold">{{ fmtJour(etape.dateProposeePlanif) }}</span>.</p>
              <div v-if="!autreDateOuverte" class="flex items-center gap-3">
                <button :class="cls.btnPrimary" @click="accepterDate"><Check class="w-4 h-4" /> J'accepte cette date</button>
                <button class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="autreDateOuverte = true">Cette date ne me convient pas</button>
              </div>
              <div v-else class="flex flex-col gap-2">
                <label class="text-[11px] text-muted-foreground">Je peux être livré à partir du</label>
                <input v-model="autreDate" type="date" :class="cls.fieldInput" />
                <div class="flex items-center gap-2">
                  <button :class="cls.btnOutline" class="flex-1 justify-center" @click="autreDateOuverte = false; autreDate = ''">Renoncer</button>
                  <button :class="cls.btnPrimary" class="flex-1 justify-center" :disabled="!autreDate" @click="refuserDate">Envoyer</button>
                </div>
              </div>
            </template>
          </div>

          <!-- Avant chargement : serez-vous disponible à la date prévue ? -->
          <div v-else-if="aConfirmerDispo" :class="L.card" class="mb-4 !border-primary/30">
            <p class="text-[13px] font-medium text-foreground mb-1">Serez-vous disponible le {{ fmtJour(voyage.datePlanifiee) }} ?</p>
            <p class="text-[11px] text-muted-foreground mb-3">Votre réponse évite un déplacement inutile.</p>
            <div v-if="!dispoOuverte" class="flex items-center gap-3">
              <button :class="cls.btnPrimary" @click="confirmerDisponibilite"><Check class="w-4 h-4" /> Je confirme ma disponibilité</button>
              <button class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="dispoOuverte = true">Je ne serai pas disponible</button>
            </div>
            <div v-else class="flex flex-col gap-2">
              <input v-model="motifIndispo" :class="cls.fieldInput" placeholder="Pourquoi n'êtes-vous pas disponible ?…" />
              <label class="text-[11px] text-muted-foreground">Je peux être livré à partir du</label>
              <input v-model="dateIndispo" type="date" :class="cls.fieldInput" />
              <div class="flex items-center gap-2">
                <button :class="cls.btnOutline" class="flex-1 justify-center" @click="dispoOuverte = false; motifIndispo = ''; dateIndispo = ''">Renoncer</button>
                <button :class="cls.btnPrimary" class="flex-1 justify-center" :disabled="!motifIndispo.trim()" @click="signalerIndisponibilite">Envoyer</button>
              </div>
            </div>
          </div>

          <div v-else-if="etape.ligneAnnuleeLe" :class="L.card" class="!border-danger/30 bg-danger-bg/30">
            <div class="flex items-center gap-2 text-danger mb-1">
              <CircleX class="w-5 h-5" />
              <p class="text-[13px] font-semibold">Livraison annulée</p>
            </div>
            <p class="text-[11px] text-muted-foreground">{{ etape.motifAnnulationLigne }}</p>
          </div>

          <div v-else-if="etape.reporteLe" :class="L.card" class="!border-warning/30 bg-warning-bg/30">
            <div class="flex items-center gap-2 text-warning mb-1">
              <Clock class="w-5 h-5" />
              <p class="text-[13px] font-semibold">Livraison reportée</p>
            </div>
            <p class="text-[11px] text-muted-foreground">{{ etape.motifReport }} Le chauffeur retentera la livraison prochainement.</p>
          </div>

          <!-- Le chauffeur est sur place mais n'a pas encore déclaré la livraison -->
          <div v-else-if="chauffeurSurPlace" :class="L.card" class="mb-4 !border-info/30">
            <div class="flex items-center gap-2 text-info mb-1">
              <Truck class="w-5 h-5" />
              <p class="text-[13px] font-semibold">Le chauffeur est chez vous</p>
            </div>
            <p class="text-[11px] text-muted-foreground">Vérifiez la marchandise remise. Dès que le chauffeur aura déclaré la livraison, vous pourrez confirmer ici ce que vous avez réellement reçu.</p>
            <button v-if="!annulationOuverte" class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0 mt-3" @click="annulationOuverte = true">Je refuse la commande</button>
            <div v-else class="flex flex-col gap-2 mt-3">
              <input v-model="motifAnnulation" :class="cls.fieldInput" placeholder="Pourquoi refusez-vous la commande ?…" />
              <div class="flex items-center gap-2">
                <button :class="cls.btnOutline" class="flex-1 justify-center" @click="annulationOuverte = false; motifAnnulation = ''">Renoncer</button>
                <button :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90 flex-1 justify-center" :disabled="!motifAnnulation.trim()" @click="annulerCommande">Confirmer le refus</button>
              </div>
            </div>
          </div>

          <!-- Contestation déjà envoyée -->
          <div v-else-if="etape.receptionContesteeLe" :class="L.card" class="mb-4 !border-danger/30 bg-danger-bg/30">
            <div class="flex items-center gap-2 text-danger mb-1">
              <AlertTriangle class="w-5 h-5" />
              <p class="text-[13px] font-semibold">Vous avez contesté cette livraison</p>
            </div>
            <p class="text-[11px] text-muted-foreground">{{ etape.motifContestation }}. Le planificateur est prévenu et va revenir vers vous.</p>
          </div>

          <!-- Le chauffeur a déclaré : c'est à moi, et à moi seul, de confirmer ou contester -->
          <div v-else-if="peutConfirmer" :class="L.card" class="mb-4 !border-primary/30">
            <p class="text-[13px] font-medium text-foreground mb-1">Le chauffeur déclare vous avoir livré. Le confirmez-vous ?</p>
            <p class="text-[11px] text-muted-foreground mb-3">Votre confirmation fait foi et signe le bon de livraison. La déclaration du chauffeur, seule, ne suffit pas.</p>
            <template v-if="!contestationOuverte">
              <input v-model="nomConfirmation" :class="cls.fieldInput" placeholder="Votre nom…" class="mb-2.5" />
              <button :class="cls.btnPrimary" class="w-full justify-center" :disabled="!nomConfirmation.trim()" @click="confirmer">
                <Check class="w-4 h-4" /> Je confirme avoir reçu ma livraison
              </button>
              <button class="text-[11px] text-danger underline bg-transparent border-0 cursor-pointer p-0 mt-3" @click="contestationOuverte = true">Je n'ai pas reçu ce qui est déclaré</button>
            </template>
            <div v-else class="flex flex-col gap-2">
              <textarea v-model="motifContestation" rows="2" :class="cls.fieldTextarea" placeholder="Qu'est-ce qui ne correspond pas ? (rien reçu, articles manquants, articles abîmés…)"></textarea>
              <div class="flex items-center gap-2">
                <button :class="cls.btnOutline" class="flex-1 justify-center" @click="contestationOuverte = false; motifContestation = ''">Renoncer</button>
                <button :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90 flex-1 justify-center" :disabled="!motifContestation.trim()" @click="contester">Envoyer ma contestation</button>
              </div>
            </div>
          </div>

          <div v-else-if="etape.receptionConfirmeeClientLe" class="flex flex-col gap-4">
            <div :class="L.card" class="!border-success/30 bg-success-bg/30">
              <div class="flex items-center gap-2 text-success mb-1">
                <CheckCircle2 class="w-5 h-5" />
                <p class="text-[13px] font-semibold">Livraison confirmée</p>
              </div>
              <p class="text-[11px] text-muted-foreground">Réception confirmée par {{ etape.eBL?.signePar }}, le {{ fmtDateHeure(etape.receptionConfirmeeClientLe) }}.</p>
              <p v-if="etape.eBL?.articlesNonLivres?.length" class="text-[11px] text-warning mt-1.5">
                Livraison partielle. Non livré : {{ etape.eBL.articlesNonLivres.map(a => `${a.libelle} (${a.motif})`).join(' · ') }}. <template v-if="etape.reliquatDate">Ils vous seront livrés à partir du {{ fmtJour(etape.reliquatDate) }}.</template><template v-else>Ils seront replanifiés.</template>
              </p>
            </div>

            <!-- Mon bon de livraison -->
            <div v-if="etape.eBL" :class="L.card">
              <div class="flex items-center gap-2 mb-2">
                <FileCheck class="w-4 h-4 text-success" />
                <p class="text-[13px] font-semibold text-foreground">Bon de livraison {{ etape.eBL.reference }}</p>
              </div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
                <span class="text-muted-foreground">Émis le</span><span class="text-foreground">{{ fmtDateHeure(etape.eBL.emisLe) }}</span>
                <span class="text-muted-foreground">Livré</span><span class="text-foreground">{{ etape.eBL.produit }}</span>
                <span class="text-muted-foreground">Véhicule</span><span class="text-foreground">{{ voyage.vehiculePlaque }}</span>
                <span class="text-muted-foreground">Signé par</span><span class="text-foreground">{{ etape.eBL.signePar }}</span>
              </div>
              <p v-if="etape.eBL.articlesNonLivres?.length" class="text-[11px] text-warning mt-2">Non livré : {{ etape.eBL.articlesNonLivres.map(x => `${x.libelle} (${x.motif})`).join(' · ') }}</p>
            </div>

            <!-- Enquête de satisfaction -->
            <div :class="L.card">
              <template v-if="etape.satisfactionNote == null">
                <p class="text-[13px] font-medium text-foreground mb-1">Comment s'est passée votre livraison ?</p>
                <p class="text-[11px] text-muted-foreground mb-3">Votre avis reste facultatif.</p>
                <div class="flex items-center gap-1.5 mb-3">
                  <button v-for="n in 5" :key="n" class="bg-transparent border-0 cursor-pointer p-0.5" @click="noteChoisie = n">
                    <Star class="w-7 h-7" :class="n <= noteChoisie ? 'fill-yellow-400 text-yellow-400' : 'text-border'" />
                  </button>
                </div>
                <textarea v-model="commentaire" rows="2" :class="cls.fieldTextarea" placeholder="Un commentaire à ajouter (facultatif)…" class="mb-2.5"></textarea>
                <button :class="cls.btnPrimary" class="w-full justify-center" :disabled="!noteChoisie" @click="envoyerSatisfaction">Envoyer mon avis</button>
              </template>
              <template v-else>
                <p class="text-[13px] font-medium text-foreground mb-2">Merci pour votre avis !</p>
                <div class="flex items-center gap-0.5 mb-1.5">
                  <Star v-for="n in 5" :key="n" class="w-5 h-5" :class="n <= etape.satisfactionNote! ? 'fill-yellow-400 text-yellow-400' : 'text-border'" />
                </div>
                <p v-if="etape.satisfactionCommentaire" class="text-[12px] text-muted-foreground italic">« {{ etape.satisfactionCommentaire }} »</p>
              </template>
            </div>
          </div>

          <div v-else :class="L.card" class="text-center py-6">
            <Clock class="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p class="text-[12px] text-muted-foreground">Votre livraison n'est pas encore arrivée sur place.</p>
          </div>

          <p class="text-[10px] text-muted-foreground text-center mt-5">
            Cette page ne nécessite ni compte ni mot de passe : elle est propre à cette livraison.
          </p>
        </template>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Espace client, accessible sans compte : un lien propre à chaque
 * ligne de livraison, envoyé par SMS ou e-mail (voir la notification
 * générée à la planification et au démarrage dans le store), ouvre
 * cette page sur l'appareil du destinataire. Elle permet exactement ce
 * que le chauffeur peut aussi faire depuis le sien - recueillir la
 * confirmation de réception - les deux chemins aboutissent au même
 * geste, et seule la confirmation du client fait foi, pour qu'aucun ne fasse jamais
 * exception à l'autre. C'est ensuite ici, et seulement ici, que le
 * destinataire peut répondre lui-même à l'enquête de satisfaction :
 * jamais le chauffeur ou le planificateur à sa place.
 */
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Truck, AlertTriangle, CalendarClock, Package, Check, CheckCircle2, CircleX, Star, Clock, FileCheck } from '@lucide/vue'
import { useVoyagesStore } from '../../stores/voyages'
import { fmtDateHeure, horsTournee } from '../../utils/voyageUtils'
import * as cls from '../../lib/formClasses'
import * as L from '../../lib/listClasses'

const route = useRoute()
const store = useVoyagesStore()
const etapeId = String(route.params.etapeId)

const trouve = computed(() => store.trouverLigne(etapeId))
const voyage = computed(() => trouve.value!.voyage)
const etape = computed(() => trouve.value!.etape)

const etapesProgres = computed(() => {
  if (!trouve.value) return []
  const v = voyage.value, e = etape.value
  return [
    { cle: 'planifiee', libelle: 'Livraison planifiée', detail: new Date(v.datePlanifiee).toLocaleDateString('fr-FR'), atteinte: true },
    { cle: 'en_cours', libelle: 'Chauffeur en route', detail: v.chauffeurNom, atteinte: v.statut === 'en_cours' || v.statut === 'livre' || v.statut === 'cloture' || !!e.arriveeLe || e.franchi },
    { cle: 'arrivee', libelle: 'Chauffeur sur place', detail: e.arriveeLe ? fmtDateHeure(e.arriveeLe) : undefined, atteinte: !!e.arriveeLe },
    { cle: 'livree', libelle: 'Réception confirmée par vous', detail: e.receptionConfirmeeClientLe ? fmtDateHeure(e.receptionConfirmeeClientLe) : undefined, atteinte: !!e.receptionConfirmeeClientLe },
  ]
})

function fmtJour(iso?: string) { return iso ? new Date(iso).toLocaleDateString('fr-FR') : '' }

/** Avant le chargement, le destinataire peut confirmer sa disponibilité, ou
 *  signaler qu'il n'est pas disponible en disant à partir de quand il le
 *  sera - sans avoir à passer par un appel, mais l'appel du planificateur
 *  reste possible : les deux chemins passent par les mêmes fonctions. */
const aConfirmerDispo = computed(() => !!trouve.value && voyage.value.statut === 'planifie' && voyage.value.confirmationRequise !== false
  && !!etape.value.destinataire && !etape.value.confirmeLe && !etape.value.indisponibleLe)
const dispoOuverte = ref(false)
const motifIndispo = ref('')
const dateIndispo = ref('')
function confirmerDisponibilite() {
  store.confirmerClient(voyage.value.id, etape.value.id)
}
function signalerIndisponibilite() {
  if (!motifIndispo.value.trim()) return
  store.declarerIndisponible(voyage.value.id, etape.value.id, motifIndispo.value.trim(), dateIndispo.value || undefined)
  dispoOuverte.value = false; motifIndispo.value = ''; dateIndispo.value = ''
}
/** Réponse à la date que le planificateur propose. */
/** Je connais mon propre programme : c'est moi qui indique la date qui me
 *  convient, pas le planificateur qui me l'impose. */
const proposerOuvert = ref(false)
const maDate = ref('')
function envoyerMaDate() {
  if (!maDate.value) return
  const res = store.clientProposeDate(voyage.value.id, etape.value.id, maDate.value)
  if (!res.ok) { alert(res.motif); return }
  proposerOuvert.value = false
}
/** Secours seulement, si le planificateur a dû proposer une date faute
 *  d'avoir eu la mienne. */
const autreDateOuverte = ref(false)
const autreDate = ref('')
function accepterDate() { store.confirmerNouvelleDate(voyage.value.id, etape.value.id) }
function refuserDate() {
  if (!autreDate.value) return
  store.refuserNouvelleDate(voyage.value.id, etape.value.id, autreDate.value)
  autreDateOuverte.value = false; autreDate.value = ''
}

/** Le chauffeur est là mais n'a pas encore déclaré : je peux encore refuser
 *  la commande, pas encore confirmer. */
const chauffeurSurPlace = computed(() => !!trouve.value && !!etape.value.arriveeLe && !etape.value.livreParChauffeurLe
  && !etape.value.reporteLe && !etape.value.ligneAnnuleeLe && !horsTournee(etape.value))
/** Seule la déclaration du chauffeur ouvre ma confirmation ; mon nom saisi
 *  ici, sur mon propre appareil, est ce qui fait foi. */
const peutConfirmer = computed(() => !!trouve.value && !!etape.value.livreParChauffeurLe
  && !etape.value.receptionConfirmeeClientLe && !etape.value.receptionContesteeLe)
const nomConfirmation = ref('')
function confirmer() {
  if (!trouve.value || !nomConfirmation.value.trim()) return
  const res = store.confirmerReceptionClient(voyage.value.id, etape.value.id, nomConfirmation.value)
  if (!res.ok) alert(res.motif)
}
const contestationOuverte = ref(false)
const motifContestation = ref('')
function contester() {
  const res = store.contesterReceptionClient(voyage.value.id, etape.value.id, motifContestation.value)
  if (!res.ok) { alert(res.motif); return }
  contestationOuverte.value = false
}
/** Articles à afficher : ceux de la ligne s'ils existent, sinon le contenu
 *  déclaré tel quel. */
const articlesAffiches = computed(() => etape.value.articles?.length
  ? etape.value.articles
  : [{ id: 'x', libelle: etape.value.contenuCharge ?? '', statut: undefined, motif: undefined }])
/** Une ligne sortie de la tournée se replanifie, quelle qu'en soit la cause :
 *  le client le voit et répond à la date proposée de la même façon. */
const titreHors = computed(() => {
  const e = etape.value
  if (e.retourEntrepotLe) return 'Votre livraison est reportée'
  if (e.chargementNonConformeLe) return 'Votre commande ne part pas avec cette tournée'
  return "Vous n'êtes pas disponible à la date prévue"
})
const detailHors = computed(() => {
  const e = etape.value
  if (e.retourEntrepotLe) return `La marchandise retourne à l'entrepôt : ${e.motifRetour}`
  if (e.chargementNonConformeLe) return "Un problème a été constaté au chargement, votre commande sera rechargée et replanifiée."
  return e.motifIndisponibilite
})

/** J'annule directement ma commande depuis mon propre espace, sans
 *  passer par le chauffeur : le même geste que si je l'appelais pour
 *  le lui dire, mais que je peux faire moi-même quand j'ai la main sur
 *  mon téléphone. Passe par la même fonction du store que lorsque
 *  c'est le chauffeur qui l'enregistre en mon nom, pour que les deux
 *  chemins restent rigoureusement équivalents. */
const annulationOuverte = ref(false)
const motifAnnulation = ref('')
function annulerCommande() {
  if (!trouve.value || !motifAnnulation.value.trim()) return
  const res = store.annulerLigne(voyage.value.id, etape.value.id, motifAnnulation.value.trim())
  if (!res.ok) { alert(res.motif); return }
  annulationOuverte.value = false
  motifAnnulation.value = ''
}

const noteChoisie = ref(0)
const commentaire = ref('')
function envoyerSatisfaction() {
  if (!noteChoisie.value) return
  store.repondreSatisfaction(etape.value.id, noteChoisie.value, commentaire.value)
}
</script>
