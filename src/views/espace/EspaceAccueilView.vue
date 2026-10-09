<template>
  <div :class="L.pageWrap" class="max-w-[900px]">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Ma situation</div>
        <div :class="L.pageSub">{{ auth.user?.nom }} · {{ dateDuJour }}</div>
      </div>
    </div>

    <!-- Ma tournée : plus d'étape de validation de ma part, je suis seulement
         notifié de la tournée qui m'a été confiée. Signer ma première
         livraison la fait elle-même passer de planifiée à en cours. -->
    <!-- Notifications reçues pour mes tournées (confiée, annulée) -->
    <div v-if="mesNotifications.length" :class="L.card" class="mb-3">
      <p class="text-[13px] font-semibold text-foreground flex items-center gap-1.5 mb-2"><Bell class="w-4 h-4 text-primary" /> Mes notifications</p>
      <div v-for="(n, i) in mesNotifications" :key="i" class="flex items-start gap-2 py-1.5 border-t border-border first:border-t-0 text-[12px]">
        <span class="text-muted-foreground shrink-0 w-[112px]">{{ fmtDateHeure(n.le) }}</span>
        <span class="text-foreground">{{ n.message }}</span>
      </div>
    </div>

    <!-- Persiste indépendamment de la tournée qui les portait, terminée ou non. -->
    <div v-if="mesArticlesARapporter.length" class="rounded-lg border border-warning/30 bg-warning-bg px-4 py-3 mb-3">
      <p class="text-[13px] font-semibold text-warning flex items-center gap-1.5 mb-2"><ShieldAlert class="w-4 h-4" /> Articles à rapporter à l'entrepôt</p>
      <div v-for="r in mesArticlesARapporter" :key="r.etape.id" class="flex items-center gap-3 py-1.5 border-t border-warning/20 first:border-t-0">
        <div class="flex-1 min-w-0 text-[12px]">
          <span class="text-foreground font-medium">{{ r.etape.destinataire }}</span>
          <span class="text-muted-foreground"> · {{ r.voyage.numeroOT || r.voyage.reference }} · {{ r.etape.eBL?.articlesNonLivres?.map(a => a.libelle).join(', ') }}</span>
        </div>
        <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="confirmerArticlesRapportes(r.voyage.id, r.etape.id)">Remis à l'entrepôt</button>
      </div>
    </div>

    <div v-if="maTournee" :class="L.card" class="mb-3 !border-primary/30">
      <div :class="L.cardTitle">
        <Truck class="w-4 h-4 text-primary" />
        {{ maTournee.statut === 'planifie' ? 'Ma tournée à venir' : maTournee.statut === 'confirme' ? 'Ma tournée : chargement' : maTournee.statut === 'pret' ? 'Ma tournée prête à démarrer' : 'Ma tournée en cours' }}
        <span v-if="maTournee.statut === 'pret' || maTournee.statut === 'en_cours'" class="ml-auto text-[11px] font-normal text-muted-foreground">
          {{ lignesTriees.filter(e => e.franchi).length }}/{{ lignesTriees.length }} livraisons signées
        </span>
      </div>

      <template v-if="maTournee.statut === 'planifie'">
        <p class="text-[12px] text-muted-foreground mb-3">
          <span class="font-mono font-semibold text-foreground">{{ maTournee.numeroOT || maTournee.reference }}</span> ·
          prévue le {{ fmtDateHeure(maTournee.datePlanifiee) }}. Les destinataires sont en cours d'appel pour confirmer
          leur disponibilité ; rien à faire de mon côté pour l'instant.
        </p>
        <div class="flex flex-col gap-1">
          <div v-for="l in lignesTriees" :key="l.id" class="text-[13px] text-muted-foreground px-3 py-1.5">{{ l.destinataire ?? l.siteNom }}</div>
        </div>
      </template>

      <template v-else-if="maTournee.statut === 'confirme'">
        <p class="text-[12px] text-muted-foreground mb-3">
          <span class="font-mono font-semibold text-foreground">{{ maTournee.numeroOT || maTournee.reference }}</span> ·
          <template v-if="maTournee.confirmationRequise === false">cet ordre ne nécessite pas d'appel de confirmation.</template>
          <template v-else>tous les destinataires ont confirmé leur disponibilité.</template>
          Une fois l'entrepôt chargé, je contrôle et valide à mon tour avant de démarrer.
        </p>
        <div v-if="!maTournee.chargementEntrepotLe" class="flex items-center gap-2 text-[12px] text-muted-foreground italic">
          <Clock class="w-4 h-4 shrink-0" /> En attente du chargement par l'entrepôt.
        </div>
        <div v-else class="bg-info-bg rounded-md px-3 py-3">
          <p class="text-[12px] text-foreground mb-2">L'entrepôt déclare avoir chargé, le {{ fmtDateHeure(maTournee.chargementEntrepotLe) }}. Je contrôle destinataire par destinataire :</p>
          <div class="flex flex-col gap-2">
            <div v-for="l in lignesTriees" :key="l.id" class="rounded-md bg-card px-3 py-2">
              <div class="flex items-center gap-2">
                <div class="flex-1 min-w-0 text-[12px]">
                  <span class="text-muted-foreground">{{ l.destinataire ?? l.siteNom }} :</span>
                  <span class="text-foreground">&nbsp;{{ l.contenuCharge }}</span>
                </div>
                <span v-if="l.chargementConformeLe" class="text-[11px] text-success font-medium shrink-0">Conforme</span>
                <template v-else-if="nonConformeLigne !== l.id">
                  <button class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0 shrink-0" @click="nonConformeLigne = l.id">Non conforme</button>
                  <button :class="clsForm.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="controlerLigne(l.id, true)">Conforme</button>
                </template>
              </div>
              <div v-if="nonConformeLigne === l.id" class="flex items-center gap-2 mt-2">
                <input v-model="motifNonConforme" :class="clsForm.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Ce qui ne correspond pas à ce que l'entrepôt déclare…" />
                <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="nonConformeLigne = null; motifNonConforme = ''">Renoncer</button>
                <button :class="clsForm.btnPrimary" class="!bg-danger hover:!bg-danger/90 !py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motifNonConforme.trim()" @click="controlerLigne(l.id, false)">Signaler</button>
              </div>
            </div>
          </div>
          <p v-if="!lignesTriees.length" class="text-[12px] text-muted-foreground italic">Plus aucune ligne conforme dans cette tournée : en attente de la décision du planificateur.</p>
          <div v-if="lignesTriees.some(l => !l.chargementConformeLe) && nonConformeLigne === null" class="mt-3">
            <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="validerChargement">Tout est conforme</button>
          </div>
          <div v-for="l in lignesNonConformes" :key="l.id" class="flex items-start gap-2 rounded-md px-3 py-2 mt-2 bg-warning-bg text-warning text-[12px]">
            <AlertTriangle class="w-4 h-4 shrink-0 mt-px" />
            <span>J'ai signalé une non-conformité pour {{ l.destinataire ?? l.siteNom }} : {{ l.motifNonConformite }}. Cette ligne sort de la tournée, les autres partent.</span>
          </div>
        </div>
      </template>

      <template v-else>
        <p class="text-[12px] text-muted-foreground mb-3">
          <span class="font-mono font-semibold text-foreground">{{ maTournee.numeroOT || maTournee.reference }}</span> ·
          <template v-if="maTournee.statut === 'pret'">le chargement est validé, prêt à démarrer.</template>
          <template v-else>déclarez chaque livraison effectuée, dans l'ordre ; chaque client confirme ensuite lui-même la réception depuis son lien de suivi.</template>
          Aucune livraison ne peut être sautée.
        </p>
      <div class="flex flex-col gap-1.5">
        <div v-for="(e, i) in lignesTriees" :key="e.id" class="rounded-md px-3 py-2.5"
             :class="e.franchi ? 'bg-success-bg' : e.ligneAnnuleeLe ? 'bg-danger-bg' : e.reporteLe ? 'bg-warning-bg' : e.arriveeLe ? 'bg-info-bg' : 'bg-background'">
          <div class="flex items-center gap-2.5">
            <component :is="e.franchi ? CircleCheck : e.ligneAnnuleeLe ? CircleX : e.reporteLe ? Clock : e.arriveeLe ? MapPinCheck : Circle" class="w-4 h-4 shrink-0"
                       :class="e.franchi ? 'text-success' : e.ligneAnnuleeLe ? 'text-danger' : e.reporteLe ? 'text-warning' : e.arriveeLe ? 'text-info' : 'text-muted-foreground'" />
            <span class="text-[11px] font-semibold text-muted-foreground w-5">{{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <span class="text-[13px] text-foreground">{{ e.destinataire ?? e.siteNom }}</span>
              <span v-if="e.destinataire" class="text-[11px] text-muted-foreground"> · {{ e.adresseLivraison }}</span>
              <span v-else class="text-[11px] text-muted-foreground"> · transfert interne</span>
              <p v-if="e.contenuCharge || e.contenuCommande" class="text-[11px] text-muted-foreground truncate">{{ e.contenuCharge ?? e.contenuCommande }}</p>
            </div>

            <span v-if="e.franchi && !e.destinataire" class="text-[11px] text-success font-medium shrink-0">Passage confirmé</span>
            <span v-else-if="e.franchi && e.receptionConfirmeeClientLe" class="text-[11px] text-success font-medium shrink-0">Réception confirmée par le client{{ e.eBL?.articlesNonLivres?.length ? ' (partielle)' : '' }}</span>
            <span v-else-if="e.franchi" class="text-[11px] text-warning font-medium shrink-0">Livraison déclarée, en attente du client</span>
            <span v-else-if="e.ligneAnnuleeLe" class="text-[11px] text-danger font-medium shrink-0">Annulée par le client</span>
            <span v-else-if="e.reporteLe" class="text-[11px] text-warning font-medium shrink-0">Reportée</span>

            <button v-else-if="!e.arriveeLe && peutArriver(i)" :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="arriver(e.id)">
              <MapPinCheck class="w-3.5 h-3.5" /> Marquer l'arrivée
            </button>
            <span v-else-if="!e.arriveeLe" class="text-[11px] text-muted-foreground italic shrink-0">En attente du point précédent</span>

            <template v-else-if="!e.destinataire">
              <button :class="clsForm.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="confirmerSignature(e.id)">Confirmer le passage</button>
            </template>
            <button v-else-if="ligneEnSignature !== e.id && !problemeOuvertPour(e.id)" :class="clsForm.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="ouvrirSignature(e)">Déclarer la livraison</button>
          </div>

          <p v-if="e.arriveeLe && !e.franchi && e.destinataire && !e.reporteLe && !e.ligneAnnuleeLe" class="text-[11px] text-info mt-1 pl-[26px]">Arrivé sur place : remettez la marchandise, puis déclarez la livraison.</p>
          <p v-if="e.franchi && e.eBL?.articlesNonLivres?.length" class="text-[11px] text-warning mt-1 pl-[26px]">
            À rapporter à l'entrepôt : {{ e.eBL.articlesNonLivres.map(a => `${a.libelle} (${a.motif})`).join(' · ') }}
          </p>
          <p v-if="e.reporteLe && !e.ligneAnnuleeLe" class="text-[11px] text-warning mt-1 pl-[26px]">{{ e.motifReport }}</p>
          <p v-if="e.ligneAnnuleeLe" class="text-[11px] text-danger mt-1 pl-[26px]">{{ e.motifAnnulationLigne }}</p>

          <!-- Reprendre un point reporté -->
          <div v-if="e.reporteLe && !e.franchi && !e.ligneAnnuleeLe" class="mt-2 pl-[26px]">
            <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="reprendre(e.id)">Retenter ce point maintenant</button>
          </div>

          <!-- Signature en cours -->
          <div v-if="ligneEnSignature === e.id && e.destinataire" class="flex flex-col gap-2 mt-2.5 pl-[26px]">
            <SaisieArticles v-if="e.articles?.length" :key="e.id" :articles="e.articles" @change="saisieArticles = $event" />
            <p class="text-[11px] text-muted-foreground">Cette déclaration fait avancer ma tournée. Elle ne remplace pas la confirmation du client, qu'il donne lui-même depuis son lien de suivi.</p>
            <div class="flex items-center gap-2">
              
              <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="ligneEnSignature = null">Renoncer</button>
              <button :class="clsForm.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!!e.articles?.length && !saisieArticles.valide" @click="confirmerSignature(e.id)">Déclarer la livraison effectuée signature</button>
            </div>
          </div>

          <!-- Point atteint mais livraison impossible : un seul point d'entrée, qui ouvre le
               choix entre les deux issues, pour ne jamais présenter deux actions à plat. -->
          <div v-if="e.arriveeLe && !e.franchi && e.destinataire && !e.reporteLe && !e.ligneAnnuleeLe && ligneEnSignature !== e.id && !problemeOuvertPour(e.id)" class="mt-2 pl-[26px]">
            <button class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="actionSecondaireOuverte = `choix-${e.id}`">Signaler un problème avec cette livraison</button>
          </div>
          <div v-if="actionSecondaireOuverte === `choix-${e.id}`" class="flex flex-col gap-1.5 mt-2 pl-[26px]">
            <button class="text-[11px] text-left text-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="actionSecondaireOuverte = `report-client-${e.id}`">Le client est fermé ou absent - je retenterai plus tard</button>
            <button class="text-[11px] text-left text-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="actionSecondaireOuverte = `report-anomalie-${e.id}`">Anomalie constatée sur l'article à la livraison - je retenterai plus tard</button>
            <button class="text-[11px] text-left text-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="actionSecondaireOuverte = `retour-${e.id}`">Le client demande de reporter à une autre date - la marchandise retourne à l'entrepôt</button>
            <button class="text-[11px] text-left text-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="actionSecondaireOuverte = `annule-${e.id}`">Le client refuse la commande - définitif</button>
            <button class="text-[11px] text-left text-muted-foreground bg-transparent border-0 cursor-pointer p-0" @click="actionSecondaireOuverte = null">Renoncer</button>
          </div>
          <div v-if="actionSecondaireOuverte === `report-client-${e.id}` || actionSecondaireOuverte === `report-anomalie-${e.id}`" class="flex items-center gap-2 mt-2 pl-[26px]">
            <input v-model="motifSecondaire" :class="clsForm.fieldInput" class="!h-[32px] !text-[12px]"
                   :placeholder="actionSecondaireOuverte === `report-anomalie-${e.id}` ? 'Quelle anomalie sur l\'article…' : 'Motif du report…'" />
            <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="actionSecondaireOuverte = null; motifSecondaire = ''">Renoncer</button>
            <button :class="clsForm.btnPrimary" class="!bg-warning hover:!bg-warning/90 !py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motifSecondaire.trim()" @click="reporter(e.id)">Reporter ce point</button>
          </div>
          <div v-if="actionSecondaireOuverte === `retour-${e.id}`" class="flex flex-col gap-2 mt-2 pl-[26px]">
            <input v-model="motifSecondaire" :class="clsForm.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Motif du report demandé par le client…" />
            <div class="flex items-center gap-2">
              <label class="text-[11px] text-muted-foreground shrink-0">Le client peut être livré à partir du</label>
              <input v-model="dateRetour" type="date" :class="clsForm.fieldInput" class="!h-[32px] !text-[12px] max-w-[170px]" />
              <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0 ml-auto" @click="actionSecondaireOuverte = null; motifSecondaire = ''; dateRetour = ''">Renoncer</button>
              <button :class="clsForm.btnPrimary" class="!bg-warning hover:!bg-warning/90 !py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motifSecondaire.trim()" @click="reporterRetour(e.id)">Retour à l'entrepôt</button>
            </div>
          </div>
          <div v-if="actionSecondaireOuverte === `annule-${e.id}`" class="flex flex-col gap-1.5 mt-2 pl-[26px]">
            <p class="text-[11px] text-muted-foreground">Je signale, en tant que chauffeur, que ce client refuse la commande.</p>
            <div class="flex items-center gap-2">
              <input v-model="motifSecondaire" :class="clsForm.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Pourquoi le client refuse-t-il la commande ?…" />
              <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="actionSecondaireOuverte = null; motifSecondaire = ''">Renoncer</button>
              <button :class="clsForm.btnPrimary" class="!bg-danger hover:!bg-danger/90 !py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motifSecondaire.trim()" @click="annulerLigneChauffeur(e.id)">Confirmer le refus</button>
            </div>
          </div>
        </div>
      </div>
      </template>
      <div v-if="marqueursItineraire.length" class="rounded-lg overflow-hidden border border-border mt-3">
        <FleetMap :marqueurs="marqueursItineraire" height="200px" />
      </div>
      <div v-for="l in lignesRetour" :key="l.id" class="flex items-start gap-2 rounded-md px-3 py-2 mt-2 bg-warning-bg text-warning text-[12px]">
        <AlertTriangle class="w-4 h-4 shrink-0 mt-px" />
        <span>La marchandise de {{ l.destinataire }} retourne à l'entrepôt : {{ l.motifRetour }}.</span>
      </div>
      <p v-if="lignesTriees.length && lignesTriees.every(e => e.franchi || e.ligneAnnuleeLe)" class="text-[12px] text-success font-medium mt-3 flex items-center gap-1.5">
        <CircleCheck class="w-4 h-4" /> Toutes les livraisons sont réglées, cette tournée vient de se terminer.
      </p>
      <p v-if="maTournee.statut === 'en_cours'" class="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/60">
        Les contrôles de route (checklist, remontée d'anomalie) que je dois aussi faire au long du trajet
        restent à rattacher à cette tournée : l'écran de saisie sur le terrain n'est pas encore construit.
      </p>
    </div>

    <!-- Aptitude à partir -->
    <div
      class="rounded-lg p-5 mb-3 border"
      :class="apte ? 'bg-success-bg border-success/25' : 'bg-danger-bg border-danger/25'"
    >
      <div class="flex items-start gap-3">
        <component :is="apte ? CircleCheck : CircleX" class="w-6 h-6 shrink-0 mt-0.5"
                   :class="apte ? 'text-success' : 'text-danger'" />
        <div>
          <div class="text-[17px] font-bold" :class="apte ? 'text-success' : 'text-danger'">
            {{ apte ? 'Vous pouvez prendre un camion' : 'Vous ne pouvez pas prendre de camion' }}
          </div>
          <p class="text-[13px] mt-1 leading-relaxed" :class="apte ? 'text-success/85' : 'text-danger/85'">
            <template v-if="apte">
              Votre habilitation est enregistrée et vos pièces sont valides.
              Présentez-vous au maintenancier pour la vérification de l'état du camion.
            </template>
            <template v-else>
              {{ motifBlocage }}
              Rapprochez-vous du responsable flotte pour régulariser.
            </template>
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">

      <!-- Mes pièces -->
      <div :class="L.card">
        <div :class="L.cardTitle"><FileText class="w-4 h-4 text-primary" /> Mes pièces</div>
        <div class="flex flex-col gap-2.5">
          <div v-for="d in mesDocs" :key="d.id" class="flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <div class="text-[13px] font-medium">{{ d.libelle }}</div>
              <div class="text-[11px] text-muted-foreground">
                {{ d.dateExpiration ? `Expire le ${formatDate(d.dateExpiration)}` : 'Sans échéance' }}
              </div>
            </div>
            <StatusPill v-if="d.dateExpiration" :statut="docs.etat(d)" />
            <span v-else class="text-xs text-muted-foreground">·</span>
          </div>

          <div v-for="t in manquantes" :key="t" class="flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <div class="text-[13px] font-medium text-danger">{{ LIBELLE_TYPE_DOC[t] }}</div>
              <div class="text-[11px] text-danger/80">Pièce obligatoire non déposée</div>
            </div>
            <StatusPill statut="absent" />
          </div>
        </div>
      </div>

      <!-- Mes responsabilités -->
      <div :class="L.card">
        <div :class="L.cardTitle"><ListChecks class="w-4 h-4 text-primary" /> Ce que j'ai à faire</div>
        <ul class="flex flex-col gap-1.5">
          <li v-for="(r, i) in responsabilites" :key="i" class="flex gap-2 text-[12px] leading-snug">
            <span class="text-primary shrink-0 mt-0.5">•</span><span>{{ r }}</span>
          </li>
        </ul>
        <p class="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">
          Extrait de la procédure de gestion des flottes UCD-TRUCK-FLOT-001.
        </p>
      </div>
    </div>

    <!-- Rappel des règles de conduite -->
    <div :class="L.card" class="mt-3">
      <div :class="L.cardTitle"><Clock class="w-4 h-4 text-primary" /> Les limites en vigueur</div>
      <div class="grid grid-cols-3 gap-3 max-md:grid-cols-1">
        <div class="bg-background rounded-lg p-3.5 text-center">
          <div class="text-2xl font-bold">{{ params.valeurs.conduiteMaxJournaliereH }} h</div>
          <div class="text-[11px] text-muted-foreground mt-1">Conduite maximale par jour</div>
        </div>
        <div class="bg-background rounded-lg p-3.5 text-center">
          <div class="text-2xl font-bold">{{ params.valeurs.reposMinJournalierH }} h</div>
          <div class="text-[11px] text-muted-foreground mt-1">Repos minimal par jour</div>
        </div>
        <div class="bg-background rounded-lg p-3.5 text-center">
          <div class="text-2xl font-bold">{{ params.valeurs.conduiteMaxHebdoH }} h</div>
          <div class="text-[11px] text-muted-foreground mt-1">Conduite maximale par semaine</div>
        </div>
      </div>
    </div>

    <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed">
      Les check-lists et le carnet de bord arriveront ici une fois le module Maintenance et le carnet de
      bord construits.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { AlertTriangle, Bell, CircleCheck, ShieldAlert, Circle, CircleX, Clock, FileText, ListChecks, MapPinCheck, Truck } from '@lucide/vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import * as L from '../../lib/listClasses'
import * as clsForm from '../../lib/formClasses'
import { formatDate } from '../../utils/helpers'
import { fmtDateHeure, horsTournee } from '../../utils/voyageUtils'
import SaisieArticles from '../../components/flotte/SaisieArticles.vue'
import FleetMap from '../../components/flotte/FleetMap.vue'
import { useAuthStore } from '../../stores/auth'
import { usePersonnelStore } from '../../stores/personnel'
import { useFonctionStore } from '../../stores/fonctions'
import { useDocumentsStore, LIBELLE_TYPE_DOC } from '../../stores/documentsPersonnel'
import { useParametresStore } from '../../stores/parametres'
import { useVoyagesStore } from '../../stores/voyages'
import { aujourdhuiDate } from '../../utils/horloge'

const auth = useAuthStore()
const personnel = usePersonnelStore()
const fonctions = useFonctionStore()
const docs = useDocumentsStore()
const params = useParametresStore()
const voyages = useVoyagesStore()

const dateDuJour = aujourdhuiDate().toLocaleDateString('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

const moi = computed(() => (auth.user?.personnelId ? personnel.parId(auth.user.personnelId) : null))
const mesDocs = computed(() => (moi.value ? docs.parPersonnel(moi.value.id) : []))
const manquantes = computed(() => (moi.value ? docs.piecesManquantes(moi.value.id) : []))
const responsabilites = computed(() =>
  moi.value ? fonctions.parId(moi.value.fonctionId)?.responsabilites ?? [] : [],
)

const apte = computed(() => !!moi.value && moi.value.habilite && docs.enRegle(moi.value.id))

const motifBlocage = computed(() => {
  if (!moi.value) return ''
  if (!moi.value.habilite) return "Votre habilitation n'est pas enregistrée."
  return 'Une de vos pièces obligatoires est expirée ou absente.'
})

/* ── Ma tournée : planifiée ou déjà en cours, peu importe - je ne fais
     que déclarer chaque livraison effectuée,
     dans l'ordre. Signer la première la fait elle-même passer en
     cours, sans étape de validation à part. Deux gestes distincts par
     point : marquer l'arrivée d'abord, puis recueillir la signature du
     destinataire - ou confirmer directement pour un transfert interne,
     qui n'a personne à faire signer. ──────────────────────────────── */
const maTournee = computed(() =>
  moi.value ? [...voyages.planifies, ...voyages.confirmes, ...voyages.prets, ...voyages.enCoursKanban].find(v => v.chauffeurId === moi.value!.id) ?? null : null)
/** Persiste indépendamment de la tournée qui les portait, terminée ou non :
 *  sans ça, le rappel disparaîtrait avec la carte de la tournée une fois
 *  celle-ci close. */
/** Les cinq dernières notifications reçues, toutes tournées confondues. */
const mesNotifications = computed(() => moi.value ? voyages.voyages
  .filter(v => v.chauffeurId === moi.value!.id)
  .flatMap(v => v.notificationsChauffeur ?? [])
  .sort((a, b) => b.le.localeCompare(a.le)).slice(0, 5) : [])
const mesArticlesARapporter = computed(() => moi.value ? voyages.articlesARapporter.filter(r => r.voyage.chauffeurId === moi.value!.id) : [])
function confirmerArticlesRapportes(voyageId: string, etapeId: string) {
  const res = voyages.confirmerArticlesRapportes(voyageId, etapeId)
  if (!res.ok) alert(res.motif)
}
/** Une ligne dont le destinataire s'est déclaré indisponible avant chargement
 *  est sortie de la tournée : le chauffeur ne la voit pas, elle ne compte
 *  ni dans sa progression ni dans sa livraison. */
const lignesTriees = computed(() => maTournee.value ? [...maTournee.value.etapes].filter(e => !horsTournee(e)).sort((a, b) => a.ordre - b.ordre) : [])
/** Itinéraire de la tournée sur une carte : le chauffeur peut visualiser
 *  le circuit dès que la tournée lui est confiée, pour s'y préparer. */
const marqueursItineraire = computed(() => lignesTriees.value.map((l, i) => ({
  id: l.id, lat: l.lat, lng: l.lng, libelle: `${i + 1}. ${l.destinataire ?? l.siteNom}`,
  couleur: l.franchi ? '#16a34a' : l.ligneAnnuleeLe ? '#dc2626' : '#94a3b8', numero: i + 1,
})))

/** L'arrivée sur un point n'est possible que si le précédent est déjà signé. */
function peutArriver(index: number) {
  return lignesTriees.value.slice(0, index).every(e => e.franchi || e.reporteLe || e.ligneAnnuleeLe)
}
function arriver(etapeId: string) {
  if (!maTournee.value) return
  const res = voyages.marquerArrivee(maTournee.value.id, etapeId)
  if (!res.ok) alert(res.motif)
}

/** Le chauffeur contrôle et valide à son tour le chargement déjà
 *  déclaré par l'entrepôt : la tournée ne passe Prêt pour exécution
 *  que lorsque les deux ont validé. */
/** Le chauffeur contrôle chaque destinataire par rapport à ce que l'entrepôt
 *  déclare pour lui. Un destinataire non conforme est signalé avec un motif
 *  et sort de la tournée, sans jamais empêcher les autres de partir. */
const nonConformeLigne = ref<string | null>(null)
const motifNonConforme = ref('')
const lignesNonConformes = computed(() => (maTournee.value?.etapes ?? []).filter(e => e.chargementNonConformeLe))
function controlerLigne(etapeId: string, conforme: boolean) {
  if (!maTournee.value) return
  const res = voyages.controlerLigneChargement(maTournee.value.id, etapeId, conforme, motifNonConforme.value)
  if (!res.ok) { alert(res.motif); return }
  nonConformeLigne.value = null
  motifNonConforme.value = ''
}
function validerChargement() {
  if (!maTournee.value) return
  const res = voyages.validerChargementChauffeur(maTournee.value.id)
  if (!res.ok) alert(res.motif)
}

const ligneEnSignature = ref<string | null>(null)
/** Je déclare avoir effectué la livraison : ça fait avancer ma tournée,
 *  sans jamais valoir confirmation du client. Aucun nom n'est saisi ici,
 *  pour qu'on ne puisse pas se faire passer pour le client depuis mon
 *  appareil. */
const saisieArticles = ref<{ nonLivres: { id: string; motif: string }[]; valide: boolean }>({ nonLivres: [], valide: true })
function ouvrirSignature(e: { id: string }) {
  saisieArticles.value = { nonLivres: [], valide: true }
  ligneEnSignature.value = e.id
}
function confirmerSignature(etapeId: string) {
  if (!maTournee.value) return
  const ligne = maTournee.value.etapes.find(e => e.id === etapeId)
  const res = voyages.declarerLivraisonChauffeur(maTournee.value.id, etapeId, ligne?.articles?.length ? saisieArticles.value.nonLivres : [])
  if (!res.ok) { alert(res.motif); return }
  ligneEnSignature.value = null
}

/* ── Point impossible à livrer maintenant : reporter (on retentera plus
     tard) ou le client annule (définitif). Deux gestes différents, qui
     ne bloquent jamais les points suivants de la tournée. ─────────── */
const actionSecondaireOuverte = ref<string | null>(null)
/** Vrai si le choix "signaler un problème" (report ou annulation) est
 *  ouvert pour cette ligne précise, sous quelque forme que ce soit. */
function problemeOuvertPour(etapeId: string) {
  return actionSecondaireOuverte.value === `choix-${etapeId}` || actionSecondaireOuverte.value === `report-client-${etapeId}` || actionSecondaireOuverte.value === `report-anomalie-${etapeId}` || actionSecondaireOuverte.value === `retour-${etapeId}` || actionSecondaireOuverte.value === `annule-${etapeId}`
}
const motifSecondaire = ref('')
const dateRetour = ref('')
const lignesRetour = computed(() => (maTournee.value?.etapes ?? []).filter(e => e.retourEntrepotLe))
function reporterRetour(etapeId: string) {
  if (!maTournee.value || !motifSecondaire.value.trim()) return
  const res = voyages.reporterAvecRetour(maTournee.value.id, etapeId, motifSecondaire.value.trim(), dateRetour.value || undefined)
  if (!res.ok) { alert(res.motif); return }
  actionSecondaireOuverte.value = null; motifSecondaire.value = ''; dateRetour.value = ''
}
function reporter(etapeId: string) {
  if (!maTournee.value || !motifSecondaire.value.trim()) return
  const res = voyages.reporterLigne(maTournee.value.id, etapeId, motifSecondaire.value.trim())
  if (!res.ok) { alert(res.motif); return }
  actionSecondaireOuverte.value = null
  motifSecondaire.value = ''
}
function reprendre(etapeId: string) {
  if (!maTournee.value) return
  voyages.reprendreLigne(maTournee.value.id, etapeId)
}
function annulerLigneChauffeur(etapeId: string) {
  if (!maTournee.value || !motifSecondaire.value.trim()) return
  const res = voyages.annulerLigne(maTournee.value.id, etapeId, motifSecondaire.value.trim())
  if (!res.ok) { alert(res.motif); return }
  actionSecondaireOuverte.value = null
  motifSecondaire.value = ''
}
</script>
