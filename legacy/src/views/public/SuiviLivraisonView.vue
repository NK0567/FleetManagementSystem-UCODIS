<template>
  <div class="min-h-screen bg-background flex flex-col">
    <header class="bg-[#111827] px-5 py-3.5 flex items-center gap-2">
      <Truck class="w-5 h-5 text-white shrink-0" />
      <span class="text-white font-semibold text-[15px]" data-entreprise>{{ nomEntreprise }}</span>
      <span class="text-white/50 text-[12px]">· Suivi de livraison</span>
    </header>

    <div class="flex-1 flex items-start justify-center px-4 py-8">
      <div class="w-full max-w-md">

        <template v-if="!trouve">
          <div :class="L.card" class="text-center py-10">
            <AlertTriangle class="w-8 h-8 text-warning mx-auto mb-3" />
            <p class="text-sm font-medium text-foreground">Lien invalide</p>
          </div>
        </template>

        <!-- Enquête de l'ordonnateur, par son propre lien -->
        <template v-else-if="modeEnquete">
          <div :class="L.card" class="mb-4">
            <p class="text-[11px] text-muted-foreground uppercase tracking-[0.04em]">Votre demande de livraison</p>
            <p class="text-lg font-bold text-foreground">{{ commandeEnquete?.destinataire ?? etape.destinataire }}</p>
            <p class="text-[12px] text-muted-foreground"><template v-if="commandeEnquete?.referenceExterne">{{ libelleReference }} {{ commandeEnquete.referenceExterne }} · </template>Ordre {{ voyage.numeroOT || voyage.reference }}</p>
          </div>
          <div :class="L.card" data-enquete-ordonnateur>
            <template v-if="commandeEnquete?.enqueteOrdonnateur">
              <p class="text-[13px] font-medium text-foreground mb-1">Merci pour votre avis !</p>
              <p class="text-[12px] text-muted-foreground">Respect de la demande {{ commandeEnquete.enqueteOrdonnateur.respectOrdre }}/5 · délais {{ commandeEnquete.enqueteOrdonnateur.delais }}/5 · qualité {{ commandeEnquete.enqueteOrdonnateur.qualite }}/5</p>
            </template>
            <p v-else-if="!commandeEnquete || !commandesStore.enqueteProposee(commandeEnquete.id)" class="text-[12px] text-muted-foreground">L'enquête vous sera proposée une fois l'expédition terminée.</p>
            <template v-else>
              <p class="text-[13px] font-medium text-foreground mb-3">Comment s'est passée l'exécution de votre demande ? <span class="text-[11px] font-normal text-muted-foreground">(facultatif)</span></p>
              <div v-for="q in QUESTIONS_ENQUETE" :key="q.cle" class="flex items-center justify-between mb-2">
                <span class="text-[12px] text-muted-foreground">{{ q.libelle }}</span>
                <span class="flex items-center gap-0.5">
                  <button v-for="n in 5" :key="n" class="bg-transparent border-0 cursor-pointer p-0.5" :title="`${n} sur 5`" @click="notesOrd[q.cle] = n">
                    <Star class="w-5 h-5" :class="n <= notesOrd[q.cle] ? 'fill-yellow-400 text-yellow-400' : 'text-border'" />
                  </button>
                </span>
              </div>
              <textarea v-model="commentaireOrd" rows="2" :class="cls.fieldTextarea" placeholder="Un commentaire (facultatif)…" class="mb-2"></textarea>
              <input v-model="nomOrd" :class="cls.fieldInput" placeholder="Votre nom…" class="mb-2.5" />
              <button :class="cls.btnPrimary" class="w-full justify-center" @click="envoyerEnqueteOrd">Envoyer mon avis</button>
            </template>
          </div>
          <p v-if="erreur" class="text-[12px] text-danger mt-3">{{ erreur }}</p>
        </template>

        <template v-else>
          <div :class="L.card" class="mb-4">
            <p class="text-[11px] text-muted-foreground uppercase tracking-[0.04em]">Livraison pour</p>
            <p class="text-lg font-bold text-foreground">{{ etape.destinataire }}</p>
            <p class="text-[13px] text-muted-foreground">{{ etape.adresseLivraison }}</p>
            <div class="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <Package class="w-3.5 h-3.5" /> <template v-if="etape.contenuCommande || etape.produit">{{ etape.contenuCommande || etape.produit }} · </template><template v-if="etape.referenceExterne">{{ libelleReference }} {{ etape.referenceExterne }} · </template>Ordre {{ voyage.numeroOT || voyage.reference }}
            </div>
          </div>

          <!-- Ma livraison : véhicule, conducteur, départ et heure d'arrivée estimée -->
          <div v-if="infosLivraison" :class="L.card" class="mb-4" data-infos-livraison>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
              <span class="text-muted-foreground">Véhicule</span><span class="text-foreground">{{ infosLivraison.vehicule }}</span>
              <span class="text-muted-foreground">Conducteur</span><span class="text-foreground">{{ infosLivraison.conducteur }}</span>
              <template v-if="infosLivraison.depart"><span class="text-muted-foreground">Départ du camion</span><span class="text-foreground">{{ infosLivraison.depart }}</span></template>
              <template v-if="infosLivraison.prevue"><span class="text-muted-foreground">Livraison prévue</span><span class="text-foreground">{{ infosLivraison.prevue }}</span></template>
              <template v-if="infosLivraison.estimee"><span class="text-muted-foreground">Arrivée estimée</span><span class="text-foreground font-semibold" data-arrivee-estimee>{{ infosLivraison.estimee }}<span v-if="infosLivraison.retard" class="block text-[11px] font-normal text-warning">{{ infosLivraison.retard }}</span></span></template>
            </div>
          </div>

          <!-- Commande répartie sur plusieurs camions : ses différentes livraisons -->
          <div v-if="autresParts.length" :class="L.card" class="mb-4" data-livraisons-commande>
            <p class="text-[13px] font-semibold text-foreground mb-2">Votre commande arrive en {{ autresParts.length }} livraisons</p>
            <div v-for="(x, k) in autresParts" :key="x.id" class="flex items-center gap-2 text-[12px] py-1 border-t border-border first-of-type:border-t-0">
              <span class="font-medium text-foreground shrink-0">Livraison {{ k + 1 }}</span>
              <span class="flex-1 min-w-0 text-muted-foreground">{{ x.quantite }}<template v-if="x.camion"> · camion {{ x.camion }}</template><template v-if="x.date"> · le {{ x.date }}</template><template v-if="x.estimee"> · arrivée estimée {{ x.estimee }}</template> · {{ x.etat }}</span>
              <span v-if="x.courante" class="text-[11px] text-primary shrink-0">cette page</span>
              <a v-else-if="x.etapeId" :href="`/suivi/${x.etapeId}`" class="text-[11px] text-primary underline shrink-0">Suivre</a>
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

          <!-- Ce que l'entrepôt a chargé pour moi, seulement ma propre livraison. -->
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
            <div v-if="quantites.length" class="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] mb-2">
              <template v-for="q in quantites" :key="q.libelle">
                <span class="text-muted-foreground">{{ q.libelle }}</span><span class="text-foreground">{{ q.valeur }}</span>
              </template>
            </div>
            <p class="text-[11px] text-muted-foreground">{{ voyage.carburant ? 'Chargé au dépôt le' : "Déclaré par l'entrepôt le" }} {{ fmtDateHeure(voyage.chargementEntrepotLe) }}</p>
          </div>

          <!-- Ordre annulé : la livraison n'aura pas lieu avec cette tournée -->
          <div v-if="annulee" :class="L.card" class="!border-danger/30 bg-danger-bg/30">
            <div class="flex items-center gap-2 text-danger mb-1">
              <CircleX class="w-5 h-5" />
              <p class="text-[13px] font-semibold">Annulée</p>
            </div>
            <p v-if="motifAnnulationClient" class="text-[12px] text-foreground">Motif : {{ motifAnnulationClient }}</p>
          </div>

          <!-- Ma livraison est annulée (à ma demande, par un incident, déviée) ou refusée sur place -->
          <div v-else-if="etape.ligneAnnuleeLe" :class="L.card" class="!border-danger/30 bg-danger-bg/30">
            <div class="flex items-center gap-2 text-danger mb-1">
              <CircleX class="w-5 h-5" />
              <p class="text-[13px] font-semibold">{{ libelleFinLigne(etape) }}</p>
            </div>
            <!-- Annulée par un incident ou déviée : le motif, sans nommer un autre client. -->
            <p class="text-[12px] text-foreground">Motif : {{ etape.incidentBon ? motifIncident : etape.motifAnnulationLigne }}</p>
          </div>

          <!-- Indisponible : la livraison sort de cette tournée et sera replanifiée -->
          <div v-else-if="horsTournee(etape)" :class="L.card" class="!border-warning/30 bg-warning-bg/30">
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
            <p class="text-[13px] font-medium text-foreground mb-1">Serez-vous disponible le {{ jourLivraison }} ?</p>
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

          <div v-else-if="etape.reporteLe" :class="L.card" class="!border-warning/30 bg-warning-bg/30">
            <div class="flex items-center gap-2 text-warning mb-1">
              <Clock class="w-5 h-5" />
              <p class="text-[13px] font-semibold">Livraison reportée</p>
            </div>
            <p class="text-[12px] text-foreground">Motif : {{ etape.motifReport }}</p>
          </div>

          <!-- Le conducteur est sur place mais n'a pas encore déclaré la livraison -->
          <div v-else-if="chauffeurSurPlace" :class="L.card" class="mb-4 !border-info/30">
            <div class="flex items-center gap-2 text-info mb-1">
              <Truck class="w-5 h-5" />
              <p class="text-[13px] font-semibold">Le conducteur est chez vous</p>
            </div>
            <button v-if="!annulationOuverte" class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0 mt-2" @click="annulationOuverte = true">Je refuse la commande</button>
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
              <p class="text-[13px] font-semibold">Contestée</p>
            </div>
            <p class="text-[12px] text-foreground">Vous avez contesté cette livraison.</p>
            <p class="text-[12px] text-foreground">Motif : {{ etape.motifContestation }}</p>
          </div>

          <!-- Confirmation ou contestation faite sans réseau : gardée sur l'appareil, transmise au retour de la connexion -->
          <div v-else-if="peutConfirmer && confirmationEnAttente" :class="L.card" class="mb-4">
            <p v-if="confirmationEnAttente.donnees.contestation != null" class="text-[13px] font-medium text-foreground mb-1">Contestation envoyée : {{ confirmationEnAttente.donnees.contestation }}</p>
            <p v-else class="text-[13px] font-medium text-foreground mb-1">Réception confirmée par {{ confirmationEnAttente.donnees.nomSignataire }}</p>
            <p class="text-[12px] text-muted-foreground flex items-center gap-1.5"><CloudOff class="w-4 h-4" /> Hors réseau : enregistré, sera transmis</p>
          </div>

          <!-- Le conducteur a déclaré : c'est à moi, et à moi seul, de confirmer ou contester -->
          <div v-else-if="peutConfirmer" :class="L.card" class="mb-4 !border-primary/30">
            <p v-if="store.confirmeeTacitement(etape)" class="text-[12px] text-muted-foreground mb-2" data-tacite>Sans réponse de votre part, cette livraison est confirmée tacitement depuis le {{ fmtDateHeure(store.dateConfirmationTacite(etape)) }}.</p>
            <p class="text-[13px] font-medium text-foreground mb-3">Le conducteur déclare vous avoir livré{{ etape.quantiteRecue != null ? ` ${etape.quantiteRecue.toLocaleString('fr-FR')} ${uniteLigne}` : '' }}. Le confirmez-vous ?</p>
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

            <!-- Enquête de satisfaction -->
            <div :class="L.card">
              <template v-if="etape.satisfactionNote == null">
                <p class="text-[13px] font-medium text-foreground mb-3">Comment s'est passée votre livraison ? <span class="text-[11px] font-normal text-muted-foreground">(facultatif)</span></p>
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
            <p v-if="etape.confirmeLe" class="text-[13px] font-medium text-success flex items-center justify-center gap-1.5 mb-2" data-dispo-confirmee><CheckCircle2 class="w-4 h-4" /> Disponibilité confirmée</p>
            <Clock class="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p class="text-[12px] text-muted-foreground">Votre livraison n'est pas encore arrivée sur place.</p>
          </div>

          <p v-if="erreur" class="text-[12px] text-danger mt-3">{{ erreur }}</p>
          <p v-if="conflitConfirmation" class="text-[12px] text-danger mt-3">Votre réponse n'a pas pu être transmise : {{ conflitConfirmation.motif }}</p>

          <!-- Mon bon de livraison : ouvert dès la déclaration du conducteur,
               signé seulement par ma propre confirmation. -->
          <div v-if="etape.eBL" :class="L.card" class="mt-4">
            <div class="flex items-center gap-2 mb-2">
              <FileCheck class="w-4 h-4" :class="etape.receptionConfirmeeClientLe ? 'text-success' : 'text-muted-foreground'" />
              <p class="text-[13px] font-semibold text-foreground">Bon de livraison {{ etape.eBL.reference }}</p>
            </div>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
              <span class="text-muted-foreground">Émis le</span><span class="text-foreground">{{ fmtDateHeure(etape.eBL.emisLe) }}</span>
              <span class="text-muted-foreground">Livré</span><span class="text-foreground">{{ etape.eBL.produit }}</span>
              <template v-if="etape.eBL.quantiteRecue != null"><span class="text-muted-foreground">{{ voyage.carburant ? (uniteLigne === 'L' ? 'Volume livré' : 'Volume livré à 15 °C') : 'Quantité reçue' }}</span><span class="text-foreground">{{ etape.eBL.quantiteRecue.toLocaleString('fr-FR') }} {{ uniteLigne }}</span></template>
              <template v-for="m in etape.eBL.volumes ?? []" :key="m.numero">
                <span class="text-muted-foreground">Compartiment {{ m.numero }}</span><span class="text-foreground">{{ fmtL(m.volumeL) }} dépotés à {{ fmtNombre(m.temperature, ' °C') }}, densité {{ fmtNombre(m.densite) }}, soit {{ fmtL(m.volume15) }} à 15 °C ({{ origineVolume15(m) }})</span>
              </template>
              <span class="text-muted-foreground">Véhicule</span><span class="text-foreground" data-vehicule-bl>{{ store.moyensDe(voyage).vehicule }}</span>
              <template v-if="etape.receptionConfirmeeClientLe && etape.eBL.signePar">
                <span class="text-muted-foreground">Signé par</span><span class="text-foreground">{{ etape.eBL.signePar }}</span>
              </template>
              <template v-else-if="etape.receptionContesteeLe">
                <span class="text-muted-foreground">Signature</span><span class="text-danger font-medium">Non signé, livraison contestée</span>
              </template>
              <template v-else>
                <span class="text-muted-foreground">Signature</span><span class="text-warning font-medium">En attente de votre confirmation</span>
              </template>
            </div>
            <p v-if="etape.eBL.articlesNonLivres?.length" class="text-[11px] text-warning mt-2">Non livré : {{ etape.eBL.articlesNonLivres.map(x => `${x.libelle} (${x.motif})`).join(' · ') }}<template v-if="etape.reliquatDate">. Ils vous seront livrés à partir du {{ fmtJour(etape.reliquatDate) }}.</template></p>
          </div>
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
import { Truck, AlertTriangle, CalendarClock, CloudOff, Package, Check, CheckCircle2, CircleX, Star, Clock, FileCheck } from '@lucide/vue'
import { fileConfirmationsReception } from '../../lib/fileHorsReseau'
import { useVoyagesStore } from '../../stores/voyages'
import { useCommandesStore } from '../../stores/commandes'
import { useParametresPlanificationStore } from '../../stores/parametresPlanification'
import { useControlesTransportStore } from '../../stores/controlesTransport'
import { fmtDateHeure, horsTournee, dansLaTournee, libelleFinLigne } from '../../utils/voyageUtils'
import { useParametresStore } from '../../stores/parametres'
import { heurePrevue, heureEstimee, estEnRetard, retardMinutes, fmtJourHeure, fmtRetard } from '../../lib/horairesLivraison'
import { fmtL, fmtNombre, origineVolume15, totalA15, totalVolume } from '../../lib/volume15'
import type { MesureCompartiment } from '../../types'
import * as cls from '../../lib/formClasses'
import * as L from '../../lib/listClasses'

