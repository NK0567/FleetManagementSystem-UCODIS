<template>
  <div class="px-7 py-6 max-w-[1200px] mx-auto w-full max-[640px]:px-4">

    <div v-if="!conducteur" :class="L.emptyState">
      <UserX class="w-8 h-8" /><p class="text-sm">Conducteur introuvable</p>
    </div>

    <template v-else>
      <!-- En-tête -->
      <div class="flex items-center justify-between mb-3.5 gap-3 flex-wrap">
        <div class="flex items-start gap-3">
          <button class="w-9 h-9 rounded-md border border-border flex items-center justify-center text-muted-foreground cursor-pointer hover:bg-background shrink-0" @click="router.back()">
            <ArrowLeft class="w-4 h-4" />
          </button>
          <div class="flex items-center gap-3">
            <UserAvatar :nom="conducteur.nomComplet" taille="lg" />
            <div>
              <div class="text-lg font-semibold">{{ conducteur.nomComplet }}</div>
              <div class="text-[13px] text-muted-foreground mt-px">{{ voyagesDuConducteur.length }} voyage(s) · {{ kmTotal.toLocaleString('fr-FR') }} km sur la période</div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1">
            <button class="w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40 cursor-pointer hover:bg-background"
                    :disabled="indexCourant <= 0" title="Conducteur précédent" @click="naviguer(-1)"><ChevronLeft class="w-4 h-4" /></button>
            <span class="text-[11px] text-muted-foreground px-1">{{ indexCourant + 1 }} / {{ conducteurs.length }}</span>
            <button class="w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40 cursor-pointer hover:bg-background"
                    :disabled="indexCourant >= conducteurs.length - 1" title="Conducteur suivant" @click="naviguer(1)"><ChevronRight class="w-4 h-4" /></button>
          </div>

          <div class="text-right">
            <p class="text-3xl font-bold leading-none" :class="couleurScore(scoreGlobal)">{{ scoreGlobal }}</p>
            <p class="text-[11px] text-muted-foreground">
              sur 100
              <span :class="deltaScore >= 0 ? 'text-success' : 'text-danger'">({{ deltaScore >= 0 ? '+' : '' }}{{ deltaScore }})</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Alertes d'échéance -->
      <div v-if="echeances.length" class="flex flex-col gap-1.5 mb-3.5">
        <div v-for="e in echeances" :key="e.type" class="flex items-center gap-2.5 rounded-lg px-3.5 py-2" :class="e.expire ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'">
          <TriangleAlert class="w-4 h-4 shrink-0" />
          <p class="text-xs flex-1"><strong>{{ e.type }}</strong> · {{ e.expire ? 'expiré' : 'expire' }} le {{ formatDate(e.date) }}.</p>
          <span class="text-[11px] font-medium">{{ e.expire ? 'Affectation bloquée' : 'Régularisation requise' }}</span>
        </div>
      </div>

      <!-- Onglets -->
      <div class="flex gap-1 border-b border-border mb-3.5 overflow-x-auto">
        <button v-for="t in tabs" :key="t.key" @click="tab = t.key"
                class="px-3.5 py-2.5 text-[13px] font-medium border-b-2 whitespace-nowrap bg-transparent cursor-pointer transition-colors"
                :class="tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'">
          {{ t.label }}
          <span v-if="t.badge" class="ml-1 text-[10px] font-bold px-1.5 py-px rounded-full bg-danger text-white">{{ t.badge }}</span>
        </button>
      </div>

      <!-- ══ SCORE & PRIME ══════════════════════════════════════ -->
      <div v-if="tab === 'score'" class="flex flex-col gap-3.5">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div :class="L.kpiCard">
            <div :class="[L.kpiValue, couleurScore(scoreGlobal)]">{{ scoreGlobal }} / 100</div>
            <div :class="L.kpiLabel">
              Score global
              <span :class="deltaScore >= 0 ? 'text-success' : 'text-danger'">({{ deltaScore >= 0 ? '+' : '' }}{{ deltaScore }} vs mois précédent)</span>
            </div>
          </div>
          <div :class="L.kpiCard">
            <div :class="L.kpiValue">{{ scoresStore.percentile(conducteur.id) }} %</div>
            <div :class="L.kpiLabel">Mieux classé que ce pourcentage des conducteurs</div>
          </div>
          <div :class="L.kpiCard">
            <div :class="[L.kpiValue, primeEligible ? 'text-success' : 'text-muted-foreground']">{{ primeEligible ? fmtAr(palierPrime.montant) : 'Non éligible' }}</div>
            <div :class="L.kpiLabel">Prime de la période ({{ palierPrime.libelle }})</div>
          </div>
        </div>

        <div v-if="!primeEligible && motifNonEligibilite" class="flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 bg-warning-bg text-warning text-xs">
          <TriangleAlert class="w-4 h-4 shrink-0 mt-px" />
          <span><strong>Prime non versée :</strong> {{ motifNonEligibilite }}</span>
        </div>

        <div :class="L.card">
          <div :class="L.cardTitle"><Gauge class="w-4 h-4 text-primary" /> Décomposition du score</div>
          <div class="flex flex-col gap-3.5">
            <div v-for="f in famillesScore" :key="f.famille">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-medium text-foreground">{{ f.libelle }}</span>
                <span class="text-[11px] text-muted-foreground">{{ f.note }} / 100 · poids {{ f.poids }} % · {{ f.evenements }} événement(s)</span>
              </div>
              <div class="h-1.5 bg-border rounded-sm overflow-hidden"><div class="h-full rounded-sm" :style="{ width: f.note + '%', background: PONDERATIONS[f.famille].couleur }"></div></div>
              <p class="text-[11px] text-muted-foreground mt-1">{{ f.calcul }}</p>
            </div>
          </div>
        </div>

        <!-- Grille de prime : lecture seule ici, modification dans Configuration. -->
        <div :class="L.card">
          <div class="flex items-center justify-between mb-3">
            <div :class="L.cardTitle" class="!mb-0"><Award class="w-4 h-4 text-primary" /> Grille de prime</div>
            <RouterLink :to="{ name: 'flotte-configuration' }" class="text-[11px] text-primary hover:underline">Modifier dans Paramétrage</RouterLink>
          </div>
          <p class="text-[11px] text-warning bg-warning-bg rounded-md px-2.5 py-2 mb-3">
            Montants indicatifs (UCODIS ne les a pas communiqués) · à valider par la Direction et les Ressources
            humaines avant activation. Modifiables sans développeur depuis Flotte → Paramétrage, onglet Paramètres.
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div v-for="pp in scoresStore.grillePrime" :key="pp.libelle" class="rounded-lg border px-3 py-2 text-center" :class="palierPrime.libelle === pp.libelle ? 'border-primary bg-primary/5' : 'border-border'">
              <p class="text-[11px] text-muted-foreground">{{ pp.libelle }}</p>
              <p class="text-sm font-semibold text-foreground">{{ pp.montant ? fmtAr(pp.montant) : '-' }}</p>
              <p class="text-[10px] text-muted-foreground">score ≥ {{ pp.min }}</p>
            </div>
          </div>
        </div>

        <!-- Bons carburant chauffeur : avantage personnel, jamais mêlé à la conso du véhicule. -->
        <div :class="L.card">
          <div class="flex items-center justify-between mb-3">
            <div :class="L.cardTitle" class="!mb-0"><Fuel class="w-4 h-4 text-primary" /> Bons carburant chauffeur</div>
            <span class="text-[11px] text-muted-foreground">{{ litresBonCeMois }} L ce mois-ci</span>
          </div>
          <p class="text-[11px] text-muted-foreground mb-3">
            Avantage remis au chauffeur, séparé du carburant du véhicule · n'entre jamais dans le calcul de
            consommation du camion.
          </p>
          <div v-if="!bonsCarburant.length" class="text-xs text-muted-foreground py-2">Aucun bon remis sur la période.</div>
          <div v-else class="flex flex-col gap-1.5">
            <div v-for="(b, i) in bonsCarburant" :key="i" class="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
              <span class="text-muted-foreground">{{ formatDate(b.date) }} · {{ b.libelle }}</span>
              <div class="flex items-center gap-2">
                <span class="font-semibold text-foreground">{{ b.litres }} L</span>
                <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">Remis au chauffeur</span>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
          <div :class="L.card">
            <div :class="L.cardTitle"><IdCard class="w-4 h-4 text-primary" /> Identité et habilitation</div>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
              <div><dt class="text-[11px] text-muted-foreground">CIN</dt><dd>{{ conducteur.cin }}</dd></div>
              <div><dt class="text-[11px] text-muted-foreground">Téléphone</dt><dd>{{ conducteur.telephone }}</dd></div>
              <div><dt class="text-[11px] text-muted-foreground">Entité</dt><dd>{{ conducteur.entiteNom }}</dd></div>
              <div>
                <dt class="text-[11px] text-muted-foreground">Habilitation</dt>
                <dd>
                  <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="conducteur.habilite ? 'bg-success-bg text-success' : 'bg-neutral-bg text-neutral'">
                    {{ conducteur.habilite ? 'Habilité' : 'Non habilité' }}
                  </span>
                </dd>
              </div>
            </dl>
            <RouterLink :to="{ name: 'admin-employes', query: { ouvrir: conducteur.id } }" class="text-[12px] text-primary hover:underline mt-3 inline-block">
              Ouvrir la fiche RH complète →
            </RouterLink>
          </div>

          <div :class="L.card">
            <div :class="L.cardTitle"><Truck class="w-4 h-4 text-primary" /> Affectation en cours</div>
            <template v-if="tracteurAffecte">
              <p class="font-mono text-sm font-semibold text-primary">{{ tracteurAffecte.immatriculation }}</p>
              <p class="text-[12px] text-muted-foreground">{{ tracteurAffecte.marque }} {{ tracteurAffecte.modele }}</p>
            </template>
            <p v-else class="text-[13px] text-muted-foreground italic">Aucune affectation active.</p>
          </div>
        </div>
      </div>

      <!-- ══ ITINÉRAIRES · écarts relevés ══════════════════════ -->
      <div v-else-if="tab === 'itineraires'" class="flex flex-col gap-3.5">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div :class="L.kpiCard"><div :class="L.kpiValue">{{ tauxConformiteItineraire }} %</div><div :class="L.kpiLabel">Conformité d'itinéraire</div></div>
          <div :class="L.kpiCard"><div :class="L.kpiValue">{{ ecartsDuConducteur.length }}</div><div :class="L.kpiLabel">Écarts sur la période</div></div>
          <div :class="L.kpiCard"><div :class="[L.kpiValue, depassementsKm ? 'text-warning' : '']">{{ depassementsKm }}</div><div :class="L.kpiLabel">Dépassements km / voyage</div></div>
          <div :class="L.kpiCard"><div :class="L.kpiValue">{{ kmMoyenParVoyage.toLocaleString('fr-FR') }}</div><div :class="L.kpiLabel">Km moyen par voyage</div></div>
        </div>

        <div :class="L.card">
          <div :class="L.cardTitle">Écarts relevés</div>
          <div v-if="!ecartsDuConducteur.length" class="text-xs text-muted-foreground py-3">Aucun écart sur la période.</div>
          <table v-else :class="L.table">
            <thead><tr>
              <th :class="L.th">Écart</th><th :class="L.th">Type</th><th :class="L.th">Nature</th><th :class="L.th">Détecté le</th><th :class="L.th"></th>
            </tr></thead>
            <tbody>
              <tr v-for="e in ecartsDuConducteur" :key="e.id">
                <td :class="L.td"><span class="font-mono text-xs">{{ e.id }}</span></td>
                <td :class="L.td"><span class="text-xs">{{ LIB_TYPE_ECART[e.type] }}</span></td>
                <td :class="L.td"><span :class="LIB_NATURE[e.nature].cls" class="text-[11px] font-medium px-2 py-0.5 rounded-full">{{ LIB_NATURE[e.nature].label }}</span></td>
                <td :class="L.td"><span class="text-xs">{{ fmtDateHeure(e.detecteLe) }}</span></td>
                <td :class="L.td"><button class="text-[11px] text-primary hover:underline bg-transparent border-0 cursor-pointer" @click="ficheEcartId = e.id">Ouvrir</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ CARBURANT ══════════════════════════════════════════ -->
      <div v-else-if="tab === 'carburant'" class="flex flex-col gap-3.5">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div :class="L.kpiCard"><div :class="L.kpiValue">{{ consoMoyenneConducteur }}</div><div :class="L.kpiLabel">Conso moyenne (L/100 km)</div></div>
          <div :class="L.kpiCard">
            <div :class="[L.kpiValue, ecartConsoConducteur > 5 ? 'text-danger' : ecartConsoConducteur > 0 ? 'text-warning' : 'text-success']">
              {{ ecartConsoConducteur > 0 ? '+' : '' }}{{ ecartConsoConducteur }} %
            </div>
            <div :class="L.kpiLabel">Écart à la référence trajet</div>
          </div>
          <div :class="L.kpiCard"><div :class="L.kpiValue">{{ rechargesDuConducteur.length }}</div><div :class="L.kpiLabel">Recharges sur la période</div></div>
        </div>

        <div :class="L.card">
          <div :class="L.cardTitle"><Fuel class="w-4 h-4 text-primary" /> Recharges</div>
          <div v-if="!rechargesDuConducteur.length" class="text-xs text-muted-foreground py-3">Aucune recharge sur la période.</div>
          <table v-else :class="L.table">
            <thead><tr>
              <th :class="L.th">Date</th><th :class="L.th">Véhicule</th><th :class="L.th">Litres</th><th :class="L.th">Lieu</th><th :class="L.th">Contrôles</th>
            </tr></thead>
            <tbody>
              <tr v-for="r in rechargesDuConducteur" :key="r.id" class="cursor-pointer hover:bg-background" @click="ficheRechargeId = r.id">
                <td :class="L.td"><span class="text-xs">{{ fmtDateHeure(r.date) }}</span></td>
                <td :class="L.td"><span class="font-mono text-xs">{{ r.vehiculePlaque }}</span></td>
                <td :class="L.td"><span class="text-xs">{{ r.litres }} L</span></td>
                <td :class="L.td"><span class="text-xs">{{ r.lieu }}</span></td>
                <td :class="L.td">
                  <span v-if="r.statut === 'valide'" class="text-[11px] px-2 py-0.5 rounded-full bg-success-bg text-success">Conforme</span>
                  <span v-else class="text-[11px] px-2 py-0.5 rounded-full bg-danger-bg text-danger">Anomalie</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ DOCUMENTS ══════════════════════════════════════════ -->
      <div v-else-if="tab === 'documents'" class="flex flex-col gap-3.5">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div :class="L.kpiCard"><div :class="L.kpiValue">{{ documentsConducteur.length }}</div><div :class="L.kpiLabel">Pièces au dossier</div></div>
          <div :class="L.kpiCard"><div :class="[L.kpiValue, 'text-success']">{{ documentsConducteur.length - docsProches - docsExpires }}</div><div :class="L.kpiLabel">Valides</div></div>
          <div :class="L.kpiCard"><div :class="[L.kpiValue, docsProches ? 'text-warning' : '']">{{ docsProches }}</div><div :class="L.kpiLabel">À renouveler</div></div>
          <div :class="L.kpiCard"><div :class="[L.kpiValue, docsExpires ? 'text-danger' : '']">{{ docsExpires }}</div><div :class="L.kpiLabel">Expirées</div></div>
        </div>

        <div :class="L.card">
          <div class="flex items-center justify-between mb-3">
            <div :class="L.cardTitle" class="!mb-0"><FileText class="w-4 h-4 text-primary" /> Pièces du dossier</div>
            <span class="text-[11px] text-muted-foreground">Alerte automatique {{ configStore.parametres.preavisDocumentaireJours }} jours avant échéance</span>
          </div>
          <div v-if="!documentsConducteur.length" class="text-xs text-muted-foreground py-3">Aucune pièce enregistrée pour ce conducteur.</div>
          <table v-else :class="L.table">
            <thead><tr>
              <th :class="L.th">Pièce</th><th :class="L.th">N°</th><th :class="L.th">Émission</th><th :class="L.th">Expiration</th><th :class="L.th">Échéance</th>
            </tr></thead>
            <tbody>
              <tr v-for="d in documentsConducteur" :key="d.id">
                <td :class="L.td"><span class="text-xs font-medium">{{ d.libelle }}</span></td>
                <td :class="L.td"><span class="font-mono text-[11px]">{{ d.reference ?? '-' }}</span></td>
                <td :class="L.td"><span class="text-xs">{{ formatDate(d.dateDelivrance) }}</span></td>
                <td :class="L.td"><span class="text-xs">{{ d.dateExpiration ? formatDate(d.dateExpiration) : '-' }}</span></td>
                <td :class="L.td"><span class="text-xs font-medium" :class="classeEtatDoc(docsPersonnel.etat(d))">{{ libelleEtatDoc(docsPersonnel.etat(d)) }}</span></td>
              </tr>
            </tbody>
          </table>
          <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Une pièce expirée bloque l'affectation du conducteur à un voyage. Le permis et la visite médicale sont
            les deux pièces obligatoires.
          </p>
        </div>
      </div>

      <!-- ══ FORMATIONS ═════════════════════════════════════════ -->
      <div v-else-if="tab === 'formations'" class="flex flex-col gap-3.5">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div :class="L.kpiCard"><div :class="L.kpiValue">{{ formationsConducteur.length }}</div><div :class="L.kpiLabel">Formations suivies</div></div>
          <div :class="L.kpiCard">
            <div :class="[L.kpiValue, habilitationsOk ? 'text-success' : 'text-danger']">{{ habilitations.filter(h => h.acquise).length }}/{{ habilitations.length }}</div>
            <div :class="L.kpiLabel">Habilitations acquises</div>
          </div>
          <div :class="L.kpiCard"><div :class="[L.kpiValue, formationsProches ? 'text-warning' : '']">{{ formationsProches }}</div><div :class="L.kpiLabel">À renouveler</div></div>
          <div :class="L.kpiCard"><div :class="[L.kpiValue, formationsExpirees ? 'text-danger' : '']">{{ formationsExpirees }}</div><div :class="L.kpiLabel">Expirées</div></div>
        </div>

        <div :class="L.card">
          <div :class="L.cardTitle"><GraduationCap class="w-4 h-4 text-primary" /> Formations suivies</div>
          <div v-if="!formationsConducteur.length" class="text-xs text-muted-foreground py-3">Aucune formation enregistrée.</div>
          <table v-else :class="L.table">
            <thead><tr><th :class="L.th">Formation</th><th :class="L.th">Suivie le</th><th :class="L.th">Valide jusqu'au</th><th :class="L.th">État</th></tr></thead>
            <tbody>
              <tr v-for="f in formationsConducteur" :key="f.id">
                <td :class="L.td"><span class="text-xs font-medium">{{ f.libelle }}</span></td>
                <td :class="L.td"><span class="text-xs">{{ formatDate(f.dateDelivrance) }}</span></td>
                <td :class="L.td"><span class="text-xs">{{ f.dateExpiration ? formatDate(f.dateExpiration) : 'sans échéance' }}</span></td>
                <td :class="L.td"><span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="classeEtatDoc(docsPersonnel.etat(f))">{{ libelleEtatDoc(docsPersonnel.etat(f)) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div :class="L.card">
          <div class="flex items-center justify-between mb-3">
            <div :class="L.cardTitle" class="!mb-0"><ShieldCheck class="w-4 h-4 text-primary" /> Habilitations obligatoires</div>
            <span class="text-[11px]" :class="habilitationsOk ? 'text-success' : 'text-danger'">{{ habilitations.filter(h => h.acquise).length }}/{{ habilitations.length }} acquises</span>
          </div>
          <div class="flex flex-col gap-1.5">
            <div v-for="h in habilitations" :key="h.code" class="flex items-start gap-2.5 rounded-md px-3 py-2" :class="h.acquise ? 'bg-background' : 'bg-danger-bg'">
              <component :is="h.acquise ? CircleCheck : XCircle" class="w-4 h-4 shrink-0 mt-px" :class="h.acquise ? 'text-success' : 'text-danger'" />
              <div class="min-w-0">
                <p class="text-xs font-medium" :class="h.acquise ? 'text-foreground' : 'text-danger'">{{ h.libelle }}</p>
                <p class="text-[11px] text-muted-foreground">{{ h.detail }}</p>
              </div>
            </div>
          </div>
          <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Un chauffeur sans permis ou visite médicale valides ne peut pas être affecté à un voyage. L'affectation
            est bloquée tant que la pièce n'est pas régularisée.
          </p>
        </div>
      </div>

      <!-- ══ PLANNING ═══════════════════════════════════════════ -->
      <div v-else-if="tab === 'planning'" class="flex flex-col gap-3.5">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div :class="L.kpiCard"><div :class="L.kpiValue">{{ voyagesEffectues }}</div><div :class="L.kpiLabel">Voyages effectués</div></div>
          <div :class="[L.kpiCard]"><div :class="[L.kpiValue, 'text-primary']">{{ voyagesAVenir }}</div><div :class="L.kpiLabel">À venir</div></div>
          <div :class="L.kpiCard"><div :class="L.kpiValue">{{ absencesConducteur.length }}</div><div :class="L.kpiLabel">Absences</div></div>
          <div :class="L.kpiCard"><div :class="[L.kpiValue, disponibilite.ok ? 'text-success' : 'text-danger']">{{ disponibilite.ok ? 'Oui' : 'Non' }}</div><div :class="L.kpiLabel">Disponibilité</div></div>
        </div>

        <div :class="L.card">
          <div :class="L.cardTitle"><CalendarCheck class="w-4 h-4 text-primary" /> Disponibilité</div>
          <div class="flex items-start gap-2.5 rounded-lg px-3.5 py-2.5" :class="disponibilite.ok ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">
            <component :is="disponibilite.ok ? CircleCheck : TriangleAlert" class="w-4 h-4 shrink-0 mt-px" />
            <div>
              <p class="text-xs font-medium">{{ disponibilite.titre }}</p>
              <p v-if="disponibilite.motifs.length" class="text-[11px] leading-snug mt-0.5">{{ disponibilite.motifs.join(' · ') }}</p>
            </div>
          </div>
        </div>

        <div :class="L.card">
          <div class="flex items-center justify-between mb-3">
            <div :class="L.cardTitle" class="!mb-0"><Package class="w-4 h-4 text-primary" /> Voyages</div>
            <span class="text-[11px] text-muted-foreground">{{ voyagesDuConducteur.length }} sur la période</span>
          </div>
          <div v-if="!voyagesDuConducteur.length" class="text-xs text-muted-foreground py-3">Aucun voyage affecté à ce conducteur.</div>
          <table v-else :class="L.table">
            <thead><tr><th :class="L.th">Voyage</th><th :class="L.th">Trajet</th><th :class="L.th">Véhicule</th><th :class="L.th">Date</th><th :class="L.th">Statut</th><th :class="L.th"></th></tr></thead>
            <tbody>
              <tr v-for="v in voyagesDuConducteur" :key="v.id">
                <td :class="L.td"><span class="font-mono text-xs font-semibold text-primary">{{ v.reference }}</span></td>
                <td :class="L.td">
                  <span class="text-xs">{{ v.origine }} → {{ v.destination }}</span>
                  <div class="text-[11px] text-muted-foreground">{{ v.etapes.length }} site(s)</div>
                </td>
                <td :class="L.td"><span class="font-mono text-xs">{{ v.vehiculePlaque ?? '-' }}</span></td>
                <td :class="L.td"><span class="text-xs">{{ fmtDateHeure(v.datePlanifiee) }}</span></td>
                <td :class="L.td"><StatusPill :statut="v.statut" :libelle="LIB_STATUT_VOYAGE[v.statut]" /></td>
                <td :class="L.td"><button class="text-[11px] text-primary hover:underline bg-transparent border-0 cursor-pointer" @click="ficheVoyageId = v.id">Ouvrir</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div :class="L.card">
          <div class="flex items-center justify-between mb-3">
            <div :class="L.cardTitle" class="!mb-0"><CalendarOff class="w-4 h-4 text-primary" /> Absences et congés</div>
            <span class="text-[11px] text-muted-foreground">source : module Administration</span>
          </div>
          <div v-if="!absencesConducteur.length" class="text-xs text-muted-foreground py-3">Aucune absence enregistrée sur la période.</div>
          <table v-else :class="L.table">
            <thead><tr><th :class="L.th">Type</th><th :class="L.th">Du</th><th :class="L.th">Au</th><th :class="L.th">Statut</th></tr></thead>
            <tbody>
              <tr v-for="a in absencesConducteur" :key="a.id">
                <td :class="L.td"><span class="text-xs font-medium">{{ a.type }}</span></td>
                <td :class="L.td"><span class="text-xs">{{ formatDate(a.debut) }}</span></td>
                <td :class="L.td"><span class="text-xs">{{ formatDate(a.fin) }}</span></td>
                <td :class="L.td"><span class="text-[11px] text-muted-foreground">{{ LIB_STATUT_DEMANDE[a.statut] }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ RESSOURCES HUMAINES ════════════════════════════════ -->
      <div v-else-if="tab === 'rh'" class="flex flex-col gap-3.5">
        <div :class="L.card">
          <div :class="L.cardTitle"><IdCard class="w-4 h-4 text-primary" /> Données administratives</div>
          <dl class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-xs">
            <div><dt class="text-muted-foreground text-[11px]">Permis de conduire</dt><dd :class="permisProche ? 'text-danger font-medium' : ''">{{ permisDoc ? 'expire le ' + formatDate(permisDoc.dateExpiration) : 'non renseigné' }}</dd></div>
            <div><dt class="text-muted-foreground text-[11px]">Visite médicale</dt><dd :class="visiteProche ? 'text-danger font-medium' : ''">{{ visiteDoc ? 'expire le ' + formatDate(visiteDoc.dateExpiration) : 'non renseignée' }}</dd></div>
            <div><dt class="text-muted-foreground text-[11px]">Voyages sur la période</dt><dd>{{ voyagesDuConducteur.length }}</dd></div>
            <div><dt class="text-muted-foreground text-[11px]">Kilométrage cumulé</dt><dd>{{ kmTotal.toLocaleString('fr-FR') }} km</dd></div>
            <div><dt class="text-muted-foreground text-[11px]">Écarts non justifiés</dt><dd>{{ ecartsDuConducteur.filter(e => e.nature === 'non_justifiee').length }}</dd></div>
            <div><dt class="text-muted-foreground text-[11px]">Écarts en cours de qualification</dt><dd>{{ ecartsDuConducteur.filter(e => e.nature === 'a_qualifier').length }}</dd></div>
          </dl>
        </div>

        <div :class="L.card">
          <div class="flex items-center justify-between mb-3">
            <div :class="L.cardTitle" class="!mb-0"><CalendarOff class="w-4 h-4 text-primary" /> Absences</div>
            <span class="text-[11px] text-muted-foreground">{{ absencesConducteur.length }} demande(s)</span>
          </div>
          <div v-if="!absencesConducteur.length" class="text-xs text-muted-foreground py-2">Aucune absence enregistrée.</div>
          <ul v-else class="flex flex-col gap-1.5">
            <li v-for="a in absencesConducteur.slice(0, 5)" :key="a.id" class="flex items-center justify-between text-xs">
              <span>{{ a.type }} · {{ formatDate(a.debut) }} → {{ formatDate(a.fin) }}</span>
              <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="classeStatutDemande(a.statut)">{{ LIB_STATUT_DEMANDE[a.statut] }}</span>
            </li>
          </ul>
        </div>

        <div :class="L.card">
          <div class="flex items-center justify-between mb-3">
            <div :class="L.cardTitle" class="!mb-0"><AlertCircle class="w-4 h-4 text-primary" /> Infractions internes & sanctions</div>
            <span v-if="sanctionsEnCours.length" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-warning-bg text-warning">{{ sanctionsEnCours.length }} en cours</span>
          </div>
          <div v-if="!sanctionsConducteur.length" class="text-xs text-muted-foreground py-2">Aucune infraction interne enregistrée pour ce conducteur.</div>
          <ul v-else class="flex flex-col gap-2.5">
            <li v-for="s in sanctionsConducteur" :key="s.id" class="rounded-lg border border-border px-3 py-2.5">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-foreground">{{ LIB_TYPE_ECART[s.type] }}</p>
                  <p class="text-[11px] text-muted-foreground">{{ formatDate(s.qualifieLe) }} · qualifié par {{ s.qualifiePar }}</p>
                </div>
                <span class="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 bg-neutral-bg text-neutral">{{ LIB_DECISION[s.decision!] }}</span>
              </div>
              <p class="text-xs text-foreground mt-1.5 leading-relaxed">{{ s.motifQualification }}</p>
              <span v-if="s.voyageRef" class="text-[11px] font-mono text-muted-foreground">Voyage {{ s.voyageRef }}</span>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <VoyageCard v-if="ficheVoyageId" :voyages="voyagesStore.voyages" :voyage-id="ficheVoyageId" @close="ficheVoyageId = null" />
    <RechargeCard v-if="ficheRechargeId" :recharges="carburantStore.recharges" :recharge-id="ficheRechargeId" @close="ficheRechargeId = null" />
    <EcartCard v-if="ficheEcartId" :ecarts="ecartsStore.ecarts" :ecart-id="ficheEcartId" @close="ficheEcartId = null"
               @ouvrir-voyage="id => { ficheEcartId = null; ficheVoyageId = id }" @voir-conducteur="() => {}" />
  </div>
</template>

<script setup lang="ts">
/**
 * Tableau de bord personnel du conducteur, copié à la lettre de
 * ConducteurDetailView du socle FMS : sept onglets exactement (Score & prime,
 * Itinéraires, Carburant, Documents, Formations, Planning, Ressources
 * humaines), même structure de KPI et de tableaux, données UCODIS. Les
 * habilitations obligatoires du socle FMS (ADR, APTH · transport
 * d'hydrocarbures) sont remplacées par permis et visite médicale,
 * seules pièces obligatoires du cahier des charges UCODIS.
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import {
  AlertCircle, ArrowLeft, Award, CalendarCheck, CalendarOff, ChevronLeft, ChevronRight,
  CircleCheck, Fuel, Gauge, GraduationCap, IdCard, Package, ShieldCheck, TriangleAlert, Truck, UserX, XCircle,
} from '@lucide/vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import VoyageCard from '../../components/flotte/VoyageCard.vue'
import RechargeCard from '../../components/flotte/RechargeCard.vue'
import EcartCard from '../../components/flotte/EcartCard.vue'
import { usePersonnelStore } from '../../stores/personnel'
import { useVehiculeStore } from '../../stores/vehicules'
import { useVoyagesStore } from '../../stores/voyages'
import { useCarburantStore } from '../../stores/carburant'
import { useEcartsStore, LIB_TYPE_ECART, LIB_NATURE } from '../../stores/ecarts'
import { useDocumentsStore } from '../../stores/documentsPersonnel'
import { useScoresConducteursStore, PONDERATIONS } from '../../stores/scoresConducteurs'
import { useConfigurationStore } from '../../stores/configuration'
import { useAbsenceStore } from '../../stores/absences'
import { formatDate, etatEcheance } from '../../utils/helpers'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'
import type { DecisionEcart } from '../../types'

const route = useRoute()
const router = useRouter()
const personnel = usePersonnelStore()
const vehicules = useVehiculeStore()
const voyagesStore = useVoyagesStore()
const carburantStore = useCarburantStore()
const ecartsStore = useEcartsStore()
const docsPersonnel = useDocumentsStore()
const scoresStore = useScoresConducteursStore()
const configStore = useConfigurationStore()
const absencesStore = useAbsenceStore()

function fmtAr(n: number) { return `${n.toLocaleString('fr-FR')} Ar` }
function couleurScore(s: number) { return s >= 80 ? 'text-success' : s >= 60 ? 'text-warning' : 'text-danger' }

const conducteurId = computed(() => String(route.params.id))
const conducteur = computed(() => personnel.parId(conducteurId.value))
const conducteurs = computed(() => personnel.conducteurs)
const indexCourant = computed(() => conducteurs.value.findIndex(c => c.id === conducteurId.value))
function naviguer(delta: number) {
  const cible = conducteurs.value[indexCourant.value + delta]
  if (cible) router.replace({ name: 'flotte-conducteur-dashboard', params: { id: cible.id } })
}

const LIB_STATUT_VOYAGE: Record<string, string> = {
  planifie: 'Planifié', affecte: 'Affecté', en_cours: 'En cours', livre: 'Livré', cloture: 'Clôturé', litige: 'En litige', annule: 'Annulé',
}
const LIB_STATUT_DEMANDE: Record<string, string> = {
  brouillon: 'Brouillon', attente: 'En attente', approuve: 'Approuvée', refuse: 'Refusée', retourne: 'Retournée',
}
const CLS_STATUT_DEMANDE: Record<string, string> = {
  brouillon: 'bg-neutral-bg text-neutral', attente: 'bg-warning-bg text-warning', approuve: 'bg-success-bg text-success',
  refuse: 'bg-danger-bg text-danger', retourne: 'bg-info-bg text-info',
}
function classeStatutDemande(s: string) { return CLS_STATUT_DEMANDE[s] ?? '' }
const LIB_DECISION: Record<DecisionEcart, string> = { classe: 'Classement sans suite', avertissement: 'Avertissement', sanction: 'Signalement à la Direction' }

const voyagesDuConducteur = computed(() => [...voyagesStore.voyages].filter(v => v.chauffeurId === conducteurId.value).sort((a, b) => +new Date(b.datePlanifiee) - +new Date(a.datePlanifiee)))
const kmTotal = computed(() => voyagesDuConducteur.value.reduce((s, v) => s + (v.kmArrivee != null && v.kmDepart != null ? v.kmArrivee - v.kmDepart : 0), 0))
const rechargesDuConducteur = computed(() => carburantStore.recharges.filter(r => r.chauffeurId === conducteurId.value))
const ecartsDuConducteur = computed(() => ecartsStore.ecartsDuChauffeur(conducteurId.value))

const tauxConformiteConducteur = computed(() => {
  const total = ecartsDuConducteur.value.length
  if (!total) return 100
  const infractions = ecartsDuConducteur.value.filter(e => e.nature === 'non_justifiee').length
  return Math.round(((total - infractions) / total) * 100)
})

const tracteurAffecte = computed(() => {
  const af = vehicules.affectations.find(a => a.conducteurId === conducteurId.value && !a.dateFin)
  return af ? vehicules.parId(af.vehiculeId) : null
})

/** Score & prime */
const scoreGlobal = computed(() => scoresStore.scoreGlobal(conducteurId.value))
const deltaScore = computed(() => scoresStore.delta(conducteurId.value))
const famillesScore = computed(() => scoresStore.familles(conducteurId.value))
const primeEligible = computed(() => scoresStore.primeEligible(conducteurId.value))
const motifNonEligibilite = computed(() => scoresStore.motifNonEligibilite(conducteurId.value))
const palierPrime = computed(() => scoresStore.palier(scoreGlobal.value))
const bonsCarburant = computed(() => scoresStore.bonsCarburantChauffeur(conducteurId.value))
const litresBonCeMois = computed(() => scoresStore.litresBonCeMois(conducteurId.value))

/** Itinéraires */
const tauxConformiteItineraire = tauxConformiteConducteur
const depassementsKm = computed(() => ecartsDuConducteur.value.filter(e => e.type === 'ecart_kilometrique').length)
const kmMoyenParVoyage = computed(() => (voyagesDuConducteur.value.length ? Math.round(kmTotal.value / voyagesDuConducteur.value.length) : 0))

/** Carburant */
const consoMoyenneConducteur = computed(() => {
  const p = carburantStore.periodesConso.filter(pc => rechargesDuConducteur.value.some(r => r.vehiculeId === pc.vehiculeId))
  if (!p.length) return 0
  return Math.round((p.reduce((s, x) => s + x.litresPour100km, 0) / p.length) * 10) / 10
})
const ecartConsoConducteur = computed(() => {
  const p = carburantStore.periodesConso.filter(pc => rechargesDuConducteur.value.some(r => r.vehiculeId === pc.vehiculeId))
  if (!p.length) return 0
  return Math.round((p.reduce((s, x) => s + x.ecartPct, 0) / p.length) * 10) / 10
})

/** Documents */
const documentsConducteur = computed(() => (conducteur.value ? docsPersonnel.parPersonnel(conducteur.value.id) : []))
const docsExpires = computed(() => documentsConducteur.value.filter(d => docsPersonnel.etat(d) === 'expire').length)
const docsProches = computed(() => documentsConducteur.value.filter(d => docsPersonnel.etat(d) === 'proche').length)
const docsAlerte = computed(() => docsExpires.value + docsProches.value)
function classeEtatDoc(e: string) { return e === 'expire' ? 'text-danger' : e === 'proche' ? 'text-warning' : 'text-success' }
function libelleEtatDoc(e: string) { return e === 'expire' ? 'Expiré' : e === 'proche' ? 'À renouveler' : 'Valide' }

const echeances = computed(() => {
  if (!conducteur.value) return []
  return documentsConducteur.value
    .filter(d => docsPersonnel.etat(d) === 'expire' || docsPersonnel.etat(d) === 'proche')
    .map(d => ({ type: d.libelle, date: d.dateExpiration, expire: docsPersonnel.etat(d) === 'expire' }))
})

/** Formations */
const formationsConducteur = computed(() => documentsConducteur.value.filter(d => d.type === 'formation'))
const formationsExpirees = computed(() => formationsConducteur.value.filter(f => docsPersonnel.etat(f) === 'expire').length)
const formationsProches = computed(() => formationsConducteur.value.filter(f => docsPersonnel.etat(f) === 'proche').length)
const formationsAlerte = computed(() => formationsExpirees.value + formationsProches.value)

const permisDoc = computed(() => documentsConducteur.value.find(d => d.type === 'permis'))
const visiteDoc = computed(() => documentsConducteur.value.find(d => d.type === 'visite_medicale'))
const permisProche = computed(() => permisDoc.value && ['expire', 'proche'].includes(docsPersonnel.etat(permisDoc.value)))
const visiteProche = computed(() => visiteDoc.value && ['expire', 'proche'].includes(docsPersonnel.etat(visiteDoc.value)))

/** Habilitations obligatoires UCODIS : permis et visite médicale, les deux
 *  pièces exigées par le cahier des charges (pas d'équivalent ADR/APTH,
 *  UCODIS transportant du fret sec, non des matières dangereuses). */
const habilitations = computed(() => {
  const construire = (code: string, libelle: string, doc: typeof permisDoc.value) => {
    const etat = doc ? docsPersonnel.etat(doc) : 'absent'
    return {
      code, libelle,
      acquise: !!doc && etat !== 'expire' && etat !== 'absent',
      detail: !doc ? 'Non déposé · affectation bloquée'
        : etat === 'expire' ? `Expiré le ${formatDate(doc.dateExpiration)}`
        : doc.dateExpiration ? `Valide jusqu'au ${formatDate(doc.dateExpiration)}`
        : `Déposé le ${formatDate(doc.dateDelivrance)}`,
    }
  }
  return [
    construire('PERMIS', 'Permis de conduire valide', permisDoc.value),
    construire('MEDICAL', 'Visite médicale valide', visiteDoc.value),
  ]
})
const habilitationsOk = computed(() => habilitations.value.every(h => h.acquise))

/** Planning */
const voyagesAVenir = computed(() => voyagesDuConducteur.value.filter(v => v.statut === 'planifie' || v.statut === 'affecte').length)
const voyagesEffectues = computed(() => voyagesDuConducteur.value.filter(v => v.statut === 'cloture' || v.statut === 'livre').length)
const absencesConducteur = computed(() => (conducteur.value ? absencesStore.mesDemandes(conducteur.value.id) : []))

const disponibilite = computed(() => {
  const motifs: string[] = []
  if (docsExpires.value) motifs.push(`${docsExpires.value} document(s) expiré(s)`)
  if (!habilitationsOk.value) {
    const manquantes = habilitations.value.filter(h => !h.acquise).map(h => h.code)
    motifs.push(`habilitation(s) manquante(s) : ${manquantes.join(', ')}`)
  }
  const aujourdhui = new Date().toISOString().slice(0, 10)
  const enCours = absencesConducteur.value.find(a => a.debut <= aujourdhui && a.fin >= aujourdhui && a.statut === 'approuve')
  if (enCours) motifs.push(`absence en cours jusqu'au ${formatDate(enCours.fin)}`)
  return {
    ok: motifs.length === 0,
    titre: motifs.length === 0 ? 'Disponible · le conducteur peut être affecté à un voyage' : 'Indisponible · affectation bloquée',
    motifs,
  }
})

/** Ressources humaines : infractions internes dérivées des écarts déjà
 *  qualifiés avec une suite disciplinaire, plutôt qu'un registre séparé
 *  qui dupliquerait la même donnée. */
const sanctionsConducteur = computed(() => ecartsDuConducteur.value.filter(e => e.decision && e.decision !== 'classe'))
const sanctionsEnCours = computed(() => sanctionsConducteur.value.filter(e => e.nature === 'a_qualifier'))

type OngletCle = 'score' | 'itineraires' | 'carburant' | 'documents' | 'formations' | 'planning' | 'rh'
const tab = ref<OngletCle>('score')
const tabs = computed(() => [
  { key: 'score' as const, label: 'Score & prime' },
  { key: 'itineraires' as const, label: 'Itinéraires' },
  { key: 'carburant' as const, label: 'Carburant' },
  { key: 'documents' as const, label: 'Documents', badge: docsAlerte.value || undefined },
  { key: 'formations' as const, label: 'Formations', badge: formationsAlerte.value || undefined },
  { key: 'planning' as const, label: 'Planning' },
  { key: 'rh' as const, label: 'Ressources humaines' },
])

const ficheVoyageId = ref<string | null>(null)
const ficheRechargeId = ref<string | null>(null)
const ficheEcartId = ref<string | null>(null)
</script>
