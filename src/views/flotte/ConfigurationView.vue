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
            {{ trajet.distanceEstimeeKm }} km · {{ fmtDuree(trajet.dureeEstimeeMin) }}, recalculés à chaque modification
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
                <div v-if="t.seuilValeur != null" class="flex items-center gap-1">
                  <input :value="t.seuilValeur" type="number" :class="F.fieldInput" class="!h-[28px] !text-[11px] w-[70px]" @change="ev => typesEcartStore.majType(t.id, { seuilValeur: Number((ev.target as HTMLInputElement).value) })" />
                  <span class="text-[11px] text-muted-foreground">{{ t.seuilUnite }}</span>
                </div>
                <span v-else class="text-muted-foreground">-</span>
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
        <div class="flex items-center justify-between mb-3">
          <h2 :class="L.cardTitle" class="!mb-0">Clients</h2>
          <button :class="L.btnPrimary" @click="ouvrirNouveauClient"><Plus class="w-4 h-4" /> Nouveau client</button>
        </div>
        <table :class="L.table">
          <thead><tr>
            <th :class="L.th">Nom</th>
            <th :class="L.th">Ville</th>
            <th :class="L.th">Contact</th>
            <th :class="L.th">Téléphone</th>
            <th :class="L.th"></th>
          </tr></thead>
          <tbody>
            <tr v-for="c in clientsStore.clients" :key="c.id">
              <td :class="L.td" class="font-medium">{{ c.nom }}</td>
              <td :class="L.td" class="text-muted-foreground">{{ c.ville ?? '-' }}</td>
              <td :class="L.td" class="text-muted-foreground">{{ c.contact ?? '-' }}</td>
              <td :class="L.td" class="text-muted-foreground">{{ c.telephone ?? '-' }}</td>
              <td :class="L.td">
                <div class="flex items-center gap-2">
                  <button class="text-[11px] text-primary hover:underline bg-transparent border-0 cursor-pointer" @click="ouvrirEditionClient(c)">Modifier</button>
                  <button class="text-[11px] text-danger hover:underline bg-transparent border-0 cursor-pointer" @click="clientsStore.supprimer(c.id)">Supprimer</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ PARAMÈTRES ════════════════════════════════════════ -->
    <div v-else-if="onglet === 'parametres'" class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">

      <div :class="L.card">
        <div class="flex items-center gap-2 mb-3"><Clock class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Temps réglementaires</h2></div>
        <div class="grid grid-cols-2 gap-3">
          <div :class="F.field">
            <label :class="F.fieldLabel">Conduite continue max (min)</label>
            <input v-model.number="p.tccMaxMin" type="number" :class="F.fieldInput" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Arrêt après conduite continue (min)</label>
            <input v-model.number="p.pauseApresTccMin" type="number" :class="F.fieldInput" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Conduite journalière max (min)</label>
            <input v-model.number="p.tcjMaxMin" type="number" :class="F.fieldInput" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Travail journalier max (min)</label>
            <input v-model.number="p.ttjMaxMin" type="number" :class="F.fieldInput" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Repos hebdomadaire (h)</label>
            <input v-model.number="p.trhMinH" type="number" :class="F.fieldInput" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Plafond hebdomadaire (h)</label>
            <input v-model.number="p.plafondHebdoH" type="number" :class="F.fieldInput" />
          </div>
        </div>
        <p class="text-[11px] text-muted-foreground mt-2">
          Alimente la catégorie « Temps réglementaires » de l'onglet Types d'écart, désactivée par défaut :
          aucune réglementation malgache du transport routier n'a été fournie pour valider ces seuils.
        </p>
      </div>

      <div :class="L.card">
        <div class="flex items-center gap-2 mb-3"><SlidersHorizontal class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Seuils d'exploitation</h2></div>
        <div class="grid grid-cols-2 gap-3">
          <div :class="F.field">
            <label :class="F.fieldLabel">Litres par bon de carburant</label>
            <input v-model.number="p.litresParBonDefaut" type="number" :class="F.fieldInput" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Tolérance kilométrique (%)</label>
            <input v-model.number="p.toleranceKmPct" type="number" :class="F.fieldInput" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Seuil d'arrêt non planifié (min)</label>
            <input v-model.number="p.seuilArretMin" type="number" :class="F.fieldInput" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Plafond bihebdomadaire (h)</label>
            <input v-model.number="p.plafondBihebdoH" type="number" :class="F.fieldInput" />
          </div>
        </div>
      </div>

      <!-- Seuils d'alerte : gouvernent le déclenchement des alertes, ajustables sans intervention technique. -->
      <div :class="L.card" class="lg:col-span-2">
        <div class="flex items-center justify-between mb-3">
          <h2 :class="L.cardTitle" class="!mb-0"><BellRing class="w-4 h-4 text-primary" /> Seuils d'alerte</h2>
          <span class="text-[11px] text-muted-foreground">ajustables sans intervention technique</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="flex flex-col gap-2">
            <p class="text-xs font-semibold text-foreground">Préavis d'entretien préventif</p>
            <div class="grid grid-cols-2 gap-2">
              <div :class="F.field">
                <label :class="F.fieldLabel">Kilomètres avant</label>
                <input v-model.number="p.preavisEntretienKm" type="number" min="0" :class="[F.fieldInput, configStore.seuilHorsBornes('preavisEntretienKm') ? 'border-danger' : '']" />
              </div>
              <div :class="F.field">
                <label :class="F.fieldLabel">Jours avant</label>
                <input v-model.number="p.preavisEntretienJours" type="number" min="0" :class="[F.fieldInput, configStore.seuilHorsBornes('preavisEntretienJours') ? 'border-danger' : '']" />
              </div>
            </div>
            <p v-if="configStore.seuilHorsBornes('preavisEntretienKm')" class="text-[11px] text-danger flex items-center gap-1">
              <AlertCircle class="w-3 h-3" /> Attendu entre {{ configStore.BORNES_SEUILS.preavisEntretienKm.min }} et {{ configStore.BORNES_SEUILS.preavisEntretienKm.max.toLocaleString('fr-FR') }} km.
            </p>
          </div>

          <div class="flex flex-col gap-2">
            <p class="text-xs font-semibold text-foreground">Rayon de validation d'un passage</p>
            <div :class="F.field">
              <label :class="F.fieldLabel">Distance au site (m)</label>
              <input v-model.number="p.rayonValidationPassageM" type="number" min="0" step="100" :class="[F.fieldInput, configStore.seuilHorsBornes('rayonValidationPassageM') ? 'border-danger' : '']" />
            </div>
            <p v-if="configStore.seuilHorsBornes('rayonValidationPassageM')" class="text-[11px] text-danger flex items-center gap-1">
              <AlertCircle class="w-3 h-3" /> Attendu entre {{ configStore.BORNES_SEUILS.rayonValidationPassageM.min }} et {{ configStore.BORNES_SEUILS.rayonValidationPassageM.max.toLocaleString('fr-FR') }} m.
            </p>
          </div>

          <div class="flex flex-col gap-2">
            <p class="text-xs font-semibold text-foreground">Préavis d'échéance documentaire</p>
            <div :class="F.field">
              <label :class="F.fieldLabel">Jours avant expiration</label>
              <input v-model.number="p.preavisDocumentaireJours" type="number" min="0" :class="[F.fieldInput, configStore.seuilHorsBornes('preavisDocumentaireJours') ? 'border-danger' : '']" />
            </div>
            <p v-if="configStore.seuilHorsBornes('preavisDocumentaireJours')" class="text-[11px] text-danger flex items-center gap-1">
              <AlertCircle class="w-3 h-3" /> Attendu entre {{ configStore.BORNES_SEUILS.preavisDocumentaireJours.min }} et {{ configStore.BORNES_SEUILS.preavisDocumentaireJours.max }} jours.
            </p>
          </div>
        </div>
      </div>

      <!-- Grille de prime conducteur : montants non communiqués par UCODIS, modifiables sans développeur. -->
      <div :class="L.card" class="lg:col-span-2">
        <div class="flex items-center justify-between mb-3">
          <h2 :class="L.cardTitle" class="!mb-0"><Award class="w-4 h-4 text-primary" /> Grille de prime conducteur</h2>
          <button class="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0" @click="scoresStore.reinitialiserGrillePrime()">
            Réinitialiser
          </button>
        </div>
        <p class="text-[11px] text-warning bg-warning-bg rounded-md px-2.5 py-2 mb-3">
          Montants indicatifs, non communiqués par UCODIS, à valider par la Direction et les Ressources humaines
          avant toute activation réelle.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div v-for="(palier, i) in scoresStore.grillePrime" :key="i" class="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div :class="F.field">
              <label :class="F.fieldLabel">Libellé</label>
              <input :value="palier.libelle" type="text" :class="F.fieldInput" @change="scoresStore.modifierPalier(i, { libelle: ($event.target as HTMLInputElement).value })" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Score minimum</label>
              <input :value="palier.min" type="number" min="0" max="100" :class="F.fieldInput" @change="scoresStore.modifierPalier(i, { min: Number(($event.target as HTMLInputElement).value) })" />
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Montant (Ar)</label>
              <input :value="palier.montant" type="number" min="0" step="10000" :class="F.fieldInput" @change="scoresStore.modifierPalier(i, { montant: Number(($event.target as HTMLInputElement).value) })" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ Type d'écart : modification ═══════════════════════ -->
    <div v-if="formType" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4" @click.self="formType = null">
      <div class="bg-card rounded-lg border border-border shadow-lg w-full max-w-lg p-4">
        <h3 class="text-sm font-semibold text-foreground mb-3">Modifier le type d'écart</h3>

        <div class="grid grid-cols-2 gap-3">
          <div :class="F.field">
            <label :class="F.fieldLabel">Code *</label>
            <input v-model="formType.code" type="text" :class="F.fieldInput" class="font-mono" placeholder="VOL-MANQ" />
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
          <div :class="F.field">
            <label :class="F.fieldLabel">Seuil et unité</label>
            <div class="flex gap-2">
              <input v-model.number="formType.seuilValeur" type="number" :class="F.fieldInput" class="w-[90px]" placeholder="Valeur" />
              <input v-model="formType.seuilUnite" type="text" :class="F.fieldInput" placeholder="L, %, min…" />
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
      <div class="bg-card rounded-xl shadow-xl w-full max-w-sm p-5">
        <h2 class="text-[15px] font-semibold text-foreground mb-3">{{ clientEnEdition ? 'Modifier le client' : 'Nouveau client' }}</h2>
        <div class="flex flex-col gap-3">
          <div :class="F.field"><label :class="F.fieldLabel">Nom *</label><input v-model="formClient.nom" :class="F.fieldInput" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Ville</label><input v-model="formClient.ville" :class="F.fieldInput" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Contact</label><input v-model="formClient.contact" :class="F.fieldInput" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Téléphone</label><input v-model="formClient.telephone" :class="F.fieldInput" /></div>
        </div>
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
 * création de voyage · même logique, pas de code dupliqué. Les temps
 * réglementaires de conduite du socle FMS ne sont pas repris, faute de
 * réglementation malgache fournie pour les fonder.
 */