const route = useRoute()
const store = useVoyagesStore()
const etapeId = String(route.params.etapeId)

const trouve = computed(() => store.trouverLigne(etapeId))
const voyage = computed(() => trouve.value!.voyage)
const etape = computed(() => trouve.value!.etape)
/** Motif d'une livraison annulée par un incident ou déviée : le code motif seul, sans nommer l'autre client. */
const motifIncident = computed(() => etape.value.incidentBon ? useControlesTransportStore().libelleMotif('codesMotif', etape.value.incidentBon.codeMotif) : '')

/** Nom de l'entreprise, repris des paramètres de la société. */
const societe = useParametresStore().societe
const nomEntreprise = computed(() => societe.entite || societe.raisonSociale)
const libelleReference = computed(() => useParametresPlanificationStore().parametres.libelleReferenceExterne)

/** Ordre annulé, sans que la livraison ait été reprise dans un autre ordre. */
const annulee = computed(() => !!trouve.value && voyage.value.statut === 'annule' && !etape.value.dateConfirmeeLe && !etape.value.franchi)
/** Motif donné au client : le libellé du code motif, jamais le commentaire interne. */
const motifAnnulationClient = computed(() => trouve.value ? store.motifClientAnnulation(voyage.value) : undefined)
/** Dates de MA livraison : son heure prévue, jamais la date de l'ordre. */
const prevueLigne = computed(() => trouve.value ? heurePrevue(voyage.value, etape.value) : null)
const jourLivraison = computed(() => trouve.value ? store.jourLivraison(voyage.value, etape.value) : '')
/** Véhicule, conducteur (transporteur externe compris), départ et arrivée estimée de ma livraison. */
const infosLivraison = computed(() => {
  if (!trouve.value || annulee.value) return null
  const v = voyage.value, e = etape.value
  if (v.statut === 'en_attente' || !dansLaTournee(e) || e.franchi || e.reporteLe) return null
  const m = store.moyensDe(v)
  const estimee = e.arriveeLe ? null : heureEstimee(v, e)
  return {
    vehicule: m.vehicule, conducteur: m.conducteur,
    depart: v.dateDepartReel ? fmtJourHeure(new Date(v.dateDepartReel)) : '',
    prevue: prevueLigne.value ? fmtJourHeure(prevueLigne.value) : '',
    estimee: estimee ? fmtJourHeure(estimee) : '',
    retard: estimee && estEnRetard(v, e) ? fmtRetard(retardMinutes(v, e)) : '',
  }
})
const etapesProgres = computed(() => {
  if (!trouve.value) return []
  const v = voyage.value, e = etape.value
  return [
    annulee.value
      ? { cle: 'planifiee', libelle: 'Livraison annulée', detail: motifAnnulationClient.value, atteinte: true }
      : { cle: 'planifiee', libelle: 'Livraison planifiée', detail: jourLivraison.value, atteinte: true },
    /* Une ligne sortie de la tournée ne voit pas le conducteur en route vers elle. */
    { cle: 'en_cours', libelle: 'Conducteur en route', detail: v.statut === 'en_attente' ? undefined : store.moyensDe(v).conducteur, atteinte: !!e.arriveeLe || (!horsTournee(e) && (v.statut === 'en_cours' || v.statut === 'livre' || v.statut === 'cloture' || e.franchi)) },
    { cle: 'arrivee', libelle: 'Conducteur sur place', detail: e.arriveeLe ? fmtDateHeure(e.arriveeLe) : undefined, atteinte: !!e.arriveeLe },
    { cle: 'livree', libelle: 'Réception confirmée par vous', detail: e.receptionConfirmeeClientLe ? fmtDateHeure(e.receptionConfirmeeClientLe) : undefined, atteinte: !!e.receptionConfirmeeClientLe },
  ]
})

