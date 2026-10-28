<template>
  <div :class="L.pageWrap" class="max-w-[900px]">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Ma situation</div>
        <div :class="L.pageSub">{{ auth.user?.nom }} · {{ dateDuJour }}</div>
      </div>
      <button v-if="auth.role === 'conducteur' && auth.user?.personnelId" :class="clsForm.btnPrimary" @click="pleinOuvert = true"><Fuel class="w-4 h-4" /> Déclarer un plein</button>
    </div>
    <div v-if="pleinEnregistre" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs">Plein {{ pleinEnregistre }} enregistré avec son reçu.</div>
    <RechargeFormModal v-if="pleinOuvert" :pour-chauffeur-id="auth.user?.personnelId" @close="pleinOuvert = false" @cree="id => { pleinOuvert = false; pleinEnregistre = id }" />

    <!-- Notifications reçues pour mes tournées (confiée, annulée) -->
    <div v-if="mesNotifications.length" :class="L.card" class="mb-3">
      <p class="text-[13px] font-semibold text-foreground flex items-center gap-1.5 mb-2"><Bell class="w-4 h-4 text-primary" /> Mes notifications</p>
      <div v-for="(n, i) in mesNotifications" :key="i" class="flex items-start gap-2 py-1.5 border-t border-border first:border-t-0 text-[12px]">
        <span class="text-muted-foreground shrink-0 w-[112px]">{{ fmtDateHeure(n.le) }}</span>
        <span class="text-foreground">{{ n.message }}</span>
      </div>
    </div>

    <div v-for="c in fileDecl.conflits.value" :key="c.cle" class="flex items-start gap-2 rounded-lg px-3.5 py-2.5 mb-3 bg-danger-bg text-danger text-[12px]">
      <AlertTriangle class="w-4 h-4 shrink-0 mt-px" />
      <span class="flex-1">Déclaration non transmise pour {{ c.libelle }} : {{ c.motif }}</span>
      <button class="text-[11px] underline bg-transparent border-0 cursor-pointer p-0 text-inherit shrink-0" @click="fileDecl.oublierConflit(c.cle)">J'ai compris</button>
    </div>

    <!-- Persiste indépendamment de la tournée qui les portait, terminée ou non. -->
    <div v-if="mesArticlesARapporter.length" class="rounded-lg border border-warning/30 bg-warning-bg px-4 py-3 mb-3">
      <p class="text-[13px] font-semibold text-warning flex items-center gap-1.5 mb-2"><ShieldAlert class="w-4 h-4" /> {{ mesArticlesARapporter.every(r => r.voyage.carburant) ? 'Produit à rapporter au dépôt' : mesArticlesARapporter.some(r => r.voyage.carburant) ? "À rapporter à l'entrepôt ou au dépôt" : "Articles à rapporter à l'entrepôt" }}</p>
      <div v-for="r in mesArticlesARapporter" :key="r.etape.id" class="flex items-center gap-3 py-1.5 border-t border-warning/20 first:border-t-0">
        <div class="flex-1 min-w-0 text-[12px]">
          <span class="text-foreground font-medium">{{ r.etape.destinataire }}</span>
          <span class="text-muted-foreground"> · {{ r.voyage.numeroOT || r.voyage.reference }} · {{ voyages.libelleARapporter(r.etape) }}</span>
        </div>
        <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="confirmerArticlesRapportes(r.voyage.id, r.etape.id)">{{ r.voyage.carburant ? 'Rapporté au dépôt' : "Remis à l'entrepôt" }}</button>
      </div>
      <p v-if="erreur && mesArticlesARapporter.some(r => r.etape.id === erreurId)" class="text-[12px] text-danger mt-1">{{ erreur }}</p>
    </div>

    <div v-if="maTournee" :class="L.card" class="mb-3 !border-primary/30">
      <div :class="L.cardTitle">
        <Truck class="w-4 h-4 text-primary" />
        {{ maTournee.statut === 'planifie' ? 'Ma tournée à venir' : maTournee.statut === 'confirme' ? 'Ma tournée : chargement' : maTournee.statut === 'pret' ? 'Ma tournée prête à démarrer' : maTournee.statut === 'en_cours' ? 'Ma tournée en cours' : 'Ma dernière tournée' }}
        <span v-if="maTournee.statut !== 'planifie' && maTournee.statut !== 'confirme'" class="ml-auto text-[11px] font-normal text-muted-foreground" data-compteur>
          {{ lignesTriees.filter(e => e.franchi).length }}/{{ lignesTriees.filter(e => !e.ligneAnnuleeLe).length }} livraisons déclarées
        </span>
      </div>
      <div v-if="autorisation" class="flex items-start gap-2 rounded-md px-3 py-2 mb-3 text-[12px]" :class="autorisation.etat === 'accordee' ? 'bg-success-bg text-success' : autorisation.etat === 'refusee' ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'" data-autorisation>
        <ShieldAlert class="w-4 h-4 shrink-0 mt-px" />
        <span>{{ autorisation.libelle }}<template v-if="autorisation.motif"> : {{ autorisation.motif }}</template></span>
      </div>

      <template v-if="maTournee.statut === 'planifie'">
        <p class="text-[12px] text-muted-foreground mb-3">
          <span class="font-mono font-semibold text-foreground">{{ maTournee.numeroOT || maTournee.reference }}</span> ·
          prévue le {{ fmtDateHeure(maTournee.datePlanifiee) }}
        </p>
        <div class="flex flex-col gap-1">
          <div v-for="(l, i) in lignesTriees" :key="l.id" class="flex gap-2.5 rounded-md bg-background px-3 py-2">
            <span class="text-[11px] font-semibold text-muted-foreground w-5 shrink-0">{{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <span class="text-[13px] text-foreground">{{ l.destinataire ?? l.siteNom }}</span>
              <span class="text-[11px] text-muted-foreground"> · {{ l.destinataire ? l.adresseLivraison : 'transfert interne' }}</span>
              <p v-if="l.contenuCharge || l.contenuCommande" class="text-[11px] text-muted-foreground break-words">{{ l.contenuCharge ?? l.contenuCommande }}</p>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="maTournee.statut === 'confirme'">
        <p class="text-[12px] text-muted-foreground mb-3">
          <span class="font-mono font-semibold text-foreground">{{ maTournee.numeroOT || maTournee.reference }}</span> ·
          prévue le {{ fmtDateHeure(maTournee.datePlanifiee) }}
        </p>
        <div v-if="!maTournee.chargementEntrepotLe" class="flex items-center gap-2 text-[12px] text-muted-foreground italic">
          <Clock class="w-4 h-4 shrink-0" /> {{ maTournee.carburant ? "En attente de l'enlèvement au dépôt." : "En attente du chargement par l'entrepôt." }}
        </div>
        <div v-else class="bg-info-bg rounded-md px-3 py-3">
          <p class="text-[12px] text-foreground mb-2">{{ maTournee.carburant ? `Enlèvement confirmé par le dépôt le ${fmtDateHeure(maTournee.chargementEntrepotLe)}, BSL ${maTournee.carburant.bonEnlevement?.bsl?.numero ?? ''}` : `Chargement déclaré par l'entrepôt le ${fmtDateHeure(maTournee.chargementEntrepotLe)}` }}</p>
          <!-- Citerne : contrôle compartiment par compartiment -->
          <div v-if="maTournee.carburant" class="flex flex-col gap-2">
            <div v-for="x in compartimentsAControler" :key="x.numero" class="rounded-md bg-card px-3 py-2" :data-compartiment="x.numero">
              <div class="flex items-center gap-2">
                <div class="flex-1 min-w-0 text-[12px]">
                  <span class="font-semibold text-foreground">Compartiment {{ x.numero }}</span>
                  <span class="text-foreground"> · {{ x.produit }}, {{ volumeChargeCompartiment(x.numero) != null ? `${fmtL(volumeChargeCompartiment(x.numero))} chargés` : `${fmtL(x.volumeL)} prévus` }}</span>
                  <span class="text-muted-foreground"> · pour {{ x.client }}</span>
                </div>
                <span v-if="x.conformeLe" class="text-[11px] text-success font-medium shrink-0">Conforme</span>
                <template v-else-if="nonConformeLigne !== `C${x.numero}`">
                  <button class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0 shrink-0" @click="nonConformeLigne = `C${x.numero}`">Non conforme</button>
                  <button :class="clsForm.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="controlerCompartiment(x.numero, true)">Valider</button>
                </template>
              </div>
              <div v-if="nonConformeLigne === `C${x.numero}`" class="flex items-center gap-2 mt-2">
                <input v-model="motifNonConforme" :class="clsForm.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Ce qui ne correspond pas au plan de chargement…" />
                <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="nonConformeLigne = null; motifNonConforme = ''">Renoncer</button>
                <button :class="clsForm.btnPrimary" class="!bg-danger hover:!bg-danger/90 !py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motifNonConforme.trim()" @click="controlerCompartiment(x.numero, false)">Signaler</button>
              </div>
              <p v-if="erreurId === `C${x.numero}` && erreur" class="text-[12px] text-danger mt-1.5">{{ erreur }}</p>
            </div>
          </div>
          <div v-else class="flex flex-col gap-2">
            <div v-for="l in lignesTriees" :key="l.id" class="rounded-md bg-card px-3 py-2">
              <div class="flex items-center gap-2">
                <div class="flex-1 min-w-0 text-[12px]">
                  <span class="text-muted-foreground">{{ l.destinataire ?? l.siteNom }} :</span>
                  <span class="text-foreground">&nbsp;{{ l.contenuCharge }}</span>
                </div>
                <span v-if="l.chargementConformeLe" class="text-[11px] text-success font-medium shrink-0">Conforme</span>
                <template v-else-if="nonConformeLigne !== l.id">
                  <button class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0 shrink-0" @click="nonConformeLigne = l.id">Non conforme</button>
                  <button :class="clsForm.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="controlerLigne(l.id, true)">Valider</button>
                </template>
              </div>
              <div v-if="nonConformeLigne === l.id" class="flex items-center gap-2 mt-2">
                <input v-model="motifNonConforme" :class="clsForm.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Ce qui ne correspond pas à ce que l'entrepôt déclare…" />
                <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="nonConformeLigne = null; motifNonConforme = ''">Renoncer</button>
                <button :class="clsForm.btnPrimary" class="!bg-danger hover:!bg-danger/90 !py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motifNonConforme.trim()" @click="controlerLigne(l.id, false)">Signaler</button>
              </div>
              <p v-if="erreurId === l.id && erreur" class="text-[12px] text-danger mt-1.5">{{ erreur }}</p>
            </div>
          </div>
          <p v-if="!lignesTriees.length" class="text-[12px] text-muted-foreground italic">Plus aucune ligne conforme dans cette tournée.</p>
          <div v-if="(maTournee.carburant ? compartimentsAControler.some(x => !x.conformeLe) : lignesTriees.some(l => !l.chargementConformeLe)) && nonConformeLigne === null" class="mt-3">
            <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="validerChargement">Tout est conforme</button>
            <p v-if="erreurId === 'chargement' && erreur" class="text-[12px] text-danger mt-1.5">{{ erreur }}</p>
          </div>
          <div v-for="l in lignesNonConformes" :key="l.id" class="rounded-md px-3 py-2 mt-2 bg-warning-bg text-warning text-[12px]">
            <div class="flex items-start gap-2">
              <AlertTriangle class="w-4 h-4 shrink-0 mt-px" />
              <span class="flex-1">Non-conformité signalée pour {{ l.destinataire ?? l.siteNom }} : {{ l.motifNonConformite }}</span>
              <button v-if="correctionOuverte !== `nc-${l.id}`" class="text-[11px] underline bg-transparent border-0 cursor-pointer p-0 text-inherit shrink-0" @click="ouvrirCorrection(`nc-${l.id}`)">Annuler ma non-conformité</button>
            </div>
            <div v-if="correctionOuverte === `nc-${l.id}`" class="flex items-center gap-2 mt-2">
              <input v-model="motifCorrection" :class="clsForm.fieldInput" class="!h-[30px] !text-[12px]" placeholder="Pourquoi annuler cette non-conformité ? (erreur de saisie…)" />
              <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="correctionOuverte = null">Renoncer</button>
              <button :class="clsForm.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motifCorrection.trim()" @click="annulerNonConformite(l.id)">Annuler la non-conformité</button>
            </div>
            <p v-if="erreurId === `nc-${l.id}` && erreur" class="text-[12px] text-danger mt-1">{{ erreur }}</p>
          </div>
        </div>
      </template>

      <template v-else>
        <p class="text-[12px] text-muted-foreground mb-3">
          <span class="font-mono font-semibold text-foreground">{{ maTournee.numeroOT || maTournee.reference }}</span> ·
          prévue le {{ fmtDateHeure(maTournee.datePlanifiee) }}
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
            <span v-else-if="e.franchi && e.receptionContesteeLe" class="text-[11px] text-danger font-medium shrink-0">Contestée</span>
            <span v-else-if="e.franchi" class="text-[11px] text-warning font-medium shrink-0">Livraison déclarée, en attente du client</span>
            <span v-else-if="enAttenteReseau(e.id)" class="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1"><CloudOff class="w-3.5 h-3.5" /> Hors réseau : enregistré, sera transmis</span>
            <span v-else-if="e.ligneAnnuleeLe" class="text-[11px] text-danger font-medium shrink-0">{{ libelleFinLigne(e) }}</span>
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

          <p v-if="erreurId === e.id && erreur" class="text-[12px] text-danger mt-1 pl-[26px]">{{ erreur }}</p>
          <p v-if="e.franchi && e.eBL?.articlesNonLivres?.length" class="text-[11px] text-warning mt-1 pl-[26px]">
            {{ maTournee.carburant ? 'À rapporter au dépôt' : "À rapporter à l'entrepôt" }} : {{ e.eBL.articlesNonLivres.map(a => `${a.libelle} (${a.motif})`).join(' · ') }}
          </p>
          <p v-if="e.reporteLe && !e.ligneAnnuleeLe" class="text-[11px] text-warning mt-1 pl-[26px]">{{ e.motifReport }}</p>
          <p v-if="e.ligneAnnuleeLe" class="text-[11px] text-danger mt-1 pl-[26px]">{{ e.motifAnnulationLigne }}</p>
          <p v-if="e.franchi && e.receptionContesteeLe" class="text-[11px] text-danger mt-1 pl-[26px]">{{ e.motifContestation }}</p>

          <!-- Erreur de saisie : déclaration annulée tant que le client n'a pas confirmé, refus annulé tant que je suis sur place -->
          <div v-if="peutAnnulerDeclaration(e) || peutAnnulerRefus(e, i)" class="mt-1.5 pl-[26px]">
            <button v-if="correctionOuverte !== `co-${e.id}`" class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="ouvrirCorrection(`co-${e.id}`)">{{ e.franchi ? 'Annuler ma déclaration' : 'Annuler ce refus' }}</button>
            <div v-else class="flex items-center gap-2">
              <input v-model="motifCorrection" :class="clsForm.fieldInput" class="!h-[30px] !text-[12px]" :placeholder="e.franchi ? 'Pourquoi annuler la déclaration ? (erreur de saisie…)' : 'Pourquoi annuler le refus ? (erreur de saisie…)'" />
              <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="correctionOuverte = null">Renoncer</button>
              <button :class="clsForm.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motifCorrection.trim()" @click="corrigerLigne(e)">{{ e.franchi ? 'Annuler la déclaration' : 'Annuler le refus' }}</button>
            </div>
          </div>

          <!-- Reprendre un point reporté -->
          <div v-if="e.reporteLe && !e.franchi && !e.ligneAnnuleeLe" class="mt-2 pl-[26px]">
            <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="reprendre(e.id)">Retenter ce point maintenant</button>
          </div>

          <!-- Déclaration en cours -->
          <div v-if="ligneEnSignature === e.id && e.destinataire" class="flex flex-col gap-2 mt-2.5 pl-[26px]">
            <SaisieArticles v-if="e.articles?.length && !e.bonLivraison" :key="e.id" :articles="e.articles" @change="saisieArticles = $event" />
            <template v-if="maTournee.carburant && e.bonLivraison">
              <SaisieMesures :key="`m-${e.id}`" :compartiments="compartimentsLigne(e)" libelle-volume="Volume dépoté (L)" livraison @change="m => mesuresDepot = m" />
              <input v-model="justificationQuantite" :class="clsForm.fieldInput" class="!h-[30px] !text-[12px]" placeholder="Justification si l'écart est hors tolérance" />
            </template>
            <div v-else-if="reference(e) != null" class="flex items-center gap-2 flex-wrap">
              <label class="text-[11px] text-muted-foreground shrink-0">Quantité reçue (sur {{ reference(e) }})</label>
              <input v-model.number="quantiteRecue" type="number" min="0" :class="clsForm.fieldInput" class="!h-[30px] !text-[12px] !w-[110px]" />
              <input v-model="justificationQuantite" :class="clsForm.fieldInput" class="!h-[30px] !text-[12px] flex-1 min-w-[180px]" placeholder="Justification si l'écart est hors tolérance" />
            </div>
            <div class="flex items-center gap-2">
              <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="ligneEnSignature = null">Renoncer</button>
              <button :class="clsForm.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!!e.articles?.length && !e.bonLivraison && !saisieArticles.valide" @click="confirmerSignature(e.id)">Déclarer la livraison effectuée</button>
            </div>
          </div>

          <!-- Point atteint mais livraison impossible : un seul point d'entrée, qui ouvre le
               choix entre les deux issues, pour ne jamais présenter deux actions à plat. -->
          <div v-if="e.arriveeLe && !e.franchi && e.destinataire && !e.reporteLe && !e.ligneAnnuleeLe && ligneEnSignature !== e.id && !problemeOuvertPour(e.id) && !enAttenteReseau(e.id)" class="mt-2 pl-[26px]">
            <button class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="actionSecondaireOuverte = `choix-${e.id}`">Signaler un problème avec cette livraison</button>
          </div>
          <div v-if="actionSecondaireOuverte === `choix-${e.id}`" class="flex flex-col gap-1.5 mt-2 pl-[26px]">
            <button class="text-[11px] text-left text-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="actionSecondaireOuverte = `report-client-${e.id}`">Le client est fermé ou absent - je retenterai plus tard</button>
            <button class="text-[11px] text-left text-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="actionSecondaireOuverte = `absent-${e.id}`; motifSecondaire = 'Client absent'">Client absent : je ramène la marchandise</button>
            <button class="text-[11px] text-left text-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="actionSecondaireOuverte = `report-anomalie-${e.id}`">Anomalie constatée sur l'article à la livraison - je retenterai plus tard</button>
            <button class="text-[11px] text-left text-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="actionSecondaireOuverte = `retour-${e.id}`">Le client demande un report</button>
            <button class="text-[11px] text-left text-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="actionSecondaireOuverte = `annule-${e.id}`">Le client refuse la commande - définitif</button>
            <button class="text-[11px] text-left text-muted-foreground bg-transparent border-0 cursor-pointer p-0" @click="actionSecondaireOuverte = null">Renoncer</button>
          </div>
          <div v-if="actionSecondaireOuverte === `report-client-${e.id}` || actionSecondaireOuverte === `report-anomalie-${e.id}`" class="flex items-center gap-2 mt-2 pl-[26px]">
            <input v-model="motifSecondaire" :class="clsForm.fieldInput" class="!h-[32px] !text-[12px]"
                   :placeholder="actionSecondaireOuverte === `report-anomalie-${e.id}` ? 'Quelle anomalie sur l\'article…' : 'Motif du report…'" />
            <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="actionSecondaireOuverte = null; motifSecondaire = ''">Renoncer</button>
            <button :class="clsForm.btnPrimary" class="!bg-warning hover:!bg-warning/90 !py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motifSecondaire.trim()" @click="reporter(e.id)">Reporter ce point</button>
          </div>
          <div v-if="actionSecondaireOuverte === `absent-${e.id}`" class="flex items-center gap-2 mt-2 pl-[26px]">
            <input v-model="motifSecondaire" :class="clsForm.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Client absent, magasin fermé…" />
            <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="actionSecondaireOuverte = null; motifSecondaire = ''">Renoncer</button>
            <button :class="clsForm.btnPrimary" class="!bg-warning hover:!bg-warning/90 !py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motifSecondaire.trim()" @click="reporterRetour(e.id, true)">{{ maTournee.carburant ? 'Retour au dépôt' : "Retour à l'entrepôt" }}</button>
          </div>
          <div v-if="actionSecondaireOuverte === `retour-${e.id}`" class="flex flex-col gap-2 mt-2 pl-[26px]">
            <input v-model="motifSecondaire" :class="clsForm.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Motif du report demandé par le client…" />
            <div class="flex items-center gap-2">
              <label class="text-[11px] text-muted-foreground shrink-0">Le client peut être livré à partir du</label>
              <input v-model="dateRetour" type="date" :class="clsForm.fieldInput" class="!h-[32px] !text-[12px] max-w-[170px]" />
              <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0 ml-auto" @click="actionSecondaireOuverte = null; motifSecondaire = ''; dateRetour = ''">Renoncer</button>
              <button :class="clsForm.btnPrimary" class="!bg-warning hover:!bg-warning/90 !py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motifSecondaire.trim()" @click="reporterRetour(e.id)">{{ maTournee.carburant ? 'Retour au dépôt' : "Retour à l'entrepôt" }}</button>
            </div>
          </div>
          <div v-if="actionSecondaireOuverte === `annule-${e.id}`" class="flex flex-col gap-1.5 mt-2 pl-[26px]">
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
        <FleetMap :marqueurs="marqueursItineraire" :trace-prevu="lignesTriees.map(l => ({ lat: l.lat, lng: l.lng }))" height="200px" />
      </div>
      <div v-for="l in lignesRetour" :key="l.id" class="flex items-start gap-2 rounded-md px-3 py-2 mt-2 bg-warning-bg text-warning text-[12px]">
        <AlertTriangle class="w-4 h-4 shrink-0 mt-px" />
        <span>{{ maTournee?.carburant ? `Le produit de ${l.destinataire} retourne au dépôt` : `La marchandise de ${l.destinataire} retourne à l'entrepôt` }} : {{ l.motifRetour }}.</span>
      </div>
      <p v-if="lignesTriees.length && lignesTriees.every(e => e.franchi || e.ligneAnnuleeLe)" class="text-[12px] text-success font-medium mt-3 flex items-center gap-1.5">
        <CircleCheck class="w-4 h-4" /> Toutes les livraisons sont réglées, cette tournée vient de se terminer.
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
      </div>
    </div>

    <!-- Rappel des règles de conduite -->
    <div :class="L.card" class="mt-3">
      <div :class="L.cardTitle"><Clock class="w-4 h-4 text-primary" /> Les limites en vigueur</div>
      <div class="grid grid-cols-3 gap-3 max-md:grid-cols-1">
        <div class="bg-background rounded-lg p-3.5 text-center">
          <div class="text-2xl font-bold">{{ Math.round(config.parametres.tcjMaxMin / 6) / 10 }} h</div>
          <div class="text-[11px] text-muted-foreground mt-1">Conduite maximale par jour</div>
        </div>
        <div class="bg-background rounded-lg p-3.5 text-center">
          <div class="text-2xl font-bold">{{ config.parametres.reposMinAvantDepartH }} h</div>
          <div class="text-[11px] text-muted-foreground mt-1">Repos minimal par jour</div>
        </div>
        <div class="bg-background rounded-lg p-3.5 text-center">
          <div class="text-2xl font-bold">{{ config.parametres.plafondHebdoH }} h</div>
          <div class="text-[11px] text-muted-foreground mt-1">Conduite maximale par semaine</div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { AlertTriangle, Bell, CloudOff, CircleCheck, ShieldAlert, Circle, CircleX, Clock, FileText, Fuel, ListChecks, MapPinCheck, Truck } from '@lucide/vue'
import RechargeFormModal from '../../components/flotte/RechargeFormModal.vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import * as L from '../../lib/listClasses'
import * as clsForm from '../../lib/formClasses'
import { formatDate } from '../../utils/helpers'
import { fmtDateHeure, horsTournee, dansLaTournee, libelleFinLigne } from '../../utils/voyageUtils'
import { useParametresPlanificationStore } from '../../stores/parametresPlanification'
import SaisieArticles from '../../components/flotte/SaisieArticles.vue'
import SaisieMesures from '../../components/planification/SaisieMesures.vue'
import { useLivraisonCarburantStore } from '../../stores/livraisonCarburant'
import { fmtL } from '../../lib/volume15'
import type { EtapeVoyage, MesureCompartiment } from '../../types'
import FleetMap from '../../components/flotte/FleetMap.vue'
import { useAuthStore } from '../../stores/auth'
import { usePersonnelStore } from '../../stores/personnel'
import { useFonctionStore } from '../../stores/fonctions'
import { useDocumentsStore, LIBELLE_TYPE_DOC } from '../../stores/documentsPersonnel'
import { useParametresStore } from '../../stores/parametres'
import { useVoyagesStore } from '../../stores/voyages'
import { useConfigurationStore } from '../../stores/configuration'
import { aujourdhuiDate } from '../../utils/horloge'
import { fileDeclarationsLivraison } from '../../lib/fileHorsReseau'

const auth = useAuthStore()
const config = useConfigurationStore()
const pleinOuvert = ref(false)
const pleinEnregistre = ref('')
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
const manquantes = computed(() => (moi.value ? docs.piecesAbsentes(moi.value.id) : []))
const responsabilites = computed(() =>
  moi.value ? fonctions.parId(moi.value.fonctionId)?.responsabilites ?? [] : [],
)

const apte = computed(() => !!moi.value && moi.value.habilite && docs.enRegle(moi.value.id))

const motifBlocage = computed(() => {
  if (!moi.value) return ''
  if (!moi.value.habilite) return "Votre habilitation n'est pas enregistrée."
  return 'Une de vos pièces obligatoires est expirée ou absente.'
})

/* ── Ma tournée : celle qui est en cours d'abord, puis prête, confirmée,
     planifiée. Deux gestes distincts par point : marquer l'arrivée, puis
     déclarer la livraison (ou confirmer le passage pour un transfert
     interne). ──────────────────────────────────────────────────────── */
const tourneeActive = computed(() =>
  moi.value ? [...voyages.enCoursKanban, ...voyages.prets, ...voyages.confirmes, ...voyages.planifies].find(v => v.chauffeurId === moi.value!.id) ?? null : null)
/** Sans tournée active, la dernière tournée terminée reste affichée, avec le sort de chaque
 *  livraison, jusqu'à ce qu'une nouvelle tournée soit confiée. */
const derniereTournee = computed(() => {
  if (!moi.value || tourneeActive.value) return null
  const fin = (x: { dateArriveeReelle?: string; clotureLe?: string; datePlanifiee: string }) => x.dateArriveeReelle ?? x.clotureLe ?? x.datePlanifiee
  return voyages.voyages.filter(v => v.chauffeurId === moi.value!.id && (v.statut === 'livre' || v.statut === 'cloture') && v.etapes.some(e => e.destinataire))
    .sort((a, b) => fin(b).localeCompare(fin(a)))[0] ?? null
})
const maTournee = computed(() => tourneeActive.value ?? derniereTournee.value)
/** Autorisation de départ de ma tournée prête : à demander, en attente, accordée ou refusée. */
const autorisation = computed(() => maTournee.value ? voyages.etatAutorisationDepart(maTournee.value) : null)

/** Motif d'un refus du store, affiché sous la ligne concernée. */
const erreur = ref('')
const erreurId = ref<string | null>(null)
function montrer(id: string, res: { ok: boolean; motif?: string }) {
  erreurId.value = res.ok ? null : id
  erreur.value = res.ok ? '' : (res.motif ?? '')
  return res.ok
}
/** Persiste indépendamment de la tournée qui les portait, terminée ou non :
 *  sans ça, le rappel disparaîtrait avec la carte de la tournée une fois
 *  celle-ci close. */
/** Les cinq dernières notifications reçues, toutes tournées confondues. */
const mesNotifications = computed(() => moi.value ? voyages.voyages
  .flatMap(v => (v.notificationsChauffeur ?? []).filter(n => n.chauffeurId ? n.chauffeurId === moi.value!.id : v.chauffeurId === moi.value!.id))
  .sort((a, b) => b.le.localeCompare(a.le)).slice(0, 5) : [])
const mesArticlesARapporter = computed(() => moi.value ? voyages.articlesARapporter.filter(r => r.voyage.chauffeurId === moi.value!.id) : [])
function confirmerArticlesRapportes(voyageId: string, etapeId: string) {
  montrer(etapeId, voyages.confirmerArticlesRapportes(voyageId, etapeId))
}
/** Une ligne dont le destinataire s'est déclaré indisponible avant chargement
 *  est sortie de la tournée : le chauffeur ne la voit pas, elle ne compte
 *  ni dans sa progression ni dans sa livraison. */
/* Même filtre que la liste de chargement : ni les lignes annulées avant le départ, ni les bons annulés. */
const lignesTriees = computed(() => maTournee.value ? [...maTournee.value.etapes].filter(e => !horsTournee(e) && !e.annuleeAvantDepart && e.bonLivraison?.statut !== 'annule').sort((a, b) => a.ordre - b.ordre) : [])
/** Itinéraire de la tournée sur une carte : le chauffeur peut visualiser
 *  le circuit dès que la tournée lui est confiée, pour s'y préparer. */
const marqueursItineraire = computed(() => lignesTriees.value.map((l, i) => ({
  id: l.id, lat: l.lat, lng: l.lng, libelle: `${i + 1}. ${l.destinataire ?? l.siteNom}`,
  couleur: l.franchi ? '#16a34a' : l.ligneAnnuleeLe ? '#dc2626' : '#94a3b8', numero: i + 1,
})))

/** L'arrivée sur un point n'est possible que si le précédent est déjà réglé. */
function peutArriver(index: number) {
  /* Une déclaration gardée hors réseau règle déjà le point : la tournée continue en zone blanche. */
  return lignesTriees.value.slice(0, index).every(e => e.franchi || e.reporteLe || e.ligneAnnuleeLe || enAttenteReseau(e.id))
}
function arriver(etapeId: string) {
  if (!maTournee.value) return
  montrer(etapeId, voyages.marquerArrivee(maTournee.value.id, etapeId))
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
  if (!montrer(etapeId, voyages.controlerLigneChargement(maTournee.value.id, etapeId, conforme, motifNonConforme.value))) return
  nonConformeLigne.value = null
  motifNonConforme.value = ''
}
function validerChargement() {
  if (!maTournee.value) return
  montrer('chargement', maTournee.value.carburant ? carburant.toutConforme(maTournee.value.id) : voyages.validerChargementChauffeur(maTournee.value.id))
}
/* ── Carburant : contrôle compartiment par compartiment, volumes dépotés ── */
const carburant = useLivraisonCarburantStore()
const compartimentsAControler = computed(() => maTournee.value?.carburant ? carburant.aCharger(maTournee.value) : [])
const volumeChargeCompartiment = (n: number) => maTournee.value?.carburant?.bonEnlevement?.bsl?.mesures.find(m => m.numero === n)?.volumeL
function controlerCompartiment(numero: number, conforme: boolean) {
  if (!maTournee.value) return
  if (!montrer(`C${numero}`, carburant.controlerCompartiment(maTournee.value.id, numero, conforme, motifNonConforme.value))) return
  nonConformeLigne.value = null
  motifNonConforme.value = ''
}
const mesuresDepot = ref<Partial<MesureCompartiment>[]>([])
function compartimentsLigne(e: EtapeVoyage) {
  const v = maTournee.value
  if (!v) return []
  return carburant.aCharger(v).filter(x => x.commandeId === e.commandeId).map(x => {
    const bsl = v.carburant?.bonEnlevement?.bsl?.mesures.find(m => m.numero === x.numero)
    return { numero: x.numero, libelle: `Compartiment ${x.numero} : ${x.produit}`, produit: x.produit, volume: preremplir.value ? bsl?.volumeL : undefined, densite: bsl?.densite }
  })
}

const ligneEnSignature = ref<string | null>(null)
/** Je déclare avoir effectué la livraison : ça fait avancer ma tournée,
 *  sans jamais valoir confirmation du client. Aucun nom n'est saisi ici,
 *  pour qu'on ne puisse pas se faire passer pour le client depuis mon
 *  appareil. */
const saisieArticles = ref<{ nonLivres: { id: string; motif: string }[]; valide: boolean }>({ nonLivres: [], valide: true })
const quantiteRecue = ref<number | null>(null)
const justificationQuantite = ref('')
/** Quantité de référence : celle déclarée chargée par l'entrepôt, sinon celle de la commande. */
const reference = (e: EtapeVoyage) => maTournee.value ? voyages.quantiteReference(maTournee.value, e) : e.nombreUnites
const preremplir = computed(() => useParametresPlanificationStore().parametres.preremplirQuantites)
/** Quantité pré-remplie : la référence, moins les articles décochés (leur nombre en tête de libellé). */
function quantitePreremplie(e: EtapeVoyage): number | null {
  const ref0 = reference(e)
  if (!preremplir.value || ref0 == null) return null
  const retires = saisieArticles.value.nonLivres.reduce((t, n) => {
    const a = e.articles?.find(x => x.id === n.id)
    const m = a ? /^(\d+)(?=\s)/.exec(a.libelle) : null
    return t + (m ? Number(m[1]) : 0)
  }, 0)
  return Math.max(0, ref0 - retires)
}
function ouvrirSignature(e: EtapeVoyage) {
  saisieArticles.value = { nonLivres: [], valide: true }
  mesuresDepot.value = []
  ligneEnSignature.value = e.id
  quantiteRecue.value = quantitePreremplie(e); justificationQuantite.value = ''
}
/* Décocher un article met à jour la quantité reçue pré-remplie. */
watch(() => saisieArticles.value.nonLivres.map(n => n.id).join('|'), () => {
  const e = maTournee.value?.etapes.find(x => x.id === ligneEnSignature.value)
  if (e) quantiteRecue.value = quantitePreremplie(e)
})
/* Sans réseau, la déclaration est gardée sur l'appareil et transmise
   d'elle-même au retour de la connexion. */
const fileDecl = fileDeclarationsLivraison()
const enAttenteReseau = (etapeId: string) => !!fileDecl.enAttente(`livraison:${etapeId}`)
function confirmerSignature(etapeId: string) {
  if (!maTournee.value || enAttenteReseau(etapeId)) return
  const ligne = maTournee.value.etapes.find(e => e.id === etapeId)
  const articles = ligne?.articles?.length ? saisieArticles.value.nonLivres : []
  const carb = !!maTournee.value.carburant && !!ligne?.bonLivraison
  const qte: { recue?: number; justification?: string; mesures?: MesureCompartiment[] } = carb
    ? { mesures: mesuresDepot.value as MesureCompartiment[], justification: justificationQuantite.value }
    : ligne && reference(ligne) != null && typeof quantiteRecue.value === 'number' ? { recue: quantiteRecue.value, justification: justificationQuantite.value } : {}
  const articlesDecl = carb ? [] : articles
  if (!montrer(etapeId, voyages.verifierDeclarationLivraison(maTournee.value.id, etapeId, articlesDecl, qte))) return
  if (!montrer(etapeId, fileDecl.soumettre(`livraison:${etapeId}`, { voyageId: maTournee.value.id, etapeId, articlesNonLivres: articlesDecl, quantiteRecue: qte.recue, justificationQuantite: qte.justification, mesures: qte.mesures }, ligne?.destinataire ?? ligne?.siteNom ?? ''))) return
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
function reporterRetour(etapeId: string, clientAbsent = false) {
  if (!maTournee.value || !motifSecondaire.value.trim()) return
  if (!montrer(etapeId, voyages.reporterAvecRetour(maTournee.value.id, etapeId, motifSecondaire.value.trim(), clientAbsent ? undefined : dateRetour.value || undefined, clientAbsent))) return
  actionSecondaireOuverte.value = null; motifSecondaire.value = ''; dateRetour.value = ''
}
function reporter(etapeId: string) {
  if (!maTournee.value || !motifSecondaire.value.trim()) return
  if (!montrer(etapeId, voyages.reporterLigne(maTournee.value.id, etapeId, motifSecondaire.value.trim()))) return
  actionSecondaireOuverte.value = null
  motifSecondaire.value = ''
}
function reprendre(etapeId: string) {
  if (!maTournee.value) return
  voyages.reprendreLigne(maTournee.value.id, etapeId)
}
/* ── Erreurs de saisie : non-conformité, déclaration ou refus annulés, avec un motif ── */
const correctionOuverte = ref<string | null>(null)
const motifCorrection = ref('')
function ouvrirCorrection(cle: string) { correctionOuverte.value = cle; motifCorrection.value = '' }
function annulerNonConformite(etapeId: string) {
  if (!maTournee.value) return
  if (!montrer(`nc-${etapeId}`, voyages.annulerNonConformite(maTournee.value.id, etapeId, motifCorrection.value))) return
  correctionOuverte.value = null
}
const enExecution = computed(() => maTournee.value?.statut === 'en_cours' || maTournee.value?.statut === 'livre')
function peutAnnulerDeclaration(e: EtapeVoyage) {
  return enExecution.value && !!e.destinataire && !!e.livreParChauffeurLe && !e.receptionConfirmeeClientLe && !e.receptionContesteeLe && !e.reliquatReprisLe && !e.articlesRapportesLe && !e.retourRecuLe
}
/** Refus que j'ai enregistré, tant que je n'ai pas commencé le point suivant. */
function peutAnnulerRefus(e: EtapeVoyage, i: number) {
  return enExecution.value && !!e.ligneAnnuleeLe && e.refusSaisiPar !== 'destinataire' && !e.annuleeAvantDepart && !e.incidentBon && !e.devieeVers && !!e.arriveeLe
    && !e.retourRecuLe && !e.articlesRapportesLe && !lignesTriees.value.slice(i + 1).some(x => dansLaTournee(x) && x.arriveeLe)
}
function corrigerLigne(e: EtapeVoyage) {
  if (!maTournee.value) return
  const r = e.franchi ? voyages.annulerDeclarationLivraison(maTournee.value.id, e.id, motifCorrection.value) : voyages.annulerRefus(maTournee.value.id, e.id, motifCorrection.value)
  if (montrer(e.id, r)) correctionOuverte.value = null
}
function annulerLigneChauffeur(etapeId: string) {
  if (!maTournee.value || !motifSecondaire.value.trim()) return
  if (!montrer(etapeId, voyages.annulerLigne(maTournee.value.id, etapeId, motifSecondaire.value.trim()))) return
  actionSecondaireOuverte.value = null
  motifSecondaire.value = ''
}
</script>