import { ref, computed } from 'vue'
import { AlertCircle, Archive, Award, BellRing, ChevronDown, ChevronUp, Clock, Pencil, Plus, Route, SlidersHorizontal, Undo2, X } from '@lucide/vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import FleetMap from '../../components/flotte/FleetMap.vue'
import { useTrajetsStore } from '../../stores/trajets'
import { useClientsStore, type Client } from '../../stores/clients'
import { useConfigTypesEcartStore, LIB_CATEGORIE_ECART, type CategorieEcart, type ConfigTypeEcart } from '../../stores/ecarts'
import { useConfigurationStore } from '../../stores/configuration'
import { useScoresConducteursStore } from '../../stores/scoresConducteurs'
import { useSitesStore } from '../../stores/sites'
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
const scoresStore = useScoresConducteursStore()
const p = configStore.parametres

type Onglet = 'trajets' | 'clients' | 'ecarts' | 'parametres'
const onglet = ref<Onglet>('trajets')
const onglets = computed(() => [
  { key: 'trajets' as const, label: 'Trajets de référence', compte: trajetsStore.trajets.length },
  { key: 'clients' as const, label: 'Clients', compte: clientsStore.clients.length },
  { key: 'ecarts' as const, label: "Types d'écart", compte: typesEcartStore.types.length },
  { key: 'parametres' as const, label: 'Paramètres', compte: 0 },
])

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