function fmtJour(iso?: string) { return iso ? new Date(iso).toLocaleDateString('fr-FR') : '' }
/** Motif d'un refus du store, affiché dans la page. */
const erreur = ref('')

/** Quantités chargées pour moi : celles que porte la ligne, et le nombre
 *  d'unités de la commande dont elle est la livraison. */
const commandesStore = useCommandesStore()
/** Unité de la quantité livrée : litres à 15 °C pour le carburant. */
const uniteLigne = computed(() => trouve.value ? useVoyagesStore().uniteQuantite(voyage.value, etape.value) : useParametresPlanificationStore().parametres.uniteComptage)
const quantites = computed(() => {
  if (!trouve.value) return []
  const e = etape.value
  const cmd = e.commandeId ? commandesStore.getById(e.commandeId) : undefined
  const unite = useParametresPlanificationStore().parametres.uniteComptage
  const out: { libelle: string; valeur: string }[] = []
  /* Carburant : le produit et le volume chargés pour moi, puis le volume livré à 15 °C. */
  if (voyage.value.carburant) {
    const bsl = voyage.value.carburant.bonEnlevement?.bsl?.mesures ?? []
    const comps = voyage.value.carburant.plan.filter(x => (x.commandeId === e.commandeId || (e.bonLivraison?.statut === 'devie' && x.commandeOrigineId === e.commandeId)) && !x.nonCharge)
    const mes = comps.map(x => bsl.find(m => m.numero === x.numero)).filter((m): m is MesureCompartiment => !!m)
    out.push({ libelle: 'Produit', valeur: e.produit ?? '' })
    if (mes.length === comps.length && mes.every(m => m.volumeL != null)) out.push({ libelle: 'Volume chargé', valeur: fmtL(totalVolume(mes)) })
    else if (comps.length) out.push({ libelle: 'Volume prévu', valeur: fmtL(comps.reduce((s, x) => s + (x.volumeL ?? 0), 0)) })
    if (mes.length === comps.length && mes.length && mes.every(m => m.volume15 != null)) out.push({ libelle: 'Volume chargé à 15 °C', valeur: fmtL(totalA15(mes)) })
    if (e.mesuresDepotees?.length) {
      const depotees = e.mesuresDepotees.filter(m => (m.volumeL ?? 0) > 0)
      if (depotees.every(m => m.volume15 != null)) out.push({ libelle: 'Volume livré à 15 °C', valeur: fmtL(totalA15(depotees)) })
    }
    return out
  }
  /* Commande en plusieurs parts : la quantité de cette livraison, celle de sa part. */
  const enParts = !!e.commandeId && !!commandesStore.rangPart(e.commandeId)
  if (cmd?.nombreUnites != null) out.push({ libelle: enParts ? 'Quantité de cette livraison' : 'Quantité commandée', valeur: `${cmd.nombreUnites.toLocaleString('fr-FR')} ${unite}` })
  if (e.quantiteChargee != null && e.quantiteChargee !== cmd?.nombreUnites) out.push({ libelle: 'Quantité chargée', valeur: `${e.quantiteChargee.toLocaleString('fr-FR')} ${unite}` })
  if (e.poidsKg != null) out.push({ libelle: 'Poids', valeur: `${e.poidsKg.toLocaleString('fr-FR')} kg` })
  if (e.volumeM3) out.push({ libelle: 'Volume', valeur: `${e.volumeM3.toLocaleString('fr-FR')} m³` })
  return out
})

