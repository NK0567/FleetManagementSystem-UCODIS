# FMS Trucks UCODIS · maquette

Fleet Management System pour **UCODIS Transport** (10 tracteurs, 10 semi-remorques).

Cette livraison couvre l'**authentification** et le **module Administration**.
C'est le seul module construit : il occupe donc seul l'onglet en haut à droite,
comme sur les autres projets du socle FMS. Les modules suivants viendront s'ajouter à côté au
fur et à mesure. On n'affiche pas d'onglet qui ne mène nulle part.

## Démarrer

```sh
npm install
npm run dev
```

Sur l'écran de connexion, choisissez un rôle : l'identifiant se remplit tout seul,
le mot de passe est libre.

## Le module Administration

Le découpage du menu est celui des autres projets du socle FMS, à l'identique.

| Section | Écrans |
|---|---|
| Tableau de bord | Vue d'ensemble · Mon planning |
| Congés & absences | Demandes · Soldes |
| Personnel | Employés · Entités · Organigramme |
| Configuration | Calendrier · Classification |

Le tableau de bord reprend la même composition que sur les deux autres projets :
quatre indicateurs, le bandeau de structure organisationnelle, les demandes en
attente avec approbation, retour et refus, puis les soldes individuels à côté du
calendrier du mois.

## Authentification

Neuf rôles, repris du tableau des responsabilités de la SOP UCD-TRUCK-FLOT-001 :
responsable flotte, maintenancier, chargé de clientèle, équipe commerciale, équipe
dépôt, conducteur, aide conducteur, plus la direction et l'administrateur système.

Deux espaces séparés, comme sur les projets précédents : le côté gestion voit
l'administration, le côté terrain (conducteur, aide conducteur) ne voit que son
espace personnel · sa situation, ses absences, son profil.

## Principes tenus

- **Rien n'est inventé.** Les fonctions, responsabilités et rôles viennent de la
  SOP. Ce qui manque est signalé, pas comblé.
- **On archive, on ne supprime jamais.** Une personne qui part garde son historique.
- **Les statuts ne se saisissent pas.** Ils se déduisent des faits enregistrés.
- **Un motif accompagne toujours un refus ou un retour**, et reste attaché à la
  demande.

L'habilitation à conduire et les pièces du personnel · permis, visite médicale ·
restent visibles sur la fiche de chaque employé. Elles relèvent des modules 2 et 9
du cahier des charges et n'ajoutent donc pas d'entrée au menu de l'administration.

## Icônes

Le jeu d'icônes est dans `public/`, généré à partir du logo UCODIS.

| Fichier | Taille | Usage |
|---|---|---|
| `favicon.ico` | 16, 32, 48 | Onglet et favoris |
| `favicon.png` | 32 | Onglet, navigateurs modernes |
| `apple-touch-icon.png` | 180 | Écran d'accueil iOS |
| `ucodis.webp` | 240 | Marque carrée, fond transparent |

`src/assets/logo-ucodis.png` est le logo horizontal détouré.
Le script de génération est `outils/generer-icones.py`.

## Pile technique

Vue 3, TypeScript, Vite, Pinia, Vue Router, Tailwind CSS 4, Lucide.

## Mise en conformité avec les autres projets du socle FMS

Cette révision aligne le comportement du projet UCODIS sur celui des deux
autres projets, dont le code a servi de référence directe · rien n'a été
réinventé.

**Composants repris à l'identique** : `ListPageLayout` (recherche, filtres,
tri, pagination, sélecteur de vues), `CardModalShell` (fiche en
superposition), `ConfirmDialog`, `FormSection`, `SearchableDropdown`.

**Le comportement de liste est désormais celui des deux autres projets** :
un clic sur une ligne ouvre un panneau d'aperçu à droite avec un bouton
« Ouvrir la fiche » ; un double-clic ouvre directement la fiche complète
en superposition, contenu centré, navigateur de codes à gauche, section
repliables avec récapitulatifs.