function enregistrerType() {
  const f = formType.value
  if (!f) return
  erreurType.value = ''
  if (!f.code.trim() || !f.libelle.trim()) { erreurType.value = 'Le code et le libellé sont obligatoires.'; return }
  const doublon = typesEcartStore.types.some(t => t.id !== f.id && t.code.trim().toUpperCase() === f.code.trim().toUpperCase())
  if (doublon) { erreurType.value = `Le code ${f.code.trim().toUpperCase()} est déjà utilisé.`; return }
  if (f.seuilValeur != null && !f.seuilUnite.trim()) { erreurType.value = 'Un seuil doit porter son unité : litres, pourcent, minutes…'; return }

  typesEcartStore.majType(f.id, {
    code: f.code.trim().toUpperCase(), libelle: f.libelle.trim(), categorie: f.categorie, gravite: f.gravite,
    seuilValeur: f.seuilValeur ?? undefined, seuilUnite: f.seuilUnite.trim() || undefined, description: f.description.trim() || undefined,
  })
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

/* ── Clients ──────────────────────────────────────────────── */
const showClientForm = ref(false)
const clientEnEdition = ref<Client | null>(null)
const formClient = ref({ nom: '', ville: '', contact: '', telephone: '' })
function ouvrirNouveauClient() { clientEnEdition.value = null; formClient.value = { nom: '', ville: '', contact: '', telephone: '' }; showClientForm.value = true }
function ouvrirEditionClient(c: Client) { clientEnEdition.value = c; formClient.value = { nom: c.nom, ville: c.ville ?? '', contact: c.contact ?? '', telephone: c.telephone ?? '' }; showClientForm.value = true }
function enregistrerClient() {
  if (!formClient.value.nom.trim()) return
  if (clientEnEdition.value) clientsStore.modifier(clientEnEdition.value.id, formClient.value)
  else clientsStore.creer(formClient.value)
  showClientForm.value = false
}
</script>