/** Commande répartie en plusieurs livraisons (plusieurs camions) : chacune avec sa quantité, son camion et son état. */
const autresParts = computed(() => {
  if (!trouve.value || !etape.value.commandeId) return []
  const parts = commandesStore.partsDe(etape.value.commandeId).filter(x => x.statut !== 'annulee' || x.id === etape.value.commandeId)
  if (parts.length < 2) return []
  return parts.map(x => {
    const v = x.voyageId ? store.getById(x.voyageId) : undefined
    const e = v?.etapes.find(l => l.commandeId === x.id)
    const quantite = x.volumeL ? fmtL(x.volumeL) : `${x.poidsKg.toLocaleString('fr-FR')} kg`
    const etat = x.statut === 'annulee' ? 'annulée' : !e ? 'à planifier' : e.receptionConfirmeeClientLe ? 'réception confirmée' : e.franchi ? 'livrée, à confirmer' : e.ligneAnnuleeLe ? 'annulée' : horsTournee(e) ? 'à replanifier' : 'planifiée'
    /* Chaque part a sa date et son heure estimée, celles de sa propre livraison. */
    const prevue = v && e ? heurePrevue(v, e) : null
    const estimee = v && e && !e.arriveeLe && v.statut !== 'en_attente' ? heureEstimee(v, e) : null
    const camion = v ? (v.moyen === 'externe' ? store.moyensDe(v).vehicule : v.vehiculePlaque) : undefined
    return { id: x.id, quantite, camion, date: prevue ? prevue.toLocaleDateString('fr-FR') : '', estimee: estimee ? fmtJourHeure(estimee) : '', etat, etapeId: e?.id, courante: x.id === etape.value.commandeId }
  })
})

