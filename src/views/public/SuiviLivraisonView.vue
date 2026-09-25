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

          <!-- Confirmation de réception -->
          <div v-if="peutConfirmer" :class="L.card" class="mb-4 !border-primary/30">
            <p class="text-[13px] font-medium text-foreground mb-1">Confirmez-vous avoir reçu votre livraison ?</p>
            <p class="text-[11px] text-muted-foreground mb-3">Cette confirmation remplace une signature papier et clôt la livraison dans le système.</p>
            <input v-model="nomConfirmation" :class="cls.fieldInput" placeholder="Votre nom…" class="mb-2.5" />
            <button :class="cls.btnPrimary" class="w-full justify-center" :disabled="!nomConfirmation.trim()" @click="confirmer">
              <Check class="w-4 h-4" /> Confirmer la réception
            </button>
          </div>

          <div v-else-if="etape.franchi" class="flex flex-col gap-4">
            <div :class="L.card" class="!border-success/30 bg-success-bg/30">
              <div class="flex items-center gap-2 text-success mb-1">
                <CheckCircle2 class="w-5 h-5" />
                <p class="text-[13px] font-semibold">Livraison confirmée</p>
              </div>
              <p class="text-[11px] text-muted-foreground">Réceptionnée par {{ etape.eBL?.signePar }}, le {{ fmtDateHeure(etape.signeLe) }}.</p>
            </div>

            <!-- Enquête de satisfaction -->
            <div :class="L.card">
              <template v-if="etape.satisfactionNote == null">
                <p class="text-[13px] font-medium text-foreground mb-1">Comment s'est passée votre livraison ?</p>
                <p class="text-[11px] text-muted-foreground mb-3">Votre avis reste facultatif.</p>
                <div class="flex items-center gap-1.5 mb-3">
                  <button v-for="n in 5" :key="n" class="bg-transparent border-0 cursor-pointer p-0.5" @click="noteChoisie = n">
                    <Star class="w-7 h-7" :class="n <= noteChoisie ? 'fill-warning text-warning' : 'text-border'" />
                  </button>
                </div>
                <textarea v-model="commentaire" rows="2" :class="cls.fieldTextarea" placeholder="Un commentaire à ajouter (facultatif)…" class="mb-2.5"></textarea>
                <button :class="cls.btnPrimary" class="w-full justify-center" :disabled="!noteChoisie" @click="envoyerSatisfaction">Envoyer mon avis</button>
              </template>
              <template v-else>
                <p class="text-[13px] font-medium text-foreground mb-2">Merci pour votre avis !</p>
                <div class="flex items-center gap-0.5 mb-1.5">
                  <Star v-for="n in 5" :key="n" class="w-5 h-5" :class="n <= etape.satisfactionNote! ? 'fill-warning text-warning' : 'text-border'" />
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
 * geste, signerLigne(), pour qu'aucun des deux ne fasse jamais
 * exception à l'autre. C'est ensuite ici, et seulement ici, que le
 * destinataire peut répondre lui-même à l'enquête de satisfaction :
 * jamais le chauffeur ou le planificateur à sa place.
 */
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Truck, AlertTriangle, Package, Check, CheckCircle2, Star, Clock } from '@lucide/vue'
import { useVoyagesStore } from '../../stores/voyages'
import { fmtDateHeure } from '../../utils/voyageUtils'
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
    { cle: 'arrivee', libelle: 'Chauffeur sur place', detail: e.arriveeLe ? fmtDateHeure(e.arriveeLe) : undefined, atteinte: !!e.arriveeLe || e.franchi },
    { cle: 'livree', libelle: 'Livraison reçue', detail: e.franchi ? fmtDateHeure(e.signeLe) : undefined, atteinte: e.franchi },
  ]
})

const peutConfirmer = computed(() => !!trouve.value && !!etape.value.arriveeLe && !etape.value.franchi)
const nomConfirmation = ref('')
function confirmer() {
  if (!trouve.value || !nomConfirmation.value.trim()) return
  store.signerLigne(voyage.value.id, etape.value.id, nomConfirmation.value.trim())
}

const noteChoisie = ref(0)
const commentaire = ref('')
function envoyerSatisfaction() {
  if (!noteChoisie.value) return
  store.repondreSatisfaction(etape.value.id, noteChoisie.value, commentaire.value)
}
</script>