**Écrans repris et mis en conformité** : Mon planning (grille hebdomadaire),
Demandes (liste + fiche avec actions Approuver / Retourner / Refuser),
Soldes (jauges restant/total), Employés (liste + fiche), Entités (liste et
vue hiérarchique partageant le même arbre que l'Organigramme), Calendrier
(onglets Jours de travail / Jours fériés / Types de congé), Classification
(onglets Catégories / Fonctions).

Le contenu de chaque écran reste celui d'UCODIS : les fonctions et
responsabilités viennent de la SOP, les seuils du cahier des charges. Ce
qui n'est confirmé par aucun document UCODIS · durées de congé légales,
catégories de personnel, horaires de journée · est signalé comme tel dans
l'écran correspondant, en attente de validation.

## Révision : structure exacte des projets de référence (Entités, Organigramme, Calendrier, Classification)

Cette passe reprend le code source du socle FMS à l'identique, adapté aux données
UCODIS, là où la première tentative avait trop simplifié.

**Entités** · 3 vues dans `ListPageLayout`, comme `EntityListView` : Liste (tableau),
Vue hiérarchique (arbre à connecteurs CSS), Organigramme (graphe glisser-zoomer, via la
librairie `vue3-org-chart`, effectivement installée et branchée).

**Organigramme** · écran séparé avec 4 onglets, comme `OrgChartView` + `EntityTabsContent` :
Vue hiérarchique, Organigramme, Liste, En attente. Le même composant `EntiteTabsContent`
alimente les deux écrans, une seule source pour l'arbre, le graphe et le tableau.

Pour donner un sens réel à l'onglet « En attente » sans inventer de donnée UCODIS,
une entité **Opérations et voyages** y figure avec le statut « à valider » : c'est le
module proposé au point 4 du document de user stories (la SOP est bâtie autour du
voyage sans qu'aucun des dix modules ne s'appelle « voyages »). Elle se valide depuis
n'importe lequel des 4 onglets.

**Calendrier** · l'onglet Jours de travail reprend `WorkingDaysConfig` : bascule
actif/repos, horaires de début et fin, bascule et plage de pause, par jour, avec le
total hebdomadaire calculé. L'onglet Types de congé reprend le tableau de règles
éditables : jours/an, accumulation mensuelle, report maximum, préavis, justificatif
exigé, actif · avec un cadenas sur les types légalement obligatoires.

**Classification** · colonne Statut ajoutée à l'onglet Catégorie, pour la même
structure de tableau que la référence (Code / Libellé / Périmètre / Droit annuel /
Employés / Statut / Actions).

## Corrections d'incohérences et activation des boutons

Cette passe corrige des bugs concrets et rend fonctionnels des boutons qui ne
faisaient rien, plutôt que de les laisser décoratifs.

**Bugs corrigés**
- Le bouton « Nouvelle demande de congé » figurait sur la Vue d'ensemble, une page de
  lecture ; il a été retiré de là et déplacé sur Mon planning, avec un vrai formulaire.
- Sur Mon planning, le badge du mois se basait toujours sur le lundi de la semaine :
  une semaine à cheval sur août et septembre affichait « Août » même quand elle était
  presque entièrement en septembre. Il affiche maintenant le mois qui domine la semaine.
- Le bouton « Enregistrer les modifications » du Calendrier n'était lié qu'aux droits
  administrateur, jamais à une modification réelle : il restait actif en permanence.
  Il s'active désormais uniquement quand quelque chose a changé, et se redésactive
  après l'enregistrement.

**Formulaires codés, pas de placeholders**
- `NouvelleDemandeModal` : calcule les jours ouvrés entre deux dates en excluant les
  jours fériés, vérifie le solde disponible, crée une vraie demande « en attente ».
  Branché sur Mon planning, Demandes et l'espace employé.
- `NouvelEmployeModal` : crée une vraie fiche employé (matricule généré, fonction,
  entité, contrat) et ouvre la fiche créée.
- `NouvelleEntiteModal` : crée une vraie entité, avec vérification du code en doublon.
- Classification : formulaires de création et d'édition pour les catégories et les
  fonctions, suppression avec confirmation.

**Import / Export**
- Boutons Importer ajoutés sur les onglets Catégorie et Fonction de Classification
  (absents jusqu'ici), avec le même message d'attente que les autres écrans.
- Export CSV réellement fonctionnel sur Soldes et sur l'onglet Poste de Classification
  (téléchargement direct, respecte les filtres actifs).

**Bascules (switches)**
- Vérifié empiriquement par interaction : jours ouvrables, pause, justificatif exigé,
  type actif · chaque bascule change bien d'état au clic et déclenche l'activation du
  bouton Enregistrer quand c'est pertinent.

Toutes ces corrections ont été vérifiées par interaction réelle (Playwright), pas
seulement par relecture du code.

## Deuxième vague de corrections : horloge fixe, composant de sélection, permissions, formulaires manquants

**Horloge fixe de la maquette**
Toute l'application utilisait `new Date()` (l'heure réelle de la machine) pour savoir
« quel jour sommes-nous ». Comme le temps réel s'écoule pendant les échanges, l'app
dérivait peu à peu de la date racontée (vendredi 4 septembre 2026), au point de
surligner le mauvais jour comme « Aujourd'hui ». Un module central,
`src/utils/horloge.ts`, fixe désormais cette date une fois pour toutes ; tous les
usages de `new Date()` dans les stores et les vues ont été remplacés par cette
horloge unique. Vérifié par interaction réelle : « Aujourd'hui » pointe maintenant
correctement sur le vendredi 4 septembre.

**Composant de sélection identique à la référence**
Vérifié dans le code source des projets de référence : `SearchableDropdown` (avec
barre de recherche) sert aux sélections métier · employé, type de congé, fonction,
entité · dans les formulaires ; un `<select>` natif reste utilisé pour les petites
énumérations fixes (statut, type de contrat, type d'entité), exactement comme dans
la référence. Toutes les sélections métier de la maquette utilisent maintenant
`SearchableDropdown` : `NouvelleDemandeModal`, `NouvelEmployeModal`,
`NouvelleEntiteModal`, `EmployeCard`, `EntiteCard`, et la modale Fonction de
Classification.

**Permissions élargies pour Calendrier et Classification**
Ces écrans n'étaient modifiables que par l'Administrateur système ; le Responsable
flotte · qui gère pourtant le personnel et les congés au quotidien · voyait tous
les contrôles désactivés, ce qui donnait l'impression que rien ne fonctionnait.
Élargi à `auth.gerePersonnel` (Administrateur ou Responsable flotte), et vérifié :
les bascules, les champs et le bouton Enregistrer réagissent maintenant correctement
pour ce rôle.

**Formulaires manquants, désormais complets**
- Jour férié : ajout et modification (libellé, date, récurrence), sur les deux
  tableaux (fériés annuels et ponctuels).
- Type de congé : ajout et modification complets (code, icône, libellé, jours par
  an, préavis, justificatif, rémunéré, note), plus suppression pour les types non
  obligatoires.
- Chaque bouton crayon et corbeille de ces deux tableaux est maintenant branché à
  une action réelle, avec confirmation avant suppression.

Toutes ces corrections ont été vérifiées par interaction réelle (Playwright) :
ouverture des formulaires, saisie, création, et apparition immédiate du nouvel
élément dans le tableau correspondant.

## Troisième vague : import CSV réel, formulaire employé enrichi, vérification de l'horloge

**Import CSV réellement fonctionnel**
Vérifié dans le code source de la référence : le bouton Import n'affiche pas un simple
message d'attente, il ouvre un vrai import CSV en trois étapes (choix du fichier,
correspondance des colonnes, contrôles avec aperçu et rapport), comme dans
`ImportParcModal.vue`. Un composant générique, `ImportCsvModal.vue`, reprend cette
mécanique avec `papaparse` et l'applique aux quatre boutons Import du projet :
Employés, Entités, Catégories, Fonctions · chacun avec ses propres contrôles
(doublons de code/CIN, références croisées vers une fonction ou une entité) et son
modèle de fichier téléchargeable. Un bug de rapport a été trouvé et corrigé en cours
de test : les lignes tout juste importées étaient réévaluées après coup et
signalées à tort comme rejetées pour doublon.

**Formulaire « Nouvel employé » aligné sur la référence**
Le formulaire ne comportait pas les mêmes champs d'identité que les projets de
référence. Il reprend maintenant la structure à deux sections (Identité /
Affectation) avec `FormSection`, complétée par matricule auto-affiché, genre,
situation familiale, lieu de naissance, type de pièce d'identité, statut à la
création, et un champ « Responsable direct » calculé automatiquement depuis
l'entité choisie · exactement comme la référence. Les champs sans équivalent dans
les documents UCODIS restent optionnels et sont signalés comme tels.

**Horloge de date réauditée**
Vérifiée par navigation réelle (semaine suivante, retour à aujourd'hui, tableau de
bord) : aucune occurrence résiduelle de l'heure système n'a été trouvée, tout passe
par l'horloge fixe du 4 septembre 2026.

Toutes ces corrections ont été vérifiées par interaction réelle : import d'un
fichier CSV de test avec une ligne valide et une ligne invalide, confirmation du
rapport exact, apparition de la ligne importée dans le tableau.

## Quatrième vague : formulaire employé complété, démarrage du module Véhicules

**Formulaire « Nouvel employé »**
Deux manques précis identifiés par comparaison directe avec le code source de la
référence : le matricule était affiché en lecture seule (il est maintenant
éditable, pré-rempli), et le champ Catégorie manquait entièrement. Il a été ajouté,
avec une valeur par défaut proposée selon la fonction choisie · le rattachement
fonction → catégorie est désormais centralisé dans le store `classification`
(`categorieParDefaut()`) plutôt que dupliqué localement dans l'écran Classification.

**Module Véhicules · démarrage**
Deuxième module du projet, construit sur le même modèle que le socle FMS : un onglet
« Véhicules » à côté d'« Administration » en haut à droite, avec son propre menu
latéral. La bascule entre les deux modules a été vérifiée par interaction réelle :
le menu change instantanément, sans perte d'état.

Contenu construit pour cette première passe :
- **Tableau de bord** : indicateurs (parc total, disponibles, en circulation,
  immobilisés), bandeau des véhicules immobilisés avec leur motif, tableau des
  attelages et conducteurs affectés, répartition du parc par statut.
- **Liste des véhicules** et **fiche véhicule** en superposition (Identification,
  Informations techniques, Statut, Attelage et affectation), sur les mêmes
  composants `ListPageLayout` / `CardModalShell` que le reste du projet.
- **Store véhicules** : les vingt véhicules réels du parc UCODIS (dix tracteurs,
  dix semi-remorques), avec attelages et affectations aux conducteurs déjà
  enregistrés dans le module Administration.

Un bug d'affichage a été trouvé et corrigé pendant la vérification : les statuts
« Affecté », « En réparation » et « Hors service » utilisaient tous la même
pastille grise neutre, faute d'entrée dédiée dans le composant `StatusPill`
partagé. Chaque statut a maintenant sa propre couleur (bleu, orange, rouge).

Seuls le tableau de bord et la fiche véhicule sont construits à ce stade · les
documents administratifs, les contrôles avant/après voyage et le suivi en temps
réel viendront s'y ajouter selon le même principe progressif que l'administration
du personnel.

## Cinquième vague : le module Véhicules devient Flotte

À la demande explicite de reprendre la même structure que le socle FMS, le module a été
renommé et son périmètre élargi. Vérifié dans le code source du socle FMS :
`views/fleet/`, routes `/fleet/...`, section de menu « Parc véhicules »
contenant dans l'ordre Véhicules, État de flotte, Contrôles, Départs,
Assurances, Conducteurs, Attelages, Affectations.

**Ce qui a été repris à l'identique**
- L'onglet en haut à droite s'appelle désormais « Flotte », dossier
  `views/flotte/`, routes `/flotte/...` · même arborescence que la référence.
- La section « Parc véhicules » du menu latéral, avec les mêmes libellés et le
  même ordre relatif. Seuls les écrans réellement construits y figurent :
  Véhicules, Attelages, Affectations · pas de lien vers un écran qui n'existe
  pas encore (État de flotte, Contrôles, Départs, Assurances, Conducteurs
  viendront s'y ajouter au même rythme que le reste du projet).

**Écrans Attelages et Affectations, construits selon la même logique que le socle FMS**
- **Attelages** (US 1.4.2) : tableau des attelages actifs avec dételage daté,
  formulaire de création limité aux tracteurs et semi-remorques réellement
  libres, historique conservé.
- **Affectations** (US 1.4.1) : même structure, avec le blocage prévu par le
  cahier des charges · seul un conducteur actif, habilité et dont les pièces
  sont en règle peut être proposé ; le formulaire affiche une alerte et
  empêche la validation sinon. Vérifié par les données existantes : Nomena
  Andriantsoa (permis expiré) apparaît correctement « À régulariser » dans la
  colonne Pièces de la liste des affectations actives.

Le store véhicules a été enrichi avec les actions réelles (`atteler`,
`dételer`, `affecterConducteur`, `retirerAffectation`), toutes datées et
jamais destructives, cohérent avec le principe déjà appliqué partout ailleurs
dans le projet : on archive, on ne supprime jamais.

## Sixième vague : alignement strict sur le code source de la référence

Cette passe corrige des écarts identifiés en relisant le code source des captures
d'écran fournies, pas seulement leur rendu visuel.

**Création = page pleine, pas une popup**
Vérifié dans le code : `CreateModalShell` des projets de référence est une page
pleine en superposition (bannière, barre de titre avec Créer/Annuler), pas une
petite fenêtre centrée. Un composant `CreateModalShell.vue` a été construit à
l'identique et remplace l'ancien `ModalShell` pour la création d'un employé,
d'une entité et d'un véhicule.

**Écran Véhicules aligné à la lettre**
- Colonnes exactes : Véhicule (avec l'attelage en sous-texte, comme la référence)
  / Type / Marque-Modèle / Statut / Conducteur / Site.
- Indicateurs exacts : Parc courant, Tracteurs, Semi-remorques, Immobilisés.
- Boutons exacts : Archives (N), Importer le parc, Ajouter un véhicule · ce
  dernier ouvrait sur rien avant cette passe ; un vrai formulaire de création
  est maintenant branché.
- Les véhicules retirés du parc ne sont jamais supprimés : ils basculent en
  statut « vendu » et restent consultables via le bouton Archives.

**Écrans Attelages et Affectations : formulaire en ligne, pas en popup**
Le code de référence ouvre le formulaire de création comme un panneau intégré
à la page (bannière rouge « Nouvel attelage » / « Nouvelle affectation »), pas
une fenêtre en superposition · seule l'action destructive (dételer, terminer)
reste une confirmation en superposition. Corrigé à l'identique.

Ajouts complémentaires : colonne « Type remorque » sur l'écran Attelages
(dérivée du modèle : Fourgon, Plateau, Bâchée), titre exact « Affectations
chauffeurs », et la colonne « Alerte pièces » affichée en texte coloré simple
(rouge « Pièce expirée » / vert « OK ») plutôt qu'en pastille, comme la
référence.

## Septième vague : pivot stratégique · réintégration des fonctionnalités du socle FMS

Suite au point hebdomadaire R&D du 5 septembre 2026 : décision de construire une base
FMS commune et complète en fusionnant les besoins du socle FMS et d'UCODIS, plutôt que de limiter
strictement chaque maquette à son propre cahier des charges. Les fonctionnalités
non pertinentes pour un client donné seront désactivables par configuration plutôt
que absentes du socle commun.

**Carte temps réel et Télémétrie réintégrées**
Ces deux écrans avaient été volontairement omis dans les passes précédentes, faute
d'équipement de géolocalisation nommé dans les documents UCODIS. Le code source de
Le socle FMS, relu en détail, n'a lui-même pas de capteur matériel : ses deux
écrans fonctionnent sur des données simulées, avec la mention explicite « Connecter
le boîtier embarqué pour données réelles ». Cette mécanique a été reprise à l'identique
pour UCODIS :
- **Carte temps réel** (nouvel écran, section Tableau de bord) · carte Leaflet/OpenStreetMap
  (libre, sans clé d'API), liste des tracteurs avec recherche, statut coloré
  (en mouvement / arrêté / allumé-immobile / signal perdu), simulation démarrable
  qui anime les positions le long du corridor Antananarivo ↔ Toamasina (RN2, le principal
  axe fret de Madagascar · choix explicite et documenté, pas une coordonnée arbitraire).
- **Télémétrie** (nouvel écran, nouvelle section « Suivi & télémétrie ») · kilométrage,
  niveau de carburant, état moteur, code défaut, état du signal, par tracteur.

Les deux écrans portent un bandeau « Données simulées » explicite, jamais présenté
comme un flux réel · cohérent avec les valeurs déjà appliquées dans tout le projet
(ne jamais faire passer une donnée fabriquée pour une donnée réelle).

Store véhicules enrichi : simulation de position (interpolation le long d'un
corridor, vitesse oscillante), statut opérationnel, lecture de télémétrie ·
toutes explicitement documentées comme simulées dans le code.

## Huitième vague : logo/marque HV, page de connexion, tableau de bord Flotte fidèle, mécanisme de configuration

**Marque HV**
Seul le libellé textuel à côté du logo a changé, comme demandé · le fichier logo lui-même
n'a pas été touché. « UCODIS » → « HV » dans la barre de navigation ; le badge de rôle
en haut à droite garde « · UCODIS » (la filiale), ce qui reste cohérent : HV est le
groupe, UCODIS la filiale dans laquelle on travaille.

**Page de connexion reconstruite**
L'ancien écran à deux volets a été remplacé par la carte centrée du socle FMS (relu dans
le code source), avec la marque « HV Fleet Management System » et les neuf rôles UCODIS
déjà établis, repris dans la même grille à trois colonnes.

**Tableau de bord Flotte, reproduit à l'identique de la référence du socle FMS**
Quatre indicateurs avec barre de progression (Tracteurs actifs, Semi-remorques actives,
Conducteurs disponibles, Alertes documents), bandeau « Statut opérationnel » à pastilles
comptées, panneau « Dernières alertes » et tableau « Véhicules récents » avec position
simulée sur le corridor Antananarivo–Toamasina. Un bug de données a été trouvé et corrigé
en cours de vérification : la distribution des échéances simulées produisait 54 alertes
sur ~55 documents (quasiment tout en alerte) · ramenée à 14 (7 critiques, 7 avertissements),
une échelle crédible pour vingt véhicules.

**Mécanisme de configuration des modules**
Store `parametresModules` et écran Administration → Paramètres listant onze
fonctionnalités de la base commune FMS, chacune activable ou non, avec la raison précise
quand elle reste désactivée (document UCODIS manquant, équipement non nommé, etc.). Le
menu latéral de Flotte réagit immédiatement à ces réglages, sans rechargement de page ·
vérifié en activant « Voyages » en direct : la section « Exploitation » apparaît aussitôt.

**Nouveaux écrans**
Actifs par défaut, avec de vraies données : État de flotte (grille de disponibilité),
Assurances (documents administratifs véhicule avec échéances), Conducteurs (vue
opérationnelle Flotte, distincte de la fiche RH d'Administration). Désactivés par défaut
mais dotés d'un écran réel · jamais un lien mort · expliquant la raison exacte de
l'attente : Voyages, Conformité, Carburant, Contrôles, Départs, Sites & géofences.

## Neuvième vague : sections restaurées, tirets cadratins éliminés, carte fidèle au socle FMS

**Tableau de bord Flotte complet**
Les sections « Attelages et conducteurs » et « Répartition du parc » de la version
précédente ont été réintégrées en plus des ajouts de la vague précédente (indicateurs
avec barre de progression, statut opérationnel, dernières alertes, véhicules récents).
Le tableau de bord porte désormais l'intégralité du contenu demandé.

**Élimination des tirets cadratins**
118 occurrences de « · » réparties sur 51 fichiers ont été remplacées dans tout le
projet : point médian « · » pour les séparateurs de phrase (déjà utilisé ailleurs dans
l'application, ex. « RESPONSABLE FLOTTE · UCODIS »), simple tiret pour les valeurs
vides autonomes, et reformulation ponctuelle où le point médian ne convenait pas (la
plage de dates du planning hebdomadaire, par exemple, est passée de « 31 août · 6 sept. »
à « 31 août au 6 sept. »).

**Carte temps réel, alignée sur le rendu réel du socle FMS**
Relecture du code source de CarteView.vue du socle FMS, plus poussée que la précédente passe :
- Icônes de camion (pas de simples cercles), avec animation de pulsation pour les
  véhicules en mouvement, reprises à l'identique (SVG et keyframes CSS).
- Carte flottante du véhicule sélectionné, centrée en haut de la carte (icône, statut,
  marque/modèle, conducteur, vitesse), avec transition d'apparition.
- Bouton flottant d'alertes en bas à droite (badge numérique, panneau déroulant listant
  les documents véhicule en alerte, cliquables vers l'écran Assurances) · repris du
  même esprit que le bouton d'alertes du socle FMS, adapté aux données UCODIS déjà construites
  (documents véhicule) plutôt qu'aux écarts de voyage, qui n'existent pas encore côté UCODIS.

Le volet « voyage en cours » du panneau gauche du socle FMS n'a pas été repris à ce stade :
il dépend du module Voyages, qui n'a pas encore de données côté UCODIS.

## Dixième vague : module Voyages construit en profondeur, repris du socle FMS à la lettre

Relecture complète du code source du socle FMS pour le module Voyages (store, formulaire de
création, fiche, écran liste) avant toute écriture · pas d'approximation cette fois.

**Ce qui a été repris à l'identique**
- Structure de données : voyage comme objet pivot, étapes ordonnées avec rôle
  (départ/chargement/repos/contrôle/livraison/arrivée), dossier documentaire avec
  pièces obligatoires conditionnant la clôture, arrêts relevés avec justification.
- Écran liste : mêmes indicateurs (En cours, Sites à desservir, Sites manqués, Hors
  tolérance), mêmes colonnes dans le même ordre, mêmes filtres (Trajet, Client, Sites).
- Formulaire de création : véhicule sélectionné manuellement, chauffeur et
  semi-remorque déduits automatiquement (jamais saisis), véhicules non conformes
  écartés avec explication, sélecteur de trajet avec aperçu des étapes.
- Comportement d'interaction : clic sur la référence ou double-clic sur la ligne
  ouvre directement la fiche complète en superposition ; clic ailleurs sur la ligne
  ouvre l'aperçu latéral avec un bouton « Ouvrir le dossier de voyage » · vérifié
  par test des deux comportements séparément.

**Ce qui a été adapté au contexte UCODIS (fret général, pas pétrolier)**
- Volumes de carburant et coulage (le socle FMS d'origine transporte du carburant en citerne) remplacés
  par poids et nombre de cartons, avec un écart de poids en pourcentage plutôt qu'un
  coulage en ‰ · même principe de calcul, donnée différente.
- Types de documents adaptés : ordre de transport, bon de chargement, feuille de
  route, bon de livraison (explicitement cité par la SOP UCODIS), note de réserve.
- Trois trajets de référence sur des corridors réels de Madagascar (Antananarivo–
  Toamasina RN2, en reprenant exactement les coordonnées déjà utilisées par la Carte
  temps réel ; Antananarivo–Antsirabe RN7 ; Antananarivo–Mahajanga RN4).
- Noms de clients (Jumbo Score, Leader Price, Shoprite) : aucun document UCODIS n'en
  nomme aucun · hypothèse illustrative, signalée dans les points à trancher.

Le module Voyages est désormais activé par défaut dans Paramètres, n'étant plus un
écran vide en attente de données.

## Onzième vague : Conformité et Carburant construits, carte connectée aux voyages

**Carte temps réel connectée au module Voyages**
Un clic sur un tracteur affiche désormais, en plus de sa carte d'info, le panneau du
voyage en cours en haut à gauche (client, marchandise, km de référence, semi-remorque,
points de passage avec leur état de franchissement) · reproduction fidèle du panneau
équivalent du socle FMS. Le bouton « Ouvrir le dossier de voyage » ouvre la fiche complète.
Un bug de superposition a été trouvé et corrigé : les panneaux flottants de la carte
(info véhicule, voyage, alertes) restaient visibles par-dessus la fiche une fois
ouverte, la fiche portant un z-index plus faible · masqués désormais tant qu'une
fiche est ouverte.

**Module Conformité construit**
Découverte en lisant le code du socle FMS : leur propre menu « Conformité » pointe en
réalité vers un écran nommé « Écarts » · repris à l'identique pour UCODIS. Écarts
d'itinéraire (sortie de trajet, arrêt non planifié, point de passage manqué, écart
kilométrique, hors fenêtre horaire), avec la règle fondatrice conservée : un écart
naît toujours « à qualifier », le système mesure, il ne présume jamais d'une
intention. Testé en direct : ouverture de la fiche ECA-001, formulaire de
qualification avec motif obligatoire.

**Module Carburant construit**
Méthode plein-à-plein reprise à l'identique du socle FMS (déjà la méthode du socle FMS
elle-même, en l'absence de capteur de niveau des deux côtés) : les litres délivrés
sont une donnée exacte relevée à chaque recharge, la consommation aux 100 km ne se
calcule qu'entre deux pleins complets. Le recoupement par position GPS du socle FMS
(prestataire « Camtrack ») a été retiré, aucun prestataire de ce type n'étant nommé
pour UCODIS ; les contrôles de vraisemblance restants (capacité du réservoir,
cohérence de l'odomètre, chauffeur affecté, plage horaire) ne dépendent d'aucun
équipement. Testé en direct : deux anomalies correctement détectées sur les données
de démonstration (recharge à 02h30, volume supérieur à la capacité du réservoir).

Les trois modules (Voyages, Conformité, Carburant) sont désormais activés par défaut
dans Paramètres.

## Douzième vague : copie à la lettre du sélecteur de trajet et de la carte enrichie

Cette passe corrige un écart réel signalé avec deux captures d'écran précises : le
sélecteur de trajet du formulaire de voyage n'était qu'un menu déroulant statique,
alors que le socle FMS propose un compositeur interactif complet. Le code source exact de
`SelecteurTrajet.vue`, `FleetMap.vue` et du store `sites.ts` du socle FMS a été relu et
copié à la lettre, puis adapté aux données UCODIS.

**Sélecteur de trajet, reconstruit à l'identique**
- Panneau « Trajet de référence » : charge une séquence existante ou compose un
  trajet ponctuel.
- Panneau « Séquence » : sites ajoutés un à un, réordonnables par glisser-déposer,
  chacun avec son rôle (départ/chargement/repos/contrôle/livraison/arrivée), son
  volet (aller/retour) et ses durées (trajet max, arrêt max), repris champ pour champ du socle FMS.
- Panneau « Sites disponibles » : liste cherchable avec bouton d'ajout, sur un
  nouveau référentiel de onze sites du réseau UCODIS (dépôt Tanjombato, entrepôts
  clients à Toamasina/Antsirabe/Mahajanga, relais et points de contrôle du corridor
  déjà établi).
- Panneau « Itinéraire proposé » : carte Leaflet qui trace en direct la séquence
  composée (marqueurs numérotés reliés par une ligne pointillée), distance simulée
  recalculée à chaque changement.

Le bug qui empêchait ce sélecteur de fonctionner a été identifié en le relisant :
le formulaire liait son `v-model` à un simple identifiant de trajet, alors que le
composant attend un tableau d'étapes. Corrigé · testé en direct en ajoutant deux
sites, avec la séquence, la distance (216 km) et le tracé qui se mettent à jour
immédiatement.

**Carte temps réel, alignée sur les deux captures fournies**
- Chaque véhicule de la liste porte désormais un identifiant court (TR-001…), un
  triangle d'alerte s'il a un document non en règle, et sa jauge de carburant
  (pourcentage + barre colorée) · trois éléments visibles sur la référence, absents de la version précédente.
- Le bouton « Lancer la simulation » a été déplacé dans le panneau latéral, sous la
  barre de recherche, à l'endroit exact où le socle FMS le place.
- Les marqueurs portent maintenant un vrai popup Leaflet (au clic), en plus de la
  carte flottante déjà en place · immatriculation, statut, modèle, niveau de
  carburant.

Le message des véhicules écartés du formulaire de voyage a aussi été corrigé pour
détailler le document précis en cause pour chacun (« 4022 TBA (Vignette) · 4027 TBA
(Carte grise)… »), comme la référence.

## Treizième vague : fiches Conformité et Carburant reconstruites à la lettre, tableau de bord conducteur

Relecture complète du code source d'EcartCard.vue et RechargeCard.vue du socle FMS avant
toute écriture. Les deux fiches étaient jusque-là de simples fenêtres centrées
(popup) au lieu de la coquille CardModalShell avec navigation latérale utilisée
partout ailleurs dans le projet (véhicule, voyage, employé) : corrigé.

**Fiche Écart d'itinéraire, reconstruite section par section**
Identification (avec le voyage et le chauffeur en liens cliquables), carte
comparative « Itinéraire prévu et trajet réel » (tracé de référence en pointillé,
marqueur de la position relevée), Mesures, Chronologie, Justification du chauffeur,
Qualification. Le champ « décision » du socle FMS (saisine d'un comité de discipline
propre à leur organisation) a été renommé en « Signalement à la Direction »,
n'ayant pas d'équivalent dans les documents UCODIS.

**Fiche de recharge carburant, reconstruite section par section**
La recharge (avec le chauffeur en lien cliquable), Quantités et bons, Contrôles de
vraisemblance, Qualification de l'écart, et une section Refacturation interne
lorsque la cause retenue est imputable au conducteur. Le circuit à deux validations
hiérarchiques (N1/N2) du socle FMS a été simplifié à une seule validation par le
Responsable Flotte, aucune grille de retenue sur salaire à deux signatures n'étant
documentée pour UCODIS ; la section de recoupement GPS du socle FMS (position déclarée
contre position télématique) n'est pas reprise, aucun prestataire de
géolocalisation n'étant nommé pour UCODIS, comme sur le socle FMS, elle ne s'affiche que
si la donnée existe.

**Tableau de bord personnel du conducteur, nouvel écran**
Accessible par le lien sur le nom du chauffeur, désormais présent dans les deux
fiches ci-dessus. Cinq onglets construits sur des données réelles déjà en place :
Vue d'ensemble (identité, habilitation, affectation en cours, indicateurs), 
Itinéraires (historique des voyages), Carburant (historique des recharges),
Conformité (écarts relevés), Documents (pièces personnelles avec échéances). Un
lien « Ouvrir la fiche RH complète » renvoie vers la fiche employé du module
Administration plutôt que de dupliquer cette donnée, testé en direct, la bonne
fiche s'ouvre bien à l'identifiant demandé.

Un mécanisme d'ouverture directe de fiche employé depuis un lien externe a été
ajouté à l'écran Employés (paramètre `?ouvrir=<id>`), la fiche employé n'ayant
jamais eu de route dédiée dans ce projet (elle s'ouvre en superposition depuis la
liste, par conception).

## Quatorzième vague : cinq écrans reconstruits à la lettre du socle FMS

Seize captures d'écran fournies en référence. Relecture du code source exact de
chaque écran du socle FMS avant reconstruction (`src/types/flotte.ts`, `EtatFlotteView.vue`,
`ConducteurListView.vue`, `ConducteurCard.vue`) plutôt que d'en approximer le
comportement.

**Carburant, complété**
Bouton « Importer un relevé » ajouté, bulle d'explication retirée, indicateur
« Bons délivrés » ajouté (5 indicateurs comme la référence), colonnes corrigées
(Date, Véhicule, Bons, Litres, Montant, Canal, Contrôles).

**État de flotte, nouvel écran**
Les treize codes d'état (DEP-PRV, TR-LIV, ATT-ADM…) repris tels quels du
référentiel du socle FMS, groupés en trois familles (opérationnel, transit, attente) qui
alimentent les indicateurs. Sélecteur « Situation du jour », boutons Archiver et
Exporter, aperçu au clic simple.

**Contrôles, nouvel écran**
Seize points de contrôle sur route, repris de la checklist papier du socle FMS (un point
propre au carburant liquide du socle FMS, « Caméra dôme et vanne », remplacé par « Bâche
et sanglage du chargement », pertinent pour le fret sec d'UCODIS). Écran liste et
fiche complète en superposition avec le tableau des relevés par pause.

**Départs, nouvel écran**
Les quatre contrôles de l'autorisation de départ (checklist, test alcool/drogue,
documents chauffeur, documents véhicule), avec les actions Accorder/Refuser sur la
fiche.

**Assurances, reconstruit**
Le screen affichait auparavant les documents administratifs du véhicule (carte
grise, assurance…) ; le socle FMS nomme « Assurances » l'écran des sinistres. Reconstruit en
conséquence, avec l'indicateur « accidents par million de km » du socle FMS. L'ancien
écran de documents administratifs n'a pas été perdu : il a été déplacé vers une
route dédiée (`flotte-documents-vehicule`) et le lien depuis la Carte temps réel a
été corrigé en conséquence pour ne rien casser.

**Conducteurs, reconstruit**
Bandeau des conducteurs non affectables avec motif, quatre indicateurs, colonnes
Permis/Visite médicale/Score conduite/Statut. Le clic simple ouvre un aperçu avec
deux boutons distincts, comme demandé : « Ouvrir la fiche » (fiche légère :
identité, score en jauge circulaire, exploitation, aptitude médicale) et « Voir la
page complète » (bascule vers le tableau de bord détaillé à onglets déjà construit).
Testé en direct, parcours complet liste → aperçu → fiche → tableau de bord.

**Bug de date corrigé sur six fichiers**
`formatDate()` ne gère que les dates simples (AAAA-MM-JJ) ; plusieurs nouveaux
écrans lui passaient des horodatages complets, produisant un affichage cassé
(« 29T06:35:00/08/2026 »). Remplacé par `fmtDateHeure()` partout où un horodatage
complet est manipulé.

## Quinzième vague : vues manquantes complétées, dashboard conducteur reconstruit à la lettre

Cinq nouvelles captures fournies en référence, montrant des vues et un niveau de
détail que les vagues précédentes n'avaient pas repris en entier.

**Aperçu État de flotte, un vrai bug corrigé**
Le clic sur une ligne n'ouvrait jamais l'aperçu : `ListPageLayout` cherche par
défaut un champ `id` pour identifier la ligne sélectionnée, or `LigneEtatFlotte`
n'a qu'un champ `vehiculeId`. Ce n'était pas un problème de contenu mais de
sélection elle-même ; corrigé avec `row-key="vehiculeId"`, comme le fait le socle FMS
explicitement dans son propre code. L'aperçu a aussi été enrichi (semi-remorque,
boîte rouge motif + date de remise en service, observation libre) pour retrouver
la richesse de la référence.

**Carburant, Contrôles, Assurances : le sélecteur "Vue :" ajouté**
Ces trois écrans n'avaient qu'une seule vue chacun alors que le socle FMS en propose
plusieurs, accessibles par un sélecteur "Vue :" identique à celui déjà en place
sur Conducteurs. Ajoutés :
- Carburant : Registre des recharges (déjà là) + Consommation plein-à-plein
  (déjà calculée par le store, restait à afficher) + Bons par véhicule (nouveau).
- Contrôles : Checklists sur route (déjà là) + Audits de conformité (nouveau :
  dix-sept postes codés repris du classeur du socle FMS, les points propres aux
  matières dangereuses retirés puisqu'UCODIS transporte du fret sec), avec sa
  fiche dédiée regroupant les postes par catégorie.
- Assurances : Sinistres (déjà là) + Polices d'assurance (nouveau, le store
  existait déjà, seul l'écran manquait).

**Dashboard conducteur, reconstruit à la lettre du code du socle FMS**
Nouveau store `scoresConducteurs.ts`, reprenant la méthodologie de notation de
le socle FMS (cinq familles pondérées : sécurité routière 30 %, conformité d'itinéraire
25 %, conformité réglementaire 20 %, qualité de livraison 15 %, discipline
administrative 10 %) et sa grille de prime, comme sur le socle FMS, aucun montant de
prime n'a été communiqué par UCODIS ; les chiffres sont un exemple de calibrage
signalé comme tel, à valider par la Direction et les Ressources humaines avant
toute activation réelle.

L'en-tête affiche désormais le score global avec son delta vs le mois précédent,
comme la référence. Le premier onglet devient "Score & prime" (au lieu de "Vue
d'ensemble") avec les trois indicateurs du socle FMS (score, percentile, prime) et la
décomposition pondérée en barres colorées. Trois onglets ajoutés pour atteindre
les huit de la référence (le socle FMS en a sept, UCODIS en a huit) : Formations
(réutilise les documents personnel déjà typés), Planning et Ressources humaines
(renvoient vers Administration plutôt que de dupliquer une donnée déjà bien
gérée là-bas, testé en direct, les huit onglets s'affichent et se comportent
correctement).

Le score, désormais unique et centralisé dans `scoresConducteurs.ts`, est
partagé entre la liste des conducteurs, la fiche légère et le tableau de bord
complet : les trois affichent exactement le même chiffre pour un même
conducteur.

## Seizième vague : icône Paramètres déplacée, panneau voyage corrigé pour tous les véhicules, bug de date récurrent éliminé

**Icône Paramètres, repositionnée comme sur le socle FMS**
L'accès à Paramètres était un item de menu texte dans Administration > Configuration.
Déplacé dans la barre supérieure sombre, entre la cloche de notification et le compte
utilisateur, en icône seule (roue crantée), exactement l'emplacement du socle FMS. Retiré du
menu latéral pour ne pas le dupliquer.

**Carte temps réel, un vrai manque de données corrigé**
Seuls 4 des 10 tracteurs avaient un voyage enregistré (VOY-001 à VOY-005) : cliquer sur
les six autres (systématiquement ceux en bas de la liste, puisque les quatre avec
activité récente remontent en haut) n'affichait donc logiquement aucun panneau de
voyage, faute de donnée à afficher. Six voyages complémentaires ajoutés (un par tracteur
manquant, statuts variés : clôturé, en cours), avec leurs recharges carburant
plein-à-plein associées. Testé en direct sur les deux derniers véhicules de la liste
(4029 TBA et 4030 TBA) : le panneau s'affiche désormais pour chacun.

**Bug de date récurrent, traqué et éliminé dans tout le projet**
Trois nouvelles occurrences trouvées dans le tableau de bord conducteur (onglets
Itinéraires, Carburant, Conformité), le même défaut déjà corrigé ailleurs :
`formatDate()` ne gère que les dates simples, pas les horodatages complets. Un balayage
systématique de l'ensemble du projet a été fait cette fois (plutôt que de corriger au
fil des captures), pour m'assurer qu'aucune occurrence ne subsiste ailleurs. Les
usages sur `dateDebut` (attelages, affectations) et les échéances de documents ont été
vérifiés comme légitimes (ce sont de vraies dates simples), aucun correctif nécessaire
sur ces points.

## Dix-septième vague : Télémétrie complétée, Sites, Documents et Configuration construits à la lettre du socle FMS

Quatre écrans du module Flotte, relus dans le code source exact du socle FMS avant toute
écriture, comme demandé pour une vérification chirurgicale.

**Télémétrie, complétée**
Le tableau « Dernières mesures » manquait entièrement. Ajouté : cinq relevés
historiques par tracteur (horodatage, kilométrage, carburant, moteur, code défaut),
avec un cas honnête repris du socle FMS : un tracteur sans boîtier déclaré (immobilisé
hors service) affiche « Aucune remontée » plutôt qu'un écran vide sans explication.

**Sites & géofences, construit intégralement**
L'écran était resté un simple message d'attente depuis le début du projet. Construit
en entier : liste avec KPI (total, actifs, types), filtres, aperçu à deux boutons
(« Ouvrir la fiche » / « Modifier »), fiche éditable en place (comme la fiche
véhicule ou employé, pas en lecture seule), formulaire de création. Le store sites
a été enrichi d'un champ région et des fonctions de création/modification. Testé en
direct : édition d'un site, bascule en mode édition confirmée.

**Documents, reconstruit en écran unifié**
le socle FMS réunit documents véhicules et conducteurs dans un seul tableau. Plutôt que de
fusionner mes deux stores existants déjà utilisés ailleurs dans le projet (fiche
employé, tableau de bord conducteur) au risque de casser ce qui fonctionne, cet
écran les compose en une seule vue : une entité VÉH ou CND, un type, une émission,
une expiration, un statut, avec modification et suppression. Le store des documents
véhicule a été enrichi (numéro, date d'émission) pour porter les mêmes informations
que les documents personnel.

**Configuration, nouvel écran, quatre onglets**
Trajets de référence (liste + carte + tableau des étapes, réutilisant le
compositeur SelecteurTrajet déjà construit pour la création de voyage, sans dupliquer
ce code), Clients (CRUD simple, avec la même réserve déjà posée ailleurs : aucun
client précis n'est nommé dans les documents UCODIS), Types d'écart (gravité et
seuil éditables par type), Paramètres (tolérance de poids, seuil de répercussion
kilométrique, préavis documentaire qui alimente désormais l'écran Documents). Les
temps réglementaires de conduite que le socle FMS paramètre ici n'ont pas été repris : aucune
réglementation malgache du transport routier n'a été fournie pour les fonder,
signalé comme point à trancher plutôt que d'inventer des seuils.

Nouveaux stores créés : `configuration.ts` (paramètres d'exploitation), `clients.ts`,
et un magasin de configuration des types d'écart ajouté à `ecarts.ts`. Le store
`trajets.ts` a été enrichi des fonctions de création, modification et archivage. Une
entrée « Configuration » a été ajoutée au menu, dans une nouvelle section
Paramétrage, et une entrée « Documents » dans Suivi & télémétrie.

## Dix-huitième vague : ordre du menu latéral corrigé à la lettre du socle FMS

Capture d'écran de référence fournie montrant l'organisation exacte du menu Flotte
du socle FMS. Deux écarts trouvés et corrigés :
- « Documents » était rangé dans la section Parc véhicules (entre Assurances et
  Conducteurs) ; il a sa propre section « Documents », après Sites & géofences.
- « Sites » était fusionné avec Télémétrie dans une même section « Suivi &
  télémétrie » ; sur le socle FMS, chacun a sa propre section (« Suivi & télémétrie »
  contient uniquement Télémétrie, « Sites & géofences » contient uniquement Sites).

L'ordre complet, vérifié par capture d'écran contre la référence : Tableau de bord,
Exploitation, Parc véhicules, Suivi & télémétrie, Sites & géofences, Documents,
Paramétrage.

## Dix-neuvième vague : Configuration · Trajets de référence refait à la lettre du socle FMS

Capture d'écran de référence fournie montrant que la vraie modale « Nouveau trajet
de référence » du socle FMS est simple (Code, Client, Libellé, case récurrent) et ne
contient aucun site : le trajet naît vide, puis ses sites s'ajoutent un par un
depuis la fiche elle-même, via une ligne compacte sous le tableau des étapes. La
vague précédente avait réutilisé tel quel le compositeur SelecteurTrajet construit
pour la création de voyage (glisser-déposer, carte intégrée au formulaire) au lieu
de relire le vrai comportement du socle FMS pour ce contexte précis, deux interactions
différentes en réalité.

Corrigé en relisant le code source exact du socle FMS :
- La modale de création ne porte plus que les métadonnées du trajet.
- Le tableau des étapes est désormais éditable en ligne (rôle en menu déroulant,
  intervalle et pause en champs numériques, flèches monter/descendre, retrait),
  directement dans les cellules, sans modale.
- Une ligne compacte « Ajouter un site à la séquence » (site + rôle + bouton
  Ajouter) permet d'étoffer un trajet un site à la fois, avec la distance et la
  durée recalculées à chaque modification, affichées en direct.
- Le store trajets recalcule maintenant automatiquement distance et durée dès que
  les étapes changent, plutôt que de laisser l'appelant s'en charger.

Testé en direct : création d'un trajet vide, ajout de deux sites l'un après
l'autre, la carte et la distance se mettent à jour correctement à chaque ajout.

## Vingtième vague : Configuration · Types d'écart reconstruit à la lettre du socle FMS

Capture d'écran de référence fournie montrant l'onglet Types d'écart du socle FMS :
dix-sept types groupés en cinq catégories (Itinéraire, Arrêts, Temps
réglementaires, Comportement de conduite, Documents), chacun avec un bouton
« Modifier » ouvrant une fiche complète, en plus des contrôles déjà éditables en
ligne (gravité, seuil, actif). L'écran précédent était une liste plate de cinq
types sans catégorie ni fiche de modification : reconstruit en conséquence.

Le store des types d'écart reprend maintenant les dix-sept types du socle FMS avec leurs
codes, gravités et seuils d'origine, plus deux types propres à UCODIS déjà détectés
par le moteur d'écarts (sortie de trajet, hors fenêtre horaire), signalés comme tels
puisqu'ils n'ont pas d'équivalent sur le socle FMS. Les catégories « Temps réglementaires »
et « Comportement de conduite » restent désactivées par défaut : les cinq premières
supposent une réglementation malgache du transport routier non fournie, les cinq
secondes une télémétrie embarquée que la Carte temps réel ne fournit pas
réellement, mais les deux catégories sont désormais visibles et modifiables,
plutôt qu'absentes comme dans la vague précédente. Le texte de l'onglet Paramètres
qui affirmait ces seuils « non repris » a été corrigé en conséquence.

## Vingt-et-unième vague : Configuration · Paramètres reconstruit à la lettre du socle FMS

L'onglet Paramètres n'avait jamais été relu dans le vrai code du socle FMS : j'avais
improvisé deux cartes (seuils d'exploitation, seuils d'alerte) qui n'existaient pas
sous cette forme sur le socle FMS, et surtout j'avais laissé la grille de prime conducteur
comme de simples constantes figées dans le code, sans aucune interface pour la
modifier, alors que le socle FMS en fait justement un point fort de l'onglet : « ajustables
sans intervention technique ».

Reconstruit à la lettre, quatre cartes :
- **Temps réglementaires** : les six seuils de conduite (continue, journalière,
  travail journalier, repos hebdomadaire, plafonds), qui alimentent maintenant
  directement la catégorie « Temps réglementaires » de l'onglet Types d'écart.
- **Seuils d'exploitation** : litres par bon, tolérance kilométrique, seuil d'arrêt
  non planifié, plafond bihebdomadaire.
- **Seuils d'alerte** : préavis d'entretien préventif, rayon de validation d'un
  passage, préavis documentaire, chacun avec les bornes de saisie du socle FMS et un
  message d'erreur si la valeur saisie sort de la plage attendue.
- **Grille de prime conducteur**, désormais réellement éditable : les quatre
  paliers (libellé, score minimum, montant) se modifient en ligne, avec un bouton
  Réinitialiser. Testé en direct : modification du montant du palier
  « Excellence » (150 000 → 200 000 Ar), vérifié que le tableau de bord d'un
  conducteur au score maximal affiche immédiatement le nouveau montant.

Le store `configuration.ts` a été réécrit pour porter les noms de champs et les
bornes exacts du socle FMS (`tccMaxMin`, `preavisEntretienKm`, `seuilHorsBornes`…), et le
store `scoresConducteurs.ts` porte maintenant la grille de prime comme un état
réactif modifiable plutôt qu'une constante, avec les fonctions `modifierPalier` et
`reinitialiserGrillePrime` du socle FMS.

## Vingt-deuxième vague : Dashboard conducteur reconstruit à la lettre du socle FMS, bug du delta corrigé

Relecture intégrale du vrai code source du socle FMS (`ConducteurDetailView.vue`) avant
toute réécriture, à la demande explicite d'une vérification chirurgicale.

**Bug d'incohérence du score corrigé**
Un conducteur à 100/100 affichait parfois un delta négatif vs le mois précédent,
ce qui supposerait un score antérieur supérieur à 100, impossible. La cause : le
delta était généré de façon indépendante du score courant. Corrigé en plafonnant
le score du mois précédent à l'intervalle [0, 100] avant de calculer l'écart.
Testé en direct sur un conducteur à 100/100 : affiche désormais « (+0) », plus
jamais de delta incohérent.

**Les sept onglets, reconstruits sur la structure exacte du socle FMS**
La lecture du code a révélé deux erreurs de structure dans la vague précédente :
un onglet « Conformité » ajouté en trop (le socle FMS n'en a pas), et un contenu mal réparti
entre les onglets restants (les voyages étaient rangés sous « Itinéraires », alors
que cet onglet du socle FMS affiche en réalité les écarts ; les voyages appartiennent à
l'onglet « Planning »). Corrigé, sept onglets exactement :
- **Score & prime** (conservé)
- **Itinéraires** : indicateurs de conformité d'itinéraire + tableau des écarts
  relevés (contenu qui occupait à tort l'onglet Conformité supprimé)
- **Carburant** : conso moyenne, écart à la référence trajet, tableau des recharges
- **Documents** : tableau enrichi avec numéro et date d'émission
- **Formations** : formations suivies + habilitations obligatoires, adaptées à
  UCODIS (permis de conduire et visite médicale, sans ADR ni APTH fictifs propres
  au transport d'hydrocarbures du socle FMS)
- **Planning** (nouvel onglet) : disponibilité immédiate, tableau des voyages
  (déplacé depuis l'ancien onglet Itinéraires), absences et congés connectés au
  vrai store de congés du module Administration
- **Ressources humaines** : données administratives, absences, infractions
  internes et sanctions - dérivées des écarts déjà qualifiés avec une décision
  disciplinaire, sans dupliquer cette donnée dans un registre séparé

Un bug de compilation trouvé et corrigé en cours de reconstruction : un
`:class` dupliqué sur le même élément (le même piège déjà rencontré et corrigé
ailleurs dans le projet).

Testé en direct, capture à l'appui, sur les sept onglets d'un même conducteur,
plus une vérification ciblée du delta sur un conducteur à score parfait.

## Vingt-troisième vague : le vrai bug du bouton retour, trouvé et corrigé

Vous aviez raison de me pousser à revérifier : le bouton retour n'était pas
réellement identique au socle FMS, malgré un code d'apparence similaire
(`router.back()`). La vraie différence était ailleurs : la navigation
« Conducteur précédent / suivant » utilisait `router.push()`, qui empile une
nouvelle entrée d'historique de navigateur à chaque clic. Résultat concret :
après plusieurs clics sur « suivant », un seul clic sur retour ne ramenait qu'un
pas en arrière dans cette navigation interne, pas à la liste des conducteurs, il
fallait cliquer autant de fois que de conducteurs parcourus pour sortir
réellement de la page.

Le code source du socle FMS relu à nouveau (`ConducteurDetailView.vue`) montre qu'il
utilise `router.replace()` pour cette navigation, pas `router.push()` :
`replace` remplace l'entrée d'historique courante au lieu d'en empiler une
nouvelle, donc l'historique ne retient toujours qu'une seule étape « tableau de
bord conducteur », quel que soit le nombre de clics précédent/suivant. Corrigé à
l'identique.

Testé en direct le scénario exact : ouverture du tableau de bord d'un conducteur,
trois clics sur « suivant » (p-010 → p-013), puis un seul clic sur le bouton
retour, qui ramène désormais directement à la liste des conducteurs
(`/flotte/conducteurs`), sans étape intermédiaire.

## Vingt-quatrième vague : onglet Score & prime complété, calcul des notes expliqué

**Deux sections manquantes, ajoutées**
La capture d'écran fournie montrait deux sections absentes de mon onglet Score &
prime : la Grille de prime en lecture seule (quatre cartes, palier actuel
surligné, lien « Modifier dans Paramétrage ») et les Bons carburant chauffeur, un
avantage personnel remis au conducteur, distinct du carburant du véhicule.
Recherche faite dans tout le code source du socle FMS dont dispose ce projet : cette
seconde fonctionnalité n'y figure nulle part, ce qui signifie que le code du socle FMS
a évolué depuis la dernière transmission. Reconstruite sur la base de ce que
montre la capture (seuil score ≥ 80, 30 L mensuels), signalée comme telle.

**La question posée sur le calcul des notes, une vraie réponse**
En relisant le code source du socle FMS pour y répondre, j'ai trouvé que le socle FMS ne calcule
pas ces notes du tout : les valeurs (92/100, 60/100…) sont saisies à la main dans
les données de démonstration, sans aucune règle reliant le nombre d'événements à
la note. Il n'y avait donc rien à copier sur ce point précis.

Le calcul côté UCODIS, lui, est réel : chaque famille part de 100 et retire des
points par événement constaté, seule la « Conformité réglementaire » suit une
logique de seuil plutôt qu'une pénalité par événement :
- Sécurité routière : -25 par écart critique, -10 par écart majeur
- Conformité d'itinéraire : -20 par sortie de trajet ou point de passage manqué
- Conformité réglementaire : 100 si permis et visite médicale sont valides, 60 sinon
- Qualité de livraison : -20 par voyage resté en litige
- Discipline administrative : -30 par écart qualifié « non justifié »

Cette formule reste une hypothèse de calibrage (les poids par pénalité n'ont pas
été communiqués par UCODIS), mais elle est désormais explicite : chaque barre de
la décomposition du score affiche la phrase exacte de son calcul, directement
dans l'interface, pour qu'un responsable flotte n'ait plus à se demander comment
un 60/100 a été obtenu.

## Vingt-cinquième vague : icône Paramètres en superposition, dossier de voyage enrichi, import/export réels dans tout le module Flotte

**Icône Paramètres, véritablement indépendante de la page courante**
Le clic sur l'icône engrenage naviguait vers Administration → Paramètres, changeant
de module même depuis Flotte. Transformée en superposition qui s'ouvre par-dessus
n'importe quelle page sans jamais changer de route, avec le même contenu (liste des
modules activables). Un composant `ParametresModulesContent.vue` porte désormais ce
contenu, partagé entre la superposition et la page d'origine (conservée pour
d'éventuels liens directs).

**Dossier de voyage, reconstruit à la lettre du socle FMS**
Relu le fichier source complet du socle FMS (879 lignes) section par section. Ma fiche
n'avait que 6 sections contre 11 sur le socle FMS. Reconstruite avec 9 sections fidèles :
Identification, Affectation (désormais séparée), Plan de trajet (avec carte),
Déroulé site par site (tableau enrichi avec suivi d'avancement), Marchandise et
écart de poids, Temps réglementaires (nouveau, branché sur les seuils de
Configuration), Conformité (nouveau, écarts et arrêts réunis), Dossier documentaire,
Carburant du camion (nouveau). Trois sections du socle FMS n'ont pas été reprises :
Volumétrie & coulage et Détection de siphonnage concernent la mesure de carburant
liquide (les citernes du socle FMS), sans objet pour le fret sec d'UCODIS - déjà
correctement remplacées par Marchandise et écart de poids. Débriefing au retour
reprend un formulaire papier le socle FMS à neuf infractions dont UCODIS n'a pas communiqué
d'équivalent : fabriquer ce formulaire aurait été inventer une procédure, pas
l'adapter.

**Import et export, réellement fonctionnels dans tout le module Flotte**
Audit complet du module : aucun bouton d'export n'écrivait quoi que ce soit
(`/* Export CSV/PDF à connecter. */`), et les deux boutons d'import affichaient une
maquette « disponible prochainement ». Corrigé intégralement :
- Un utilitaire d'export CSV générique et réutilisable (`exportCsv.ts`), avec le
  bon encodage pour Excel et l'échappement correct des valeurs.
- Export réellement fonctionnel sur les treize écrans du module : État de flotte,
  Voyages, Sites, Documents, Véhicules, Carburant (ses trois vues), Contrôles (ses
  deux vues), Départs, Assurances (ses deux vues), Conducteurs, Attelages,
  Affectations, Conformité. Testé en direct : chaque bouton déclenche un
  téléchargement de fichier CSV réel.
- Import réellement fonctionnel sur Véhicules et Carburant, branché sur le vrai
  composant `ImportCsvModal` déjà éprouvé côté Administration (choix de fichier,
  correspondance des colonnes, contrôles de validation ligne par ligne, aperçu avant
  import). Deux fonctions `creer()` ajoutées aux stores véhicules et carburant, qui
  n'en disposaient pas. Testé en direct de bout en bout : chargement d'un fichier
  CSV, correspondance automatique des colonnes (une colonne mal nommée reste à
  mapper manuellement plutôt que d'être ignorée en silence), rejet propre d'une
  ligne incomplète avec son motif exact, puis import réussi d'une ligne valide -
  le contrôle de vraisemblance existant s'applique aussi aux lignes importées,
  comme aux saisies manuelles.

## Vingt-sixième vague : retrait du surplus d'import/export, conformité stricte au socle FMS

Vous aviez raison : la vague précédente avait ajouté des boutons Import et Export
sur treize écrans du module Flotte, sans vérifier où le socle FMS les place réellement.
Audit fait dans le vrai code source du socle FMS - trois écrans exactement portent un de
ces boutons, jamais plus d'un à la fois :
- **Véhicules** : Importer le parc, seul.
- **État de flotte** : Exporter, seul.
- **Carburant** : Importer un relevé, seul.

Retiré intégralement - bouton, fonction, imports d'icône et d'utilitaire devenus
orphelins - sur les dix écrans où le surplus avait été ajouté à tort : Affectations,
Assurances, Attelages, Conducteurs, Conformité, Contrôles, Départs, Documents,
Sites, Voyages. Le style des trois boutons conservés a aussi été vérifié à l'identique
du code du socle FMS (`btnOutline` pour Exporter et pour Importer le parc, `btnPrimary`
pour Importer un relevé de carburant).

Vérifié écran par écran, capture à l'appui : les treize écrans du module affichent
désormais exactement les boutons que le socle FMS affiche, ni plus, ni moins.

## Vingt-septième vague : sept écarts corrigés à la lettre du socle FMS, avec discernement sur les hydrocarbures

Relecture méthodique du code source du socle FMS pour chacun des sept points signalés,
en excluant consciemment ce qui est spécifique au transport de carburant liquide
du socle FMS (signalisation MD, caméra dôme/vanne d'une citerne) puisqu'UCODIS
transporte du fret sec.

1. **Documents** - bug d'aperçu corrigé (`row-key` manquant, mon objet utilise `cle`).
2. **Carburant** - section « Position du véhicule » ajoutée (carte à deux marqueurs,
   lieu déclaré vs position réelle simulée), avec les champs `lat`/`lng`/
   `positionVehicule` ajoutés au type et aux 18 recharges de démonstration.
3. **Fiche Véhicule** - reconstruite avec les 7 sections du socle FMS : Identification,
   Moteur & Carburant (tracteur) ou Remorque, Statut & Liaisons, Acquisition
   (nouveau), Équipements embarqués (nouveau : boîtier embarqué, GPS, détecteur de
   fatigue - sans les caméras dôme/vanne propres à une citerne), Carnet d'entretien
   (nouveau), Cycle de vie (nouveau : sortie du parc réversible, jamais une
   suppression).
4. **Audit de conformité** - vous aviez raison : un poste « Attelage » avait été
   ajouté sans existence sur le socle FMS, et le poste « Ordinateur de bord » (général, pas
   spécifique aux hydrocarbures) manquait. Corrigé pour retrouver exactement les
   dix-sept postes du socle FMS moins les deux propres aux matières dangereuses.
5. **Checklist sur route** - les seize points étaient déjà bien adaptés (bâche et
   sanglage du chargement à la place de la caméra citerne). La quatrième section de
   le socle FMS, « Détail des pauses », manquait : ajoutée.
6. **Fiche Départs** - un vrai garde-fou manquant : sur le socle FMS, le bouton « Accorder
   le départ » est désactivé et un bandeau d'alerte s'affiche tant que les quatre
   contrôles ne sont pas tous conformes ; côté UCODIS, le bouton restait cliquable
   malgré un texte d'avertissement à côté. Corrigé, avec une fonction `peutPartir`
   ajoutée au store.
7. **Fiche Assurance** - la section « Conséquences » du socle FMS (ordre de travail ouvert,
   note sur l'indicateur accidents par million de km) a été ajoutée. La section
   « Police d'assurance » que j'avais construite à part n'existe pas telle quelle
   sur le socle FMS : ses informations sont en réalité intégrées à la section « Coût et
   indemnisation », corrigé en conséquence. Un sinistre est désormais relié à un
   ordre de travail du carnet d'entretien du véhicule concerné (champ
   `ordreTravailRef`), plutôt que de rester une donnée isolée.

Testé en direct, capture à l'appui, sur les sept points.

## Vingt-huitième vague : la checklist intégrée à la fiche Départs, manquée dans la vague précédente

Vous aviez raison de repousser ma réponse "oui, tout est fait" : la capture d'écran
fournie montrait une interaction entière que j'avais manquée dans la fiche
Autorisation de départ. Le contrôle « Checklist véhicule conforme » n'est pas un
simple indicateur passé/échoué comme je l'avais construit : sur le socle FMS, c'est une
ligne expansible qui contient la checklist des seize points, remplie directement
depuis cette fiche, avec un bouton « Valider la checklist avant départ ».

Recherche faite dans tout le code source du socle FMS dont dispose ce projet : cette
interaction n'y figure nulle part non plus, ce qui signifie que le code du socle FMS a
encore évolué depuis la dernière transmission - comme pour les « Bons carburant
chauffeur » découverts dans une vague précédente. Reconstruite fidèlement à partir
de ce que montre la capture, avec les seize points déjà correctement adaptés
(bâche et sanglage du chargement à la place de la caméra citerne, cohérent avec la
Checklist sur route).

Champs ajoutés au type `AutorisationDepart` : `checklistDepart` (l'état coché de
chaque point) et `checklistValideeLe`. Fonction `validerChecklistDepart` ajoutée
au store, qui recalcule automatiquement la conformité du contrôle dès qu'un point
est décoché.

Testé en direct de bout en bout : ouverture de la checklist (état « non encore
réalisée », dix-huit points, dont dix-sept cochés par défaut plus la case
d'origine), décochage d'un point, validation - le contrôle passe immédiatement en
non conforme, le bandeau d'alerte apparaît, le bouton « Accorder le départ » se
bloque, exactement comme le montre la capture de référence.

À l'occasion de cette correction, l'espace disque de l'environnement de travail
s'est retrouvé saturé par l'accumulation de mes propres répertoires de
vérification successifs, corrompant silencieusement une réinstallation des
dépendances. Nettoyé et réinstallé proprement avant de continuer ; le zip déjà
livré s'est révélé intact (aucune différence avec le code source).

## Vingt-neuvième vague : le bouton « + » manquant sur neuf fiches, trouvé en cherchant systématiquement le même type d'erreur

À la question « il y a encore quoi que tu n'as pas fait », plutôt que de répondre
de mémoire, recherche faite du même type d'erreur que celle trouvée sur la fiche
Départs (un élément d'interface du socle FMS aplati ou supprimé sans following le vrai
code). Résultat : le bouton « + » en haut à droite de la coquille de fiche
(`CardModalShell`), visible sur chacune des captures fournies depuis le début de
cet échange, était explicitement masqué sur treize fiches côté UCODIS - alors que
le socle FMS ne le masque que sur quatre d'entre elles.

Vérifié fiche par fiche dans le code source du socle FMS : le bouton est masqué
(`show-title-new-button="false"`) sur Site, Demande de congé, Employé et Entité -
ces quatre-là restent correctement masquées côté UCODIS, c'était déjà fidèle.
Mais le socle FMS laisse la valeur par défaut (visible) sur Véhicule, Sinistre, Recharge,
Autorisation de départ, Checklist sur route, Audit de conformité, Écart,
Conducteur et Voyage - neuf fiches où j'avais ajouté à tort la même surcharge que
sur les quatre premières. Retiré sur ces neuf fiches, le bouton réapparaît
exactement là où le socle FMS le montre. Aucune des neuf fiches du socle FMS ne câble d'action
réelle derrière ce bouton (le clic n'ouvre rien) : c'est fidèle à ce que fait le socle FMS
lui-même, pas une fonctionnalité à construire.

Testé en direct : le bouton apparaît bien sur la fiche de recharge, comme sur les
huit autres fiches concernées.

## Trentième vague : module Maintenance, premiers écrans construits et vérifiés

Poursuite du chantier Maintenance entamé à la vague précédente. Deux bugs
trouvés et corrigés en testant, un de format de date déjà connu du projet,
un de cohérence des données propre à cette vague :

- Deux dates mal formées dans la fiche d'ordre de travail (`formatDate` appelé
  sur un horodatage complet au lieu de `fmtDateHeure`), corrigées.
- Le plan d'entretien Sinotruk Howo ne correspondait à aucun véhicule réel du
  parc (`modele: 'Howo'` contre `'Howo A7'` dans les données Flotte) : corrigé,
  et l'ordre de travail préventif qui s'y référait a été réaffecté à un
  véhicule réellement de ce modèle (4022 TBA) plutôt qu'au Foton Auman qui
  portait la donnée par erreur.

**Écran Plans d'entretien construit et vérifié en direct** : le plan
« Sinotruk Howo A7 » reprend fidèlement les douze opérations du cahier des
charges UCODIS (Module 3 - exemple Sinotruk Howo-NX 400), avec ajout et
suppression d'opération, duplication de plan et suppression protégée (un plan
encore utilisé par un véhicule du parc ne peut pas être supprimé). Un
deuxième plan « Dongfeng KL » illustre le cas d'un modèle sans plan
constructeur communiqué : intervalles calqués sur le plan Howo, signalé comme
tel. Le bandeau des modèles sans plan se met à jour correctement.

Écrans qui restent à construire : Charge d'atelier, Échéances,
Indisponibilités, Fiabilité, Paramètres de l'atelier (actuellement de simples
pages « en construction »).

## Trente-et-unième vague : module Maintenance complet, dix écrans, tous vérifiés en direct

Fin du chantier Maintenance entamé sur plusieurs vagues. Les six derniers écrans
ont été construits, copiés à la lettre de la structure du socle FMS, adaptés au fret
sec d'UCODIS et testés en direct :

- **Charge d'atelier** - taux d'occupation, charge par mécanicien triée par
  priorité, compétences requises, immobilisations programmées.
- **Échéances préventives** - premier des deux seuils atteint (km ou date),
  signale les plans provisoires.
- **Indisponibilités** - dix-neuf codes CRM 2025, coût par famille, un vrai bug
  de date trouvé et corrigé en testant (`formatDate` appelé sur un horodatage
  complet), recherché et confirmé absent du reste du module.
- **Fiabilité** - deux onglets (Fiabilité, Coûts) : MTTR, MTBF global et par
  sous-système, taux de disponibilité, top véhicules à problèmes, pannes sur
  route vs atelier, immobilisation rapportée au kilométrage annuel (à partir
  des relevés carburant), coût par ordre de travail et coût cumulé par
  véhicule.
- **Paramètres de l'atelier** - les trois valeurs de simulation (capacité,
  tarif horaire, coût d'immobilisation) éditables avec recalcul en direct des
  indicateurs qu'elles gouvernent, plus le panneau « Écrans du module » qui
  permet d'activer ou de désactiver à tout moment les quatre écrans que le socle FMS
  propose mais que le cahier des charges UCODIS ne cite pas explicitement -
  testé en direct : l'activation depuis ce panneau fait apparaître
  immédiatement les écrans correspondants dans le menu latéral.

Origine « `equipe_mobile` » ajoutée au type `OrigineOT` : un dépannage sur
route est un concept générique à tout transport routier, pas propre aux
hydrocarbures du socle FMS, il alimente l'indicateur « pannes sur route vs atelier »
de l'écran Fiabilité.

Le module Maintenance compte désormais dix écrans au total : Tableau de bord,
Ordres de travail, Plans d'entretien (toujours actifs, cités par le Module 3
du cahier des charges), et Charge d'atelier, Échéances, Indisponibilités,
Fiabilité, Paramètres de l'atelier (ce dernier toujours actif en tant
qu'écran de configuration ; les quatre premiers désactivés par défaut,
activables à tout moment).
