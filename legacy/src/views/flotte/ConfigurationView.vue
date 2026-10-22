<template>
  <div :class="L.pageWrap">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Configuration</div>
        <div :class="L.pageSub">Données de référence de l'exploitation</div>
      </div>
    </div>

    <div class="flex gap-1 border-b border-border mb-3.5 overflow-x-auto">
      <button
        v-for="t in onglets" :key="t.key" @click="onglet = t.key"
        class="px-3.5 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer bg-transparent"
        :class="onglet === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'"
      >
        {{ t.label }}
        <span v-if="t.compte" class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-background text-muted-foreground">{{ t.compte }}</span>
      </button>
    </div>

    <!-- ══ TRAJETS DE RÉFÉRENCE ══════════════════════════════ -->
    <div v-if="onglet === 'trajets'" class="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-3.5 items-start">
      <div class="flex flex-col gap-2">
        <button :class="L.btnPrimary" class="justify-center" @click="ouvrirNouveauTrajet">
          <Plus class="w-4 h-4" /> Nouveau trajet de référence
        </button>

        <label class="flex items-center gap-2 text-[11px] text-muted-foreground px-1 py-1 cursor-pointer">
          <input v-model="afficherArchives" type="checkbox" class="cursor-pointer" />
          Afficher les trajets archivés
        </label>

        <button
          v-for="t in trajetsAffiches" :key="t.id"
          class="text-left rounded-lg border px-3.5 py-3 cursor-pointer transition-colors"
          :class="trajetSel === t.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-background'"
          @click="trajetSel = t.id"
        >
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="font-mono text-xs font-semibold text-foreground">{{ t.code }}</span>
            <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="t.statut === 'actif' ? 'bg-success-bg text-success' : 'bg-background text-muted-foreground'">
              {{ t.statut === 'actif' ? 'Actif' : 'Archivé' }}
            </span>
          </div>
          <p class="text-[13px] font-medium text-foreground">{{ t.libelle }}</p>
          <div class="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
            <span>{{ t.etapes.length }} sites</span>
            <span>{{ t.distanceEstimeeKm }} km</span>
            <span>{{ fmtDuree(t.dureeEstimeeMin) }}</span>
          </div>
        </button>
      </div>

      <div v-if="trajet" :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <h2 :class="L.cardTitle" class="!mb-0"><Route class="w-4 h-4 text-primary" /> {{ trajet.libelle }}</h2>
          <div class="flex items-center gap-2">
            <span v-if="trajet.clientNom" class="text-[11px] text-muted-foreground">{{ trajet.clientNom }}</span>
            <button class="text-[11px] font-medium px-2 py-1 rounded-md border border-border text-foreground bg-card cursor-pointer hover:bg-background flex items-center gap-1" @click="ouvrirEditionTrajet(trajet)">
              <Pencil class="w-3 h-3" /> Modifier
            </button>
            <button v-if="trajet.statut === 'actif'" class="text-[11px] font-medium px-2 py-1 rounded-md border border-danger/30 text-danger bg-card cursor-pointer hover:bg-danger-bg flex items-center gap-1" @click="trajetsStore.archiver(trajet.id)">
              <Archive class="w-3 h-3" /> Archiver
            </button>
            <button v-else class="text-[11px] font-medium px-2 py-1 rounded-md border border-border text-foreground bg-card cursor-pointer hover:bg-background flex items-center gap-1" @click="trajetsStore.update(trajet.id, { statut: 'actif' })">
              <Undo2 class="w-3 h-3" /> Réactiver
            </button>
          </div>
        </div>

        <FleetMap :trace-prevu="trajetsStore.traceDe(trajet.etapes)" :marqueurs="marqueursTrajet" height="320px" :show-legend="false" />

        <table :class="L.table" class="mt-3">
          <thead><tr>
            <th :class="L.th">#</th>
            <th :class="L.th">Site</th>
            <th :class="L.th">Rôle</th>
            <th :class="L.th">Intervalle</th>
            <th :class="L.th">Pause</th>
            <th :class="L.th"></th>
          </tr></thead>
          <tbody>
            <tr v-for="(e, i) in trajet.etapes" :key="e.id">
              <td :class="L.td" class="text-muted-foreground font-mono text-xs">{{ e.ordre }}</td>
              <td :class="L.td" class="font-medium text-xs">{{ e.siteNom }}</td>
              <td :class="L.td">
                <select :value="e.role" :class="F.fieldSelect" class="!h-[28px] !text-[11px] w-[130px]" @change="ev => majEtape(i, { role: (ev.target as HTMLSelectElement).value as RoleEtape })">
                  <option v-for="(lib, r) in LIB_ROLE_ETAPE" :key="r" :value="r">{{ lib }}</option>
                </select>
                <label v-if="e.role === 'livraison'" class="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground cursor-pointer">
                  <input type="checkbox" class="accent-primary" :checked="!!e.pompeExigee" @change="majEtape(i, { pompeExigee: !e.pompeExigee })" /> Pompe exigée
                </label>
              </td>
              <td :class="L.td">
                <input :value="e.intervalleMin ?? 0" type="number" min="0" step="5" :class="F.fieldInput" class="!h-[28px] !text-[11px] w-[80px]" @change="ev => majEtape(i, { intervalleMin: Number((ev.target as HTMLInputElement).value) })" />
              </td>
              <td :class="L.td">
                <input :value="e.pausePrevueMin ?? 0" type="number" min="0" step="5" :class="F.fieldInput" class="!h-[28px] !text-[11px] w-[80px]" @change="ev => majEtape(i, { pausePrevueMin: Number((ev.target as HTMLInputElement).value) })" />
              </td>
              <td :class="L.td">
                <div class="flex items-center gap-0.5">
                  <button class="w-6 h-6 flex items-center justify-center rounded text-muted-foreground disabled:opacity-30 cursor-pointer hover:bg-background bg-transparent border-0" :disabled="i === 0" title="Monter" @click="deplacerEtape(i, -1)">
                    <ChevronUp class="w-3.5 h-3.5" />
                  </button>
                  <button class="w-6 h-6 flex items-center justify-center rounded text-muted-foreground disabled:opacity-30 cursor-pointer hover:bg-background bg-transparent border-0" :disabled="i === trajet.etapes.length - 1" title="Descendre" @click="deplacerEtape(i, 1)">
                    <ChevronDown class="w-3.5 h-3.5" />
                  </button>
                  <button class="w-6 h-6 flex items-center justify-center rounded text-danger cursor-pointer hover:bg-danger-bg bg-transparent border-0" title="Retirer l'étape" @click="retirerEtape(i)">
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!trajet.etapes.length">
              <td :class="L.td" colspan="6" class="text-center text-muted-foreground text-xs py-4">Aucun site dans la séquence.</td>
            </tr>
          </tbody>
        </table>

        <!-- Ajout d'une étape : le trajet est une séquence de sites ordonnés, jamais un itinéraire calculé. -->
        <div class="flex flex-wrap items-end gap-2 mt-3">
          <div :class="F.field" class="min-w-[240px]">
            <label :class="F.fieldLabel">Ajouter un site à la séquence</label>
            <SearchableDropdown v-model="siteAAjouter" :items="optionsSites" placeholder="Choisir un site…" compact />
          </div>
          <div :class="F.field" class="w-[150px]">
            <label :class="F.fieldLabel">Rôle</label>
            <SearchableDropdown v-model="roleAAjouter" :items="optRoleEtape" placeholder="Sélectionner…" />
          </div>
          <button :class="L.btnOutline" class="!h-[32px] !py-0" :disabled="!siteAAjouter" @click="ajouterEtape">
            <Plus class="w-3.5 h-3.5" /> Ajouter
          </button>
          <p class="text-[11px] text-muted-foreground ml-auto">
            {{ trajet.distanceEstimeeKm }} km · {{ fmtDuree(trajet.dureeEstimeeMin) }}
          </p>
        </div>
      </div>
      <div v-else :class="L.emptyState"><Route class="w-8 h-8" /><p>Sélectionnez un trajet</p></div>
    </div>

    <!-- ══ TYPES D'ÉCART ═════════════════════════════════════ -->
    <div v-else-if="onglet === 'ecarts'" class="flex flex-col gap-3.5">
      <div v-for="(liste, cat) in typesEcartStore.parCategorie" :key="cat" :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <h2 :class="L.cardTitle" class="!mb-0">{{ LIB_CATEGORIE_ECART[cat] }}</h2>
          <span class="text-[11px] text-muted-foreground">{{ liste.length }} type(s)</span>
        </div>
        <table :class="L.table">
          <thead><tr>
            <th :class="L.th">Code</th>
            <th :class="L.th">Libellé</th>
            <th :class="L.th">Gravité</th>
            <th :class="L.th">Seuil</th>
            <th :class="L.th">Actif</th>
            <th :class="L.th"></th>
          </tr></thead>
          <tbody>
            <tr v-for="t in liste" :key="t.id">
              <td :class="L.td"><span class="font-mono text-xs">{{ t.code }}</span></td>
              <td :class="L.td">
                <span class="text-xs font-medium">{{ t.libelle }}</span>
                <div v-if="t.description" class="text-[11px] text-muted-foreground">{{ t.description }}</div>
              </td>
              <td :class="L.td">
                <select :value="t.gravite" :class="F.fieldSelect" class="!h-[28px] !text-[11px] w-[100px]" @change="e => typesEcartStore.majType(t.id, { gravite: (e.target as HTMLSelectElement).value as GraviteEcart })">
                  <option value="mineur">Mineur</option>
                  <option value="majeur">Majeur</option>
                  <option value="critique">Critique</option>
                </select>
              </td>
              <td :class="L.td">
                <span v-if="SEUIL_PARAMETRE[t.code]" class="text-xs">{{ p[SEUIL_PARAMETRE[t.code]!] }} {{ t.seuilUnite }}</span>
                <div v-else-if="t.seuilValeur != null" class="flex items-center gap-1">
                  <input :value="t.seuilValeur" type="number" min="0" :class="F.fieldInput" class="!h-[28px] !text-[11px] w-[70px]" @change="ev => majSeuilType(t.id, (ev.target as HTMLInputElement).value)" />
                  <span class="text-[11px] text-muted-foreground">{{ t.seuilUnite }}</span>
                </div>
                <span v-else class="text-muted-foreground">-</span>
                <p v-if="erreursSeuil[t.id]" class="text-[11px] text-danger">{{ erreursSeuil[t.id] }}</p>
              </td>
              <td :class="L.td">
                <button class="text-[11px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer" :class="t.actif ? 'bg-success-bg text-success' : 'bg-background text-muted-foreground'" @click="typesEcartStore.basculerActif(t.id)">
                  {{ t.actif ? 'Actif' : 'Inactif' }}
                </button>
              </td>
              <td :class="L.td">
                <button class="text-[11px] font-medium text-primary hover:underline bg-transparent border-0 cursor-pointer flex items-center gap-1" @click="ouvrirEditionType(t)">
                  <Pencil class="w-3 h-3" /> Modifier
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ CLIENTS ═══════════════════════════════════════════ -->
    <div v-else-if="onglet === 'clients'" class="flex flex-col gap-3.5">
      <div :class="L.card">
        <div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 :class="L.cardTitle" class="!mb-0">Clients</h2>
          <div class="flex items-center gap-2">
            <button :class="L.btnOutline" @click="clientsStore.reinitialiser(); erreurClients = ''"><Undo2 class="w-4 h-4" /> Revenir aux valeurs de départ</button>
            <button :class="L.btnPrimary" @click="ouvrirNouveauClient"><Plus class="w-4 h-4" /> Nouveau client</button>
          </div>
        </div>
        <p v-if="erreurClients" class="text-[12px] text-danger mb-2">{{ erreurClients }}</p>
        <div class="overflow-x-auto">
        <table :class="L.table">
          <thead><tr>
            <th :class="L.th">Nom</th>
            <th :class="L.th">Rôle</th>
            <th :class="L.th">Nature</th>
            <th :class="L.th">Adresse</th>
            <th :class="L.th">Contact</th>
            <th :class="L.th">Téléphone</th>
            <th :class="L.th">E-mail</th>
            <th :class="L.th">Notifications</th>
            <th :class="L.th"></th>
          </tr></thead>
          <tbody>
            <tr v-for="c in clientsStore.clients" :key="c.id">
              <td :class="L.td" class="font-medium">{{ c.nom }}</td>
              <td :class="L.td" class="text-muted-foreground whitespace-nowrap">{{ libelleRoles(c) }}</td>
              <td :class="L.td" class="text-muted-foreground whitespace-nowrap">{{ LIB_NATURE_TIERS[c.nature ?? 'externe'] }}</td>
              <td :class="L.td" class="text-muted-foreground">{{ [c.adresse, c.ville].filter(Boolean).join(', ') || '-' }}</td>
              <td :class="L.td" class="text-muted-foreground">{{ c.contact ?? '-' }}</td>
              <td :class="L.td" class="text-muted-foreground whitespace-nowrap">{{ c.telephone ?? '-' }}</td>
              <td :class="L.td" class="text-muted-foreground">{{ c.email ?? '-' }}</td>
              <td :class="L.td" class="text-muted-foreground whitespace-nowrap">{{ LIB_CANAL[c.canalPrefere ?? 'sms'] }}</td>
              <td :class="L.td">
                <div class="flex items-center gap-2">
                  <button class="text-[11px] text-primary hover:underline bg-transparent border-0 cursor-pointer" @click="ouvrirEditionClient(c)">Modifier</button>
                  <button class="text-[11px] text-danger hover:underline bg-transparent border-0 cursor-pointer" @click="supprimerClient(c.id)">Supprimer</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>

    <!-- ══ PARAMÈTRES ════════════════════════════════════════ -->
    <div v-else-if="onglet === 'parametres'" class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">

      <div :class="L.card">
        <div class="flex items-center gap-2 mb-3"><Clock class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Temps de conduite et de repos</h2></div>
        <div class="grid grid-cols-2 gap-3">
          <div v-for="c in CHAMPS_TEMPS" :key="c.cle" :class="F.field">
            <label :class="F.fieldLabel">{{ c.libelle }}</label>
            <input v-model.number="p[c.cle]" type="number" min="0" :class="[F.fieldInput, configStore.seuilHorsBornes(c.cle) ? 'border-danger' : '']" />
            <p v-if="configStore.seuilHorsBornes(c.cle)" class="text-[11px] text-danger flex items-center gap-1">
              <AlertCircle class="w-3 h-3" /> Attendu entre {{ configStore.BORNES_SEUILS[c.cle].min }} et {{ configStore.BORNES_SEUILS[c.cle].max }} {{ configStore.BORNES_SEUILS[c.cle].unite }}.
            </p>
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Plafond de conduite sur deux semaines (h)</label>
            <input :value="p.plafondBihebdoH ?? ''" type="number" min="0" placeholder="Non contrôlé" :class="[F.fieldInput, configStore.seuilHorsBornes('plafondBihebdoH') ? 'border-danger' : '']" @input="majBihebdo($event.target as HTMLInputElement)" />
            <p v-if="configStore.seuilHorsBornes('plafondBihebdoH')" class="text-[11px] text-danger flex items-center gap-1">
              <AlertCircle class="w-3 h-3" /> Attendu entre {{ configStore.BORNES_SEUILS.plafondBihebdoH.min }} et {{ configStore.BORNES_SEUILS.plafondBihebdoH.max }} h.
            </p>
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Conduite de nuit non autorisée : début</label>
            <input :value="nuit.debut" type="time" :class="[F.fieldInput, erreurNuit ? 'border-danger' : '']" @change="majNuit('debut', ($event.target as HTMLInputElement).value)" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Conduite de nuit non autorisée : fin</label>
            <input :value="nuit.fin" type="time" :class="[F.fieldInput, erreurNuit ? 'border-danger' : '']" @change="majNuit('fin', ($event.target as HTMLInputElement).value)" />
          </div>
          <p v-if="erreurNuit" class="col-span-2 text-[11px] text-danger flex items-center gap-1"><AlertCircle class="w-3 h-3" /> {{ erreurNuit }}</p>
        </div>
      </div>

      <!-- Seuils d'alerte : gouvernent le déclenchement des alertes. -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <h2 :class="L.cardTitle" class="!mb-0"><BellRing class="w-4 h-4 text-primary" /> Seuils d'alerte</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <p class="text-xs font-semibold text-foreground">Rayon par défaut d'un site sans zone</p>
            <div :class="F.field">
              <label :class="F.fieldLabel">Distance au site (m)</label>
              <input v-model.number="p.rayonValidationPassageM" type="number" min="0" step="100" :class="[F.fieldInput, configStore.seuilHorsBornes('rayonValidationPassageM') ? 'border-danger' : '']" />
            </div>
            <p v-if="configStore.seuilHorsBornes('rayonValidationPassageM')" class="text-[11px] text-danger flex items-center gap-1">
              <AlertCircle class="w-3 h-3" /> Attendu entre {{ configStore.BORNES_SEUILS.rayonValidationPassageM.min }} et {{ configStore.BORNES_SEUILS.rayonValidationPassageM.max.toLocaleString('fr-FR') }} m.
            </p>
          </div>

        </div>
      </div>

      <!-- Entreprise : monnaie et fonctions du personnel roulant -->
      <div :class="L.card" class="lg:col-span-2">
        <div class="flex items-center gap-2 mb-3"><Building2 class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Entreprise</h2></div>
        <div class="grid grid-cols-1 md:grid-cols-[180px_1fr_1fr] gap-4">
          <div :class="F.field">
            <label :class="F.fieldLabel">Monnaie des montants</label>
            <input v-model="p.devise" :class="F.fieldInput" maxlength="6" placeholder="ex. EUR" />
            <p v-if="!p.devise?.trim()" class="text-[11px] text-warning mt-0.5">Monnaie vide : les montants s'affichent sans unité.</p>
          </div>
          <div v-for="g in GROUPES_FONCTIONS" :key="g.cle">
            <p :class="F.fieldLabel" class="mb-1.5">{{ g.libelle }}</p>
            <div class="flex flex-wrap gap-1">
              <button v-for="f in fonctionsStore.liste" :key="f.id" type="button" class="px-2 py-0.5 rounded-full text-[11px] border-0 cursor-pointer"
                :class="p[g.cle].includes(f.id) ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground'" @click="basculerFonction(g.cle, f.id)">{{ f.libelle }}</button>
            </div>
          </div>
        </div>
        <p v-if="erreurFonction" class="text-[12px] text-danger mt-2">{{ erreurFonction }}</p>
        <div class="mt-3">
          <p :class="F.fieldLabel" class="mb-1.5">Types de contrat</p>
          <div class="flex flex-wrap items-center gap-1">
            <span v-for="t in p.typesContrat" :key="t" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary">{{ t }}<button type="button" class="bg-transparent border-0 p-0 cursor-pointer text-danger" :title="`Retirer ${t}`" @click="retirerContrat(t)">×</button></span>
            <input v-model="nouveauContrat" :class="F.fieldInput" class="!h-[28px] !w-[150px] !text-[12px]" placeholder="nouveau type" @keyup.enter="ajouterContrat" />
            <button type="button" :class="F.btnOutline" class="!py-1 !text-[12px]" @click="ajouterContrat">Ajouter</button>
          </div>
          <p v-if="erreurContrat" class="text-[12px] text-danger mt-1">{{ erreurContrat }}</p>
        </div>
        <label class="flex items-center gap-2 text-[13px] cursor-pointer mt-3"><input v-model="p.gestionPersonnelRaccordee" type="checkbox" class="accent-primary" /> Gestion du personnel raccordée</label>
      </div>
    </div>

    <ConfigCarburantOnglet v-if="onglet === 'carburant'" />
    <ConfigDocumentsOnglet v-if="onglet === 'documents'" />
    <ConfigSecuriteOnglet v-if="onglet === 'securite'" @aller="k => (onglet = k as Onglet)" />
    <ConfigTelematiqueOnglet v-if="onglet === 'telematique'" />
    <ConfigReferentielsOnglet v-if="onglet === 'referentiels'" />
    <ConfigImportsIndicateursOnglet v-if="onglet === 'imports'" />

    <!-- ══ Type d'écart : modification ═══════════════════════ -->
    <div v-if="formType" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4" @click.self="formType = null">
      <div class="bg-card rounded-lg border border-border shadow-lg w-full max-w-lg p-4">
        <h3 class="text-sm font-semibold text-foreground mb-3">Modifier le type d'écart</h3>

        <div class="grid grid-cols-2 gap-3">
          <div :class="F.field">
            <label :class="F.fieldLabel">Code</label>
            <span class="h-[38px] flex items-center font-mono text-[13px] text-foreground">{{ formType.code }}</span>
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Catégorie *</label>
            <SearchableDropdown v-model="formType.categorie" :items="optCategorieEcart" placeholder="Sélectionner…" />
          </div>
          <div :class="F.field" class="col-span-2">
            <label :class="F.fieldLabel">Libellé *</label>
            <input v-model="formType.libelle" type="text" :class="F.fieldInput" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Gravité *</label>
            <SearchableDropdown v-model="formType.gravite" :items="optGraviteEcart" placeholder="Sélectionner…" />
          </div>
          <div v-if="!SEUIL_PARAMETRE[formType.code] && formType.seuilUnite" :class="F.field">
            <label :class="F.fieldLabel">Seuil</label>
            <div class="flex items-center gap-2">
              <input v-model.number="formType.seuilValeur" type="number" min="0" :class="F.fieldInput" class="w-[90px]" />
              <span class="text-[12px] text-muted-foreground">{{ formType.seuilUnite }}</span>
            </div>
          </div>
          <div :class="F.field" class="col-span-2">
            <label :class="F.fieldLabel">Description</label>
            <textarea v-model="formType.description" rows="2" :class="F.fieldTextarea" placeholder="Ce que la règle constate, et à partir de quand." />
          </div>
        </div>

        <p v-if="erreurType" class="text-[12px] text-danger flex items-center gap-1.5 mt-2"><AlertCircle class="w-3.5 h-3.5" /> {{ erreurType }}</p>

        <div class="flex justify-end gap-2 mt-4">
          <button :class="cls.btnOutline" @click="formType = null">Annuler</button>
          <button :class="cls.btnPrimary" @click="enregistrerType">Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- ══ Trajet de référence : création et modification ═══════ -->
    <div v-if="formTrajet" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4" @click.self="formTrajet = null">
      <div class="bg-card rounded-lg border border-border shadow-lg w-full max-w-lg p-4">
        <h3 class="text-sm font-semibold text-foreground mb-3">
          {{ formTrajet.id ? 'Modifier le trajet' : 'Nouveau trajet de référence' }}
        </h3>

        <div class="grid grid-cols-2 gap-3">
          <div :class="F.field">
            <label :class="F.fieldLabel">Code *</label>
            <input v-model="formTrajet.code" type="text" :class="F.fieldInput" placeholder="TNR-TMV" class="font-mono" @input="formTrajet.code = formTrajet.code.toUpperCase()" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Client</label>
            <SearchableDropdown v-model="formTrajet.clientNom" :items="optClients" placeholder="Aucun client attitré" />
          </div>
          <div :class="F.field" class="col-span-2">
            <label :class="F.fieldLabel">Libellé *</label>
            <input v-model="formTrajet.libelle" type="text" :class="F.fieldInput" placeholder="Antananarivo → Toamasina" />
          </div>
          <label class="col-span-2 flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input v-model="formTrajet.recurrent" type="checkbox" class="cursor-pointer" />
            Trajet récurrent, proposé par défaut à la création d'un voyage
          </label>
        </div>

        <p v-if="erreurTrajet" class="text-[12px] text-danger flex items-center gap-1.5 mt-2"><AlertCircle class="w-3.5 h-3.5" /> {{ erreurTrajet }}</p>

        <div class="flex justify-end gap-2 mt-4">
          <button :class="cls.btnOutline" @click="formTrajet = null">Annuler</button>
          <button :class="cls.btnPrimary" @click="enregistrerTrajet">{{ formTrajet.id ? 'Enregistrer' : 'Créer' }}</button>
        </div>
      </div>
    </div>

    <!-- Formulaire client -->
    <div v-if="showClientForm" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" @click.self="showClientForm = false">
      <div class="bg-card rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
        <h2 class="text-[15px] font-semibold text-foreground mb-3">{{ clientEnEdition ? 'Modifier le client' : 'Nouveau client' }}</h2>
        <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Nom *</label><input v-model="formClient.nom" :class="F.fieldInput" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Rôle *</label>
            <label class="flex items-center gap-2 text-[13px]"><input v-model="formClient.ordonnateur" type="checkbox" class="accent-primary" /> Ordonnateur</label>
            <label class="flex items-center gap-2 text-[13px]"><input v-model="formClient.destinataire" type="checkbox" class="accent-primary" /> Destinataire</label>
          </div>
          <div :class="F.field"><label :class="F.fieldLabel">Nature</label>
            <select v-model="formClient.nature" :class="F.fieldInput"><option v-for="(lib, k) in LIB_NATURE_TIERS" :key="k" :value="k">{{ lib }}</option></select>
          </div>
          <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Adresse</label><input v-model="formClient.adresse" :class="F.fieldInput" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Ville</label><input v-model="formClient.ville" :class="F.fieldInput" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Contact</label><input v-model="formClient.contact" :class="F.fieldInput" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Téléphone</label><input v-model="formClient.telephone" :class="F.fieldInput" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">E-mail</label><input v-model="formClient.email" type="email" :class="F.fieldInput" /></div>
          <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Canal de notification préféré</label>
            <select v-model="formClient.canalPrefere" :class="F.fieldInput"><option v-for="(lib, k) in LIB_CANAL" :key="k" :value="k">{{ lib }}</option></select>
          </div>
        </div>
        <p v-if="erreurClientForm" class="text-[12px] text-danger mt-3">{{ erreurClientForm }}</p>
        <div class="flex items-center justify-end gap-2 mt-4">
          <button :class="cls.btnOutline" @click="showClientForm = false">Annuler</button>
          <button :class="cls.btnPrimary" @click="enregistrerClient">{{ clientEnEdition ? 'Enregistrer' : 'Créer' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Configuration, reprise du socle FMS : quatre onglets (Trajets de
 * référence, Clients, Types d'écart, Paramètres). L'onglet Trajets
 * réutilise SelecteurTrajet, déjà construit pour le formulaire de
 * création de voyage · même logique, pas de code dupliqué. Les temps de
 * conduite et de repos se règlent selon la réglementation qui s'applique à
 * l'entreprise ; aucune n'est codée en dur (FMS-PA-04).
 */
import { ref, computed } from 'vue'
import { AlertCircle, Archive, Building2, BellRing, ChevronDown, ChevronUp, Clock, Pencil, Plus, Route, Undo2, X } from '@lucide/vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import FleetMap from '../../components/flotte/FleetMap.vue'
import ConfigCarburantOnglet from '../../components/flotte/ConfigCarburantOnglet.vue'
import ConfigDocumentsOnglet from '../../components/flotte/ConfigDocumentsOnglet.vue'
import ConfigSecuriteOnglet from '../../components/flotte/ConfigSecuriteOnglet.vue'
import ConfigTelematiqueOnglet from '../../components/flotte/ConfigTelematiqueOnglet.vue'
import ConfigReferentielsOnglet from '../../components/flotte/ConfigReferentielsOnglet.vue'
import ConfigImportsIndicateursOnglet from '../../components/flotte/ConfigImportsIndicateursOnglet.vue'
import { useTrajetsStore } from '../../stores/trajets'
import { useClientsStore, LIB_CANAL, LIB_NATURE_TIERS, type Client, type CanalNotification, type NatureTiers } from '../../stores/clients'
import { useConfigTypesEcartStore, LIB_CATEGORIE_ECART, type CategorieEcart, type ConfigTypeEcart } from '../../stores/ecarts'
import { useConfigurationStore } from '../../stores/configuration'
import { useSitesStore } from '../../stores/sites'
import { useFonctionStore } from '../../stores/fonctions'
import { usePersonnelStore } from '../../stores/personnel'
import { LIB_ROLE_ETAPE } from '../../utils/voyageUtils'
import type { EtapeVoyage, RoleEtape, Trajet, GraviteEcart } from '../../types'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'
import * as cls from '../../lib/formClasses'

const trajetsStore = useTrajetsStore()
const clientsStore = useClientsStore()
const sitesStore = useSitesStore()
const typesEcartStore = useConfigTypesEcartStore()
const configStore = useConfigurationStore()
const p = configStore.parametres

type Onglet = 'trajets' | 'clients' | 'ecarts' | 'parametres' | 'carburant' | 'documents' | 'securite' | 'telematique' | 'referentiels' | 'imports'
const onglet = ref<Onglet>('trajets')
const onglets = computed(() => [
  { key: 'trajets' as const, label: 'Trajets de référence', compte: trajetsStore.trajets.length },
  { key: 'clients' as const, label: 'Clients', compte: clientsStore.clients.length },
  { key: 'ecarts' as const, label: "Types d'écart", compte: typesEcartStore.types.length },
  { key: 'parametres' as const, label: 'Paramètres', compte: 0 },
  { key: 'carburant' as const, label: 'Carburant', compte: 0 },
  { key: 'documents' as const, label: 'Documents', compte: 0 },
  { key: 'securite' as const, label: 'Sécurité', compte: 0 },
  { key: 'telematique' as const, label: 'Télématique', compte: 0 },
  { key: 'referentiels' as const, label: 'Référentiels', compte: 0 },
  { key: 'imports' as const, label: 'Imports et indicateurs', compte: 0 },
])

/** Seuils de temps de conduite et de repos (FMS-PA-04), avec leurs bornes attendues. */
const CHAMPS_TEMPS = [
  { cle: 'tccMaxMin', libelle: 'Conduite continue max (min)' },
  { cle: 'pauseApresTccMin', libelle: 'Pause obligatoire après conduite continue (min)' },
  { cle: 'tcjMaxMin', libelle: 'Conduite journalière max (min)' },
  { cle: 'ttjMaxMin', libelle: 'Travail journalier max (min)' },
  { cle: 'plafondHebdoH', libelle: 'Plafond de conduite hebdomadaire (h)' },
  { cle: 'reposMinAvantDepartH', libelle: 'Repos minimal avant un départ (h)' },
  { cle: 'trhMinH', libelle: 'Repos hebdomadaire (h)' },
] as const

/** Plage de conduite de nuit non autorisée : les deux heures vides, elle n'est pas contrôlée. */
const nuit = ref({ debut: p.nuitInterditeDebut ?? '', fin: p.nuitInterditeFin ?? '' })
const erreurNuit = ref('')
function majNuit(cle: 'debut' | 'fin', valeur: string) {
  nuit.value[cle] = valeur
  const r = configStore.majPlageNuit(nuit.value.debut, nuit.value.fin)
  erreurNuit.value = r.ok ? '' : r.motif ?? ''
}

/** Plafond facultatif : un champ vide le retire du contrôle. */
function majBihebdo(champ: HTMLInputElement) {
  const v = champ.value.trim()
  p.plafondBihebdoH = v === '' || Number.isNaN(Number(v)) ? null : Number(v)
}

/* ── Entreprise ───────────────────────────────────────────── */
const fonctionsStore = useFonctionStore()
const GROUPES_FONCTIONS = [
  { cle: 'fonctionsConducteur', libelle: 'Fonctions de conducteur' },
  { cle: 'fonctionsAide', libelle: "Fonctions d'aide conducteur" },
] as const
const erreurFonction = ref('')
const nouveauContrat = ref(''); const erreurContrat = ref('')
const personnelStore = usePersonnelStore()
function ajouterContrat() {
  const r = configStore.ajouterTypeContrat(nouveauContrat.value)
  erreurContrat.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) nouveauContrat.value = ''
}
function retirerContrat(t: string) {
  const r = configStore.retirerTypeContrat(t, personnelStore.liste.filter(x => x.contrat === t).length)
  erreurContrat.value = r.ok ? '' : r.motif ?? ''
}
/** Une fonction est soit conducteur, soit aide ; chaque groupe garde au moins une fonction. */
function basculerFonction(cle: 'fonctionsConducteur' | 'fonctionsAide', id: string) {
  erreurFonction.value = ''
  const liste = p[cle]
  const autre = p[cle === 'fonctionsConducteur' ? 'fonctionsAide' : 'fonctionsConducteur']
  const i = liste.indexOf(id)
  if (i >= 0) {
    if (liste.length === 1) { erreurFonction.value = 'Chaque groupe garde au moins une fonction.'; return }
    liste.splice(i, 1)
  } else {
    if (autre.includes(id)) { erreurFonction.value = 'Cette fonction est déjà dans l\'autre groupe.'; return }
    liste.push(id)
  }
}

/* ── Trajets ──────────────────────────────────────────────── */
const afficherArchives = ref(false)
const trajetsAffiches = computed(() => trajetsStore.trajets.filter(t => afficherArchives.value || t.statut === 'actif'))
const trajetSel = ref<string | null>(trajetsStore.trajets[0]?.id ?? null)
const trajet = computed(() => (trajetSel.value ? trajetsStore.getById(trajetSel.value) : null))
const marqueursTrajet = computed(() => trajet.value ? trajet.value.etapes.map((e, i) => ({
  id: e.id, lat: e.lat, lng: e.lng, libelle: `${i + 1}. ${e.siteNom}`, couleur: '#0B4480', numero: i + 1,
})) : [])
function fmtDuree(min: number) { return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60 || ''}`.trim() : `${min} min` }

/** Nouveau trajet / modification : uniquement les métadonnées, jamais les
 *  sites - un trajet neuf naît vide, ses sites s'ajoutent un par un sur la
 *  fiche, comme sur le socle FMS. */
interface FormTrajet { id?: string; code: string; libelle: string; clientNom: string; recurrent: boolean }
const formTrajet = ref<FormTrajet | null>(null)
const erreurTrajet = ref('')

function ouvrirNouveauTrajet() {
  erreurTrajet.value = ''
  formTrajet.value = { code: '', libelle: '', clientNom: '', recurrent: true }
}
function ouvrirEditionTrajet(t: Trajet) {
  erreurTrajet.value = ''
  formTrajet.value = { id: t.id, code: t.code, libelle: t.libelle, clientNom: t.clientNom, recurrent: t.recurrent }
}

/** Un code en double rendrait deux trajets indiscernables dans les voyages. */
function enregistrerTrajet() {
  const f = formTrajet.value
  if (!f) return
  erreurTrajet.value = ''
  if (!f.code.trim() || !f.libelle.trim()) { erreurTrajet.value = 'Le code et le libellé sont obligatoires.'; return }
  const doublon = trajetsStore.trajets.some(t => t.id !== f.id && t.code.trim().toUpperCase() === f.code.trim().toUpperCase())
  if (doublon) { erreurTrajet.value = `Le code ${f.code.trim().toUpperCase()} est déjà utilisé.`; return }

  const donnees = { code: f.code.trim().toUpperCase(), libelle: f.libelle.trim(), clientNom: f.clientNom, recurrent: f.recurrent }
  if (f.id) {
    trajetsStore.update(f.id, donnees)
  } else {
    const id = trajetsStore.creer({ ...donnees, statut: 'actif', etapes: [], distanceEstimeeKm: 0, dureeEstimeeMin: 0 })
    trajetSel.value = id
  }
  formTrajet.value = null
}

const optClients = computed<DropdownItem[]>(() => clientsStore.clients.map(c => ({ id: c.nom, label: c.nom })))

/* ── Types d'écart ────────────────────────────────────────── */
/** Les seuils des temps réglementaires ne se règlent qu'à un endroit : l'onglet Paramètres. */
const SEUIL_PARAMETRE: Record<string, 'tccMaxMin' | 'tcjMaxMin' | 'ttjMaxMin' | 'trhMinH' | undefined> = { TCC: 'tccMaxMin', TCJ: 'tcjMaxMin', TTJ: 'ttjMaxMin', TRH: 'trhMinH' }
interface FormType { id: string; code: string; libelle: string; categorie: CategorieEcart; gravite: 'mineur' | 'majeur' | 'critique'; seuilValeur: number | null; seuilUnite: string; description: string }
const formType = ref<FormType | null>(null)
const erreurType = ref('')

function ouvrirEditionType(t: ConfigTypeEcart) {
  erreurType.value = ''
  formType.value = {
    id: t.id, code: t.code, libelle: t.libelle, categorie: t.categorie, gravite: t.gravite,
    seuilValeur: t.seuilValeur ?? null, seuilUnite: t.seuilUnite ?? '', description: t.description ?? '',
  }
}

const erreursSeuil = ref<Record<string, string>>({})
function majSeuilType(id: string, valeur: string) {
  const r = typesEcartStore.majType(id, { seuilValeur: valeur === '' ? NaN : Number(valeur) })
  erreursSeuil.value = { ...erreursSeuil.value, [id]: r.ok ? '' : r.motif ?? '' }
}

function enregistrerType() {
  const f = formType.value
  if (!f) return
  erreurType.value = ''
  /* Le code et l'unité du seuil sont fixés : seuls le libellé, la catégorie, la gravité, le seuil et la description se modifient. */
  const avecSeuil = !SEUIL_PARAMETRE[f.code] && !!f.seuilUnite
  const r = typesEcartStore.majType(f.id, {
    libelle: f.libelle, categorie: f.categorie, gravite: f.gravite, description: f.description.trim() || undefined,
    ...(avecSeuil ? { seuilValeur: f.seuilValeur ?? NaN } : {}),
  })
  if (!r.ok) { erreurType.value = r.motif ?? ''; return }
  formType.value = null
}

const optCategorieEcart: DropdownItem[] = Object.entries(LIB_CATEGORIE_ECART).map(([id, label]) => ({ id, label }))
const optGraviteEcart: DropdownItem[] = [{ id: 'mineur', label: 'Mineur' }, { id: 'majeur', label: 'Majeur' }, { id: 'critique', label: 'Critique' }]

/* ── Étapes du trajet sélectionné ─────────────────────────── */
const siteAAjouter = ref('')
const roleAAjouter = ref<RoleEtape>('livraison')
const optionsSites = computed<DropdownItem[]>(() => sitesStore.sites.filter(s => s.actif).map(s => ({ id: s.id, label: s.nom, sublabel: s.code })))
const optRoleEtape: DropdownItem[] = Object.entries(LIB_ROLE_ETAPE).map(([id, label]) => ({ id, label }))

function ajouterEtape() {
  const t = trajet.value
  const site = sitesStore.getById(siteAAjouter.value)
  if (!t || !site) return
  const etape = trajetsStore.nouvelleEtape({ id: site.id, nom: site.nom, lat: site.lat, lng: site.lng }, t.etapes.length + 1, roleAAjouter.value)
  trajetsStore.update(t.id, { etapes: [...t.etapes, etape] })
  siteAAjouter.value = ''
}
function majEtape(index: number, data: Partial<EtapeVoyage>) {
  const t = trajet.value
  if (!t) return
  const etapes = t.etapes.map((e, i) => i === index ? { ...e, ...data } : e)
  trajetsStore.update(t.id, { etapes })
}
function retirerEtape(index: number) {
  const t = trajet.value
  if (!t) return
  trajetsStore.update(t.id, { etapes: t.etapes.filter((_, i) => i !== index) })
}
function deplacerEtape(index: number, sens: -1 | 1) {
  const t = trajet.value
  if (!t) return
  const cible = index + sens
  if (cible < 0 || cible >= t.etapes.length) return
  const etapes = [...t.etapes]
  const [deplacee] = etapes.splice(index, 1)
  etapes.splice(cible, 0, deplacee!)
  trajetsStore.update(t.id, { etapes })
}

/* ── Clients : ordonnateurs et destinataires ─────────────── */
const showClientForm = ref(false)
const clientEnEdition = ref<Client | null>(null)
const erreurClientForm = ref('')
const erreurClients = ref('')
const clientVide = () => ({ nom: '', ordonnateur: false, destinataire: true, nature: 'externe' as NatureTiers, adresse: '', ville: '', contact: '', telephone: '', email: '', canalPrefere: 'sms' as CanalNotification })
const formClient = ref(clientVide())
const libelleRoles = (c: Client) => c.ordonnateur && c.destinataire ? 'Ordonnateur et destinataire' : c.ordonnateur ? 'Ordonnateur' : 'Destinataire'
function ouvrirNouveauClient() { clientEnEdition.value = null; formClient.value = clientVide(); erreurClientForm.value = ''; showClientForm.value = true }
function ouvrirEditionClient(c: Client) {
  clientEnEdition.value = c; erreurClientForm.value = ''
  formClient.value = { nom: c.nom, ordonnateur: !!c.ordonnateur, destinataire: !!c.destinataire, nature: c.nature ?? 'externe', adresse: c.adresse ?? '', ville: c.ville ?? '',
    contact: c.contact ?? '', telephone: c.telephone ?? '', email: c.email ?? '', canalPrefere: c.canalPrefere ?? 'sms' }
  showClientForm.value = true
}
function enregistrerClient() {
  const r = clientEnEdition.value ? clientsStore.modifier(clientEnEdition.value.id, formClient.value) : clientsStore.creer(formClient.value)
  if (!r.ok) { erreurClientForm.value = r.motif ?? ''; return }
  showClientForm.value = false
}
function supprimerClient(id: string) { const r = clientsStore.supprimer(id); erreurClients.value = r.ok ? '' : r.motif ?? '' }
</script>