/** Avant le chargement, le destinataire peut confirmer sa disponibilité, ou
 *  signaler qu'il n'est pas disponible en disant à partir de quand il le
 *  sera - sans avoir à passer par un appel, mais l'appel du planificateur
 *  reste possible : les deux chemins passent par les mêmes fonctions. */
const aConfirmerDispo = computed(() => !!trouve.value && voyage.value.statut === 'planifie' && voyage.value.confirmationRequise !== false
  && !!etape.value.destinataire && dansLaTournee(etape.value) && !etape.value.confirmeLe && !etape.value.indisponibleLe)
const dispoOuverte = ref(false)
const motifIndispo = ref('')
const dateIndispo = ref('')
/** Toute réponse refusée par le store affiche son motif dans la page. */
function retour(res: { ok: boolean; motif?: string }) {
  erreur.value = res.ok ? '' : (res.motif ?? '')
  return res.ok
}
function confirmerDisponibilite() {
  retour(store.confirmerClient(voyage.value.id, etape.value.id))
}
function signalerIndisponibilite() {
  if (!motifIndispo.value.trim()) return
  if (!retour(store.declarerIndisponible(voyage.value.id, etape.value.id, motifIndispo.value.trim(), dateIndispo.value || undefined))) return
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
  if (!res.ok) { erreur.value = res.motif ?? ''; return }
  erreur.value = ''
  proposerOuvert.value = false
}
/** Secours seulement, si le planificateur a dû proposer une date faute
 *  d'avoir eu la mienne. */
const autreDateOuverte = ref(false)
const autreDate = ref('')
function accepterDate() { retour(store.confirmerNouvelleDate(voyage.value.id, etape.value.id)) }
function refuserDate() {
  if (!autreDate.value) return
  if (!retour(store.refuserNouvelleDate(voyage.value.id, etape.value.id, autreDate.value))) return
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
/* Sans réseau, la confirmation est gardée sur l'appareil et transmise
   d'elle-même au retour de la connexion. */
const fileConf = fileConfirmationsReception()
const confirmationEnAttente = computed(() => fileConf.enAttente(`reception:${etapeId}`))
const conflitConfirmation = computed(() => fileConf.conflit(`reception:${etapeId}`))
function confirmer() {
  if (!trouve.value || !nomConfirmation.value.trim() || confirmationEnAttente.value) return
  const res = fileConf.soumettre(`reception:${etapeId}`, { voyageId: voyage.value.id, etapeId: etape.value.id, nomSignataire: nomConfirmation.value.trim() }, etape.value.destinataire ?? '')
  erreur.value = res.ok ? '' : (res.motif ?? '')
}
const contestationOuverte = ref(false)
const motifContestation = ref('')
/* Sans réseau, la contestation est gardée sur l'appareil, dans la même file que la confirmation. */
function contester() {
  if (!trouve.value || confirmationEnAttente.value) return
  if (!motifContestation.value.trim()) { erreur.value = 'Expliquez ce qui ne va pas.'; return }
  const res = fileConf.soumettre(`reception:${etapeId}`, { voyageId: voyage.value.id, etapeId: etape.value.id, nomSignataire: '', contestation: motifContestation.value.trim() }, etape.value.destinataire ?? '')
  if (!res.ok) { erreur.value = res.motif ?? ''; return }
  erreur.value = ''
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
  const res = store.annulerLigne(voyage.value.id, etape.value.id, motifAnnulation.value.trim(), true, 'destinataire')
  if (!res.ok) { erreur.value = res.motif ?? ''; return }
  erreur.value = ''
  annulationOuverte.value = false
  motifAnnulation.value = ''
}

/* ── Enquête de l'ordonnateur, ouverte par son lien (?enquete=ordonnateur) ── */
const modeEnquete = computed(() => !!trouve.value && route.query.enquete === 'ordonnateur')
const commandeEnquete = computed(() => {
  const id = trouve.value?.etape.commandeId
  const c = id ? commandesStore.getById(id) : undefined
  return c ? commandesStore.getById(commandesStore.racine(c)) ?? c : undefined
})
const QUESTIONS_ENQUETE = [
  { cle: 'respectOrdre', libelle: 'Respect de la demande' },
  { cle: 'delais', libelle: 'Respect des délais' },
  { cle: 'qualite', libelle: 'Qualité attendue' },
] as const
const notesOrd = ref({ respectOrdre: 0, delais: 0, qualite: 0 })
const commentaireOrd = ref('')
const nomOrd = ref('')
function envoyerEnqueteOrd() {
  if (!commandeEnquete.value) return
  retour(commandesStore.repondreEnqueteOrdonnateur(commandeEnquete.value.id, { ...notesOrd.value, commentaire: commentaireOrd.value }, nomOrd.value, true))
}

const noteChoisie = ref(0)
const commentaire = ref('')
function envoyerSatisfaction() {
  if (!noteChoisie.value) return
  retour(store.repondreSatisfaction(etape.value.id, noteChoisie.value, commentaire.value))
}
</script>
