# Architecture de FMS UCODIS

> Document de référence pour toute personne qui intervient sur le front. Il décrit l'organisation du code, les conventions et la façon d'ajouter une fonctionnalité. L'architecture reprend celle du front P247 (`P247_FD_LWL_APP`), dont le module `sales/customers` sert de modèle.

## Sommaire

1. Vue d'ensemble
2. Arborescence
3. Flux de données : api → service → store → page
4. Backend simulé
5. Authentification et permissions
6. Navigation et registres
7. Internationalisation
8. Conventions de code
9. Ajouter une entité
10. Outillage et scripts
11. Le domaine flotte
12. Le domaine maintenance

*(Les modules RH, flotte et maintenance sont migrés ; planification et libre-service suivront le même modèle.)*

## 1. Vue d'ensemble

FMS UCODIS est une application Vue 3 + TypeScript qui couvre les ressources humaines, la flotte, la maintenance et la planification des transports d'UCODIS Transport.

| Couche | Technologie |
|---|---|
| Interface | Vue 3 (Composition API, `<script setup>`), Tailwind CSS 4, icônes `@lucide/vue` |
| État | Pinia (stores *setup*) |
| Routage | vue-router 5, routes générées depuis `src/pages/`, historique à dièse |
| HTTP | Client axios partagé (`src/core/api/httpClient.ts`) |
| Traductions | vue-i18n, français et anglais |
| Serveur | API REST au contrat de P247 ; en attendant, backend simulé dans le navigateur (`src/mocks/`) |

## 2. Arborescence

```
src/
├── main.ts                 Démarrage : backend simulé (si activé), modules, Pinia, i18n, routeur
├── App.vue                 Initialisation de la session, chargement des options et références
├── router/index.ts         Routeur, garde d'authentification et de permissions, page d'atterrissage
├── pages/                  Une page = une route (routage par fichiers) ; pages minces
├── layouts/                DashboardLayout : TopBar + NavBar + contenu + palette de commandes
├── components/
│   ├── layout/             TopBar, NavBar, DemoAccountPicker
│   ├── shared/             Composants utilisés par plusieurs modules (listes, fiches, filtres, dialogues)
│   └── ui/                 Primitives sans logique métier (Button, Input, OptionsSelect, TableLookupField…)
├── composables/            Logique réutilisable liée à Vue : pages de liste (useListPage), fiches (useEntityCard),
│                           formulaires (useEntityForm, useEntityCreate), permissions, export, colonnes…
├── core/
│   ├── api/                httpClient, authApi, lecture des erreurs d'API
│   ├── factories/          createCrudApi → createCrudService → useCrudState
│   ├── navigation/         Registre des menus, routes par fonctionnalité, page d'atterrissage
│   ├── search/             Registre des entités de la palette de commandes (Ctrl+K)
│   ├── i18n/ · bootstrap/ · theme/ · app/ · types/ · utils/
├── stores/                 Stores globaux : user, menuPermissions, options, références, démarrage
├── modules/<domaine>/<entité>/   Code métier (voir § 3)
├── mocks/                  Backend simulé (voir § 4)
├── locales/{fr,en}/        Traductions, un fichier par domaine
├── types/                  Types partagés (réponses d'API, authentification, options, références)
└── utils/                  Fonctions pures (dates, formats, colonnes…)
```

Règle de placement d'un composant :
- utilisable dans n'importe quelle application → `components/ui/` ;
- structure globale de l'écran → `components/layout/` ;
- utilisé par au moins deux modules → `components/shared/` ;
- sinon → `modules/<domaine>/<entité>/components/`.

## 3. Flux de données : api → service → store → page

Chaque entité est un dossier `src/modules/<domaine>/<entités>/` organisé en couches. Chaque couche ne connaît que celle du dessous :

```
pages/        EmployeeCategoriesList · EmployeeCategoryCard · EmployeeCategoryCreateModal
   │          (useListPage · useEntityCard · useEntityCreate)
components/   EmployeeCategoryForm (useEntityForm)
   │
stores/       useEmployeeCategoryStore = useCrudState(...) + actions propres
   │
services/     employeeCategoryService = createCrudService(api) : déballe l'enveloppe HTTP
   │
api/          employeeCategoryApi = createCrudApi({ basePath }) : appels httpClient
types/        EmployeeCategoryApi, EmployeeCategorySearchColumn
domain/       règles métier pures, partagées avec le serveur simulé (optionnel)
index.ts      API publique du module
```

| Couche | Responsabilité | Ne fait jamais |
|---|---|---|
| `api/` | Une fonction par endpoint ; renvoie la réponse axios | Transformer les données, gérer un état |
| `services/` | Renvoie les données utiles (`data.data`, `{ items, meta }`) ; ajoute les actions métier (`approve`, `validate`…) en étendant le service CRUD | Toucher à Vue ou à Pinia |
| `stores/` | État de liste (recherche, filtres, tri, pagination), fiche courante, actions qui combinent plusieurs appels | Construire des URL, lire le DOM |
| `components/` | Le formulaire de l'entité : brouillon, champs, contrôles de saisie ; expose `buildFullPayload`, `buildDiffPayload`, `validateForCreation`… | Appeler l'API |
| `pages/` | La liste, la fiche (modale ouverte par `?no=&cardMode=`) et la modale de création | Recopier une logique déjà dans un composable |

Les trois composables de page évitent de réécrire la même mécanique dans chaque écran :
- `useListPage` : droits, préférences de colonnes, filtres avancés, export Excel, fiche ouverte par l'URL, création et suppression ;
- `useEntityCard` : chargement depuis la liste ou l'API, mode édition, enregistrement des seuls champs modifiés, enregistrement précédent et suivant, garde des modifications non enregistrées ;
- `useEntityForm` et `useEntityCreate` : brouillon, champs obligatoires, règles de saisie, envoi de la création.

Le `[id].vue` de chaque entité ne fait que rediriger vers la liste avec `?no=` : une fiche s'ouvre toujours par-dessus sa liste, comme sur P247.

Les listes de référence (entités, catégories, types de congé, sites, employés…) sont chargées une fois par `GET /reference/all` dans `referenceStore`, puis lues par `ReferenceLookup` dans les formulaires. Ce champ repose sur `TableLookupField`, le champ en deux parties de P247 : le code à gauche, le libellé du choix à droite, une liste déroulante et la liste complète (`SublistModal`) et par `referenceLabel(...)` dans les colonnes.

## 4. Backend simulé

Tant que l'API du FMS n'existe pas, `src/mocks/` joue le rôle du serveur. Il est installé comme **adaptateur** du client HTTP partagé : les modules appellent `httpClient` exactement comme avec un vrai serveur, et reçoivent les mêmes enveloppes, codes HTTP et erreurs.

```
module api/ ──► httpClient (axios) ──► adaptateur mock ──► routeur ──► handler ──► collection (localStorage)
                                   └─► (VITE_USE_MOCK_API=false) vrai serveur VITE_API_BASE_URL
```

### Activation et bascule vers un vrai serveur

| Variable | Rôle |
|---|---|
| `VITE_USE_MOCK_API` | `true` : le mock est installé au démarrage (`src/main.ts`) ; `false` : les requêtes partent vers le serveur |
| `VITE_API_BASE_URL` | URL de l'API réelle (ignorée par le mock) |
| `VITE_MOCK_LATENCY_MS` | Latence simulée de chaque requête, pour voir les états de chargement |

Avec `VITE_USE_MOCK_API=false`, le code du mock n'est même pas inclus dans le build. Basculer vers le vrai serveur ne demande donc aucune modification de code, à condition que le serveur respecte le même contrat d'API.

### Organisation

| Dossier | Rôle |
|---|---|
| `http/` | Adaptateur axios (latence, annulation, erreurs), routeur (`get/post/patch/delete`, paramètres `:no`, contrôle de session et de permission), réponses standard, moteur de liste (recherche, filtres, tri, pagination), ressource CRUD générique, export Excel |
| `db/` | Collections persistées dans le `localStorage` (préfixe `fms-mock:v1:`), version de seed, recalage des dates, numérotation |
| `auth/` | Jetons de démonstration, calcul des permissions par profil, endpoints `/auth/*` |
| `fixtures/` | Données de démonstration et référentiels (comptes, matrice de permissions, options, modules activables) |
| `handlers/` | Endpoints par domaine (`options`, `reference`, `hr/*`, `settings/*`, `fleet/*`) |
| `files/` | Stockage de fichiers simulé (pièces jointes, reçus, photos) |
| `i18n.ts` | Messages du serveur en français et en anglais, choisis selon l'en-tête `x-lang` |
| `clock.ts` | Date de référence des données de démonstration (`2026-09-04`) |

### Contrat d'API

Le contrat est celui de P247 :
- réponse : `{ success, statusCode, message, data, timestamp }` ;
- liste : `data = { items, meta: { total, page, limit, totalPages } }` ;
- erreur : `{ success: false, statusCode, message, errorCode?, duplicateField?, errors? }`.

Les paramètres de liste sont aussi ceux de P247 : `page`, `pageSize`, `searchQuery`, `searchColumns` (liste séparée par des virgules), `sortBy`, `sortDirection` (`ASC`/`DESC`), `filters` (tableau JSON `{ field, valueType, value, operator }` ; une valeur tableau signifie `IN`, et `LIKE` accepte le joker `%`).

Une entité standard expose :

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/<domaine>/<entités>` | read |
| GET | `/<domaine>/<entités>/:no` | read |
| POST | `/<domaine>/<entités>` | insert |
| PATCH | `/<domaine>/<entités>/:no` | update |
| DELETE | `/<domaine>/<entités>/:no` | delete |
| POST | `/<domaine>/<entités>/export` | export (fichier `.xlsx`) |
| POST | `/<domaine>/<entités>/:no/<action>` | execute (approbation, validation...) |

### Données de démonstration

- Les fixtures sont écrites autour du **4 septembre 2026**. À la création d'une collection, les champs listés dans `dateFields` sont décalés pour garder le même écart avec aujourd'hui.
- Les modifications de l'utilisateur sont conservées d'une visite à l'autre. Le lendemain, les mêmes champs sont décalés d'un jour.
- `MOCK_SEED_VERSION` (`src/mocks/db/database.ts`) se change quand la structure des fixtures évolue : toutes les collections sont alors régénérées.
- `POST /__mock/reset` remet toutes les données dans leur état initial.
- Mot de passe de tous les comptes de démonstration : `demo`.

### Règles

- Le mock joue le serveur : il ne peut importer que des types, des utilitaires purs (`@/utils`, `@/core/utils`) et les règles métier pures des modules (`modules/*/*/domain`). Il n'importe ni Vue, ni Pinia, ni composants, ni stores (règle ESLint `app/mock-backend-isolation`).
- Aucun fichier de l'application, hormis `src/main.ts`, n'importe le mock (règle `app/mock-backend-entry`).
- Les règles qui relèvent de l'autorité du serveur (transitions de statut, unicité, numérotation, champs calculés, droits) sont appliquées dans les handlers, même quand l'écran les vérifie aussi pour le confort de l'utilisateur.

## 5. Authentification et permissions

### Connexion et session

1. `POST /auth/login { userCode, userPassword }` renvoie `{ accessToken, user }`.
2. Le jeton est rangé dans `localStorage.auth_token` et ajouté par `httpClient` à chaque requête (`Authorization: Bearer …`), avec la langue (`x-lang`).
3. `useAuth().initAuth()` restaure la session au démarrage : profil rechargé (`GET /auth/profile`), permissions chargées (`GET /auth/permissions`).
4. Une réponse 401 hors connexion efface le jeton et renvoie vers `/login`.

La langue du compte s'applique à la connexion. Sur une session restaurée, le choix manuel de l'utilisateur l'emporte.

### Fonctionnalités et actions

Les droits sont exprimés comme sur P247 : une **fonctionnalité** (`EMPLOYEE`, `LEAVEREQUEST`, `MODULETOGGLE`…) et six **actions** :

| Action | Sens |
|---|---|
| `read` | Voir la liste et les fiches |
| `insert` | Créer |
| `update` | Modifier |
| `delete` | Supprimer |
| `execute` | Actions métier (approuver, valider, archiver…) |
| `export` | Exporter vers Excel |

`GET /auth/permissions` renvoie une ligne par fonctionnalité : `{ feature, read, insert, update, delete, execute, export, myOnly?, myTeam? }`. `myOnly` et `myTeam` restreignent automatiquement les listes aux données de l'utilisateur ou de son unité (`src/core/listAccessScope.ts`). Le serveur applique la même restriction à toutes ses réponses (listes, fiches, exports) : le filtre de l'écran n'est qu'un confort. Exemple : le personnel de bureau ne voit que ses propres demandes d'absence et ses propres soldes.

Côté écran :

```ts
const { canInsert, canUpdate, canExecute } = usePermissions('LEAVEREQUEST')
```

Le serveur revérifie chaque requête (403). Les droits par profil de démonstration sont définis dans `src/mocks/fixtures/auth/rolePermissions.ts`.

### Garde du routeur

Pour chaque navigation, `src/router/index.ts` applique ces règles dans l'ordre :
1. Pas de jeton : seule `/login` est accessible.
2. Les permissions sont chargées une fois par session.
3. `/login` et `/` mènent à la **page d'atterrissage** : la page préférée du compte si elle est accessible, sinon la première page accessible du menu, sinon l'accueil « aucun module ».
4. Une page dont la fonctionnalité n'est pas lisible renvoie vers `/`.

Aucun nom de profil n'apparaît dans le routeur ni dans les composants : tout passe par les fonctionnalités.

## 6. Navigation et registres

Le socle ne connaît aucun module. Chaque module s'enregistre au démarrage (`src/modules/index.ts` → `register<Domaine>Module()`) auprès de trois registres :

| Registre | Fichier | Rôle |
|---|---|---|
| Menus | `core/navigation/moduleRegistry.ts` | `registerNavMenu({ labelKey, order, subItems: [{ labelKey, to, menuKey }] })` |
| Routes protégées | `core/navigation/featureRoutes.ts` | `registerFeatureRoutes({ EMPLOYEE: { to: '/hr/employees', menuKey: 'employee' } })` : quelle fonctionnalité protège quelle page |
| Recherche | `core/search/searchRegistry.ts` | `registerSearchableEntity({ key, labelKey, icon, basePath, searchColumns, service, toHit })` pour la palette Ctrl+K |

Le menu affiché (`menuPermissionsStore.navMenus`) ne contient que les entrées dont la fonctionnalité est lisible. Tant que les permissions ne sont pas chargées, aucun menu n'est affiché.

## 7. Internationalisation

- Toutes les chaînes affichées passent par `t('clé')`. Aucun texte en dur dans les templates ni dans les stores.
- Les clés sont **plates** et préfixées par domaine : `'hr.employees.col.no'`, `'common.save'`.
- Il y a un fichier par domaine dans `src/locales/fr/` et `src/locales/en/`, importé dans le `index.ts` de chaque langue.
- `pnpm i18n:check` compare les deux langues clé par clé et échoue s'il en manque une.
- Pluriels : `'Aucun élément | {count} élément | {count} éléments'`, puis `t(clé, { count }, count)`.
- Dates et nombres : `formatDate`, `formatDateTime` et `formatNumber` (`src/utils/format.ts`) suivent la langue active.
- Les libellés des énumérations (statuts, types, profils) viennent de l'API (`GET /options/all?language=fr`) et se lisent avec `optionsStore.getOptionLabel('leaveRequestStatus', valeur)`.
- Les messages d'erreur du serveur arrivent déjà traduits selon l'en-tête `x-lang` : `apiErrorMessage(error, repli)`.
- Changer de langue recharge l'application derrière un écran d'attente (`reloadApplicationForLocale`), pour ne jamais afficher un écran à moitié traduit.

## 8. Conventions de code

### Langue et nommage

- Tout le code est en anglais : fichiers, dossiers, routes, types, variables, clés de traduction. Le français n'apparaît que dans `src/locales/fr/` et dans les données de démonstration.
- Dossiers en kebab-case (`leave-requests/`), fichiers `.ts` en camelCase (`leaveRequestStore.ts`), composants `.vue` en PascalCase (`LeaveRequestCard.vue`).

| Élément | Convention | Exemple |
|---|---|---|
| Type renvoyé par l'API | `<Entity>Api` | `EmployeeApi` |
| Colonnes de recherche | `<Entity>SearchColumn` | `EmployeeSearchColumn` |
| API | `<entity>Api` | `employeeApi` |
| Service | `<entity>Service` | `employeeService` |
| Store | `use<Entity>Store`, id et `persistKey` `'<domaine>-<entité>'` | `useEmployeeStore`, `'hr-employee'` |
| Pages | `<Entities>List`, `<Entity>Card`, `<Entity>CreateModal` | `EmployeesList` |
| Formulaire | `<Entity>Form` | `EmployeeForm` |
| Route | `/<domaine>/<entités-kebab>` | `/hr/leave-requests` |
| Fonctionnalité (droits) | majuscules, sans séparateur | `LEAVEREQUEST` |
| Clé de traduction | plate, `domaine.entités.zone.clé` | `'hr.employees.col.no'` |

- Les valeurs permises sont des constantes `as const` dont on déduit le type (`EMPLOYEE_STATUSES` → `EmployeeStatus`), jamais des `enum`. Les valeurs stockées sont des codes anglais ; leurs libellés viennent des options de l'API.
- L'identifiant d'un enregistrement est son code métier, le champ `no`. Il n'existe pas d'identifiant technique à côté.

### Imports et dépendances

- Dans un module : imports relatifs (`../services/employeeService`).
- Vers un autre module : uniquement par son `index.ts` (`@/modules/hr/job-positions`).
- Le socle (`core/`, `components/`, `composables/`, `stores/`) ne connaît aucun module : les modules s'enregistrent auprès de lui (§ 6).
- Les règles pures d'un module (`domain/`) n'importent ni Vue ni Pinia : elles sont partagées avec le serveur simulé et testées sans navigateur.

### Composants et formulaires

- Placement selon le § 2 : `ui/` (générique), `layout/`, `shared/` (au moins deux modules), sinon le `components/` du module.
- Un formulaire édite une copie (`useEntityForm`). Il n'envoie que les champs modifiés et expose `buildFullPayload`, `buildDiffPayload`, `validateForCreation` et `validateForEdit`.
- Une action métier (approuver, valider, archiver) n'a qu'un point d'entrée dans l'interface : la fiche. Les autres écrans y renvoient par un lien `?no=`.
- Pas de `v-html`, pas de `confirm()` natif, pas de clé de liste par index, pas de délai arbitraire pour attendre le rendu.

### Règles et serveur

- Toute règle d'intégrité (unicité, transitions de statut, gardes de suppression, droits, calculs) est appliquée par le serveur, même quand l'écran la vérifie aussi par confort.
- Une valeur calculable (effectif, solde, jours ouvrés) n'est pas stockée : le serveur la calcule à la lecture.
- L'auteur d'une action est l'utilisateur de la session, enregistré par le serveur (`createdBy`, `modifiedBy`, `decidedBy`…).

### Commentaires et tests

- Un commentaire explique un **pourquoi** non évident : une règle métier, un piège, une décision. Pas de bannières, pas d'historique (il est dans git), pas de JSDoc systématique.
- Un `catch` vide est interdit. Une erreur ignorée volontairement porte sa raison en une ligne.
- Les specs `*.spec.ts` sont rangées à côté du code testé. Chaque règle de `domain/` et chaque endpoint du serveur simulé a la sienne.

### Git

- Un commit par étape cohérente, au format Conventional Commits, en anglais (`feat(hr): …`, `fix(core): …`, `docs: …`).
- La chaîne `pnpm type-check && pnpm lint && pnpm test && pnpm i18n:check && pnpm build` passe avant chaque commit.

## 9. Ajouter une entité

Le modèle à copier est `src/modules/hr/employee-categories/`. Pour une entité `widgets` du domaine `fleet` :

1. **Serveur simulé**
   - Ajouter la fixture et sa collection (`src/mocks/fixtures/fleet/widgets.ts`), la déclarer dans `src/mocks/db/database.ts` et augmenter `MOCK_SEED_VERSION`.
   - Écrire le handler avec `registerCrudResource` (`src/mocks/handlers/fleet/widgets.ts`) : lecture des champs avec `readAll` et `readPatch`, contrôles de référence, gardes de suppression. Les champs calculés se calculent dans `list()`.
   - Ajouter la fonctionnalité `WIDGET` à la matrice `src/mocks/fixtures/auth/rolePermissions.ts`.
   - Écrire la spec du handler (création, doublon, garde de suppression, 403).
2. **Module**
   - `types/widget.types.ts` : `WidgetApi`, `WidgetSearchColumn`.
   - `api/widgetApi.ts`, `services/widgetService.ts`, `stores/widgetStore.ts` (id du store et `persistKey` : `'fleet-widget'`), `index.ts`.
   - `components/WidgetForm.vue` avec `useEntityForm`.
   - `pages/WidgetsList.vue` (`useListPage`), `pages/WidgetCard.vue` (`useEntityCard`), `pages/WidgetCreateModal.vue` (`useEntityCreate`).
3. **Routes et navigation**
   - `src/pages/fleet/widgets/index.vue` (`<DashboardLayout><WidgetsList /></DashboardLayout>`) et `[id].vue` (`redirectToListCard`).
   - Dans `fleet.module.ts` : `registerFeatureRoutes({ WIDGET: { to: '/fleet/widgets', menuKey: 'widget' } })` et l'entrée de menu correspondante.
4. **Traductions** : `src/locales/{fr,en}/fleetWidgets.ts`, importés dans les deux `index.ts`, et les clés de menu dans `nav.ts`.
5. **Vérification** : `pnpm type-check && pnpm lint && pnpm test && pnpm i18n:check && pnpm build`, puis un passage à l'écran avec un profil qui a tous les droits et un profil en lecture seule.

## 10. Outillage et scripts

| Outil | Fichier | Rôle |
|---|---|---|
| pnpm | `package.json` (`packageManager`), `pnpm-lock.yaml`, `pnpm-workspace.yaml` | Seul gestionnaire de paquets |
| Vite 8 | `vite.config.ts` | Dev server et build, `base: './'` (déploiement en répertoire virtuel IIS) |
| Routage par fichiers | `vue-router/vite` (inclus dans vue-router 5) | Génère les routes depuis `src/pages/` et leurs types dans `src/typed-router.d.ts` |
| Composants auto-importés | `unplugin-vue-components` | Composants de `src/components`, `src/layouts` et des dossiers `components/` et `pages/` des modules utilisables sans import ; types dans `src/components.d.ts` |
| TypeScript 6 | `tsconfig.app.json` (code), `tsconfig.node.json` (fichiers de config) | Mode strict + `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters` |
| ESLint 10 | `eslint.config.ts` | Règles Vue et TypeScript recommandées, formatage délégué à Prettier, frontières d'import du backend simulé |
| Prettier | `.prettierrc` | Sans point-virgule, guillemets simples, largeur 100, pas de virgule finale |
| Vitest 5 | `vitest.config.ts`, `src/test/setup.ts` | Specs `src/**/*.spec.ts`, environnement node, `localStorage` simulé en mémoire |
| Parité i18n | `scripts/check-i18n-parity.mjs` | Échoue si une clé existe dans une langue et pas dans l'autre |
| Icônes | `scripts/icons/generate-icons.py` | Régénère les icônes de `public/` depuis le logo source |

`src/typed-router.d.ts` et `src/components.d.ts` sont générés par Vite et versionnés : `vue-tsc` en a besoin avant tout démarrage du serveur.

Le dossier `legacy/` contient l'ancien code. Il est exclu de TypeScript, d'ESLint, de Prettier et du build.

Avant chaque commit, la chaîne suivante doit passer :

```sh
pnpm type-check && pnpm lint && pnpm test && pnpm i18n:check && pnpm build
```

## 11. Le domaine flotte

Le domaine `fleet` regroupe une quarantaine d'entités sous un seul menu « Flotte ». Elles suivent toutes le modèle des § 3 et 9. Cette section décrit ce qui est propre au domaine : qui porte quoi, quelles règles traversent plusieurs entités, et où les phases suivantes viendront se brancher.

### Entités et responsabilités

| Groupe | Entités (`src/modules/fleet/`) |
|---|---|
| Pilotage | `dashboard`, `live-map`, `reports`, `alerts`, `fleet-status` |
| Parc | `vehicles` (équipements, compteur, photos), `couplings`, `driver-assignments`, `drivers` |
| Trajets | `route-templates`, `trips`, `departure-authorizations`, `route-deviations` |
| Conformité | `documents`, `company-documents`, `insurance-policies`, `claims`, `infractions`, `trainings`, `road-checklists`, `inspections` |
| Carburant | `fuel-refills`, `fuel-consumption`, `fuel-cards`, `fuel-card-transactions` |
| Télématique | `telematics-events`, score des conducteurs (`drivers/domain/driverScore.ts`) |
| Référentiels | `sites`, `site-types`, `providers`, `vehicle-types`, `equipment-types`, `document-types`, `check-points`, `infraction-types`, `deviation-types`, `telematics-event-types`, `fuel-gap-causes`, `alert-rules` |
| Réglages | `fleet-settings` : un seul enregistrement, une section par thème (temps de conduite, géorepérage, documents, sécurité, carburant, télématique, score) |

Deux choix structurent le domaine :
- **Un conducteur est un employé RH.** `drivers` est une vue calculée sur les employés dont le poste conduit. L'identité se modifie dans la fiche employé ; la flotte n'ajoute que l'affectation, l'éligibilité, la conformité documentaire et le score.
- **La flotte porte le trajet** (le mouvement du véhicule, de l'arrêt de départ au dernier arrêt). La planification (phase 4) ajoutera les ordres de transport, qui référenceront un trajet au lieu de le recopier.

### Statuts dérivés

Aucun statut n'est stocké quand les faits suffisent à le déduire. Il est calculé à chaque lecture, par une fonction pure du dossier `domain/` de l'entité, testée.

| Statut | Fonction | Déduit de |
|---|---|---|
| Statut d'un véhicule | `vehicleStatus` (`vehicles/domain`) | sortie du parc, hors service, immobilisations (document, contre-visite), trajet en cours, affectation, attelage |
| État de flotte du jour | `fleetState` (`fleet-status/domain`) | statut du véhicule et arrêts restants du trajet |
| Document, police | `documentState`, `policyState` | dates de validité et préavis |
| Infraction, formation | `infractionStatus`, `trainingStatus` | prise en charge, suite donnée, dates |
| Plein | `refillStatus` | contrôles calculés (réservoir, compteur, conducteur, horaire, GPS) et qualification |
| Carte carburant | `cardStatus` | date d'expiration et blocage |
| Alerte | `alertStatus` | signal encore présent et traitement enregistré |
| Événement télématique | `telematicsEventStatus` | prise en compte, infraction ouverte |
| Situation sur la carte | `liveSituation` | trajet en cours, position, dernière remontée |

Une immobilisation vient d'une cause : chaque module ajoute la sienne à `vehicleStatus` (documents, contre-visites, indisponibilités et entretiens dépassés de la maintenance). Aucun module ne modifie le statut d'un véhicule directement.

### Règles qui traversent plusieurs entités

Elles sont appliquées par le backend simulé (`src/mocks/handlers/fleet/`), comme le ferait le vrai serveur :
- **Qui conduisait, sur quel trajet.** `tripAt` et `expectedDrivers` (`links.ts`) déduisent le trajet et le conducteur d'un véhicule à un instant. Les pleins, les événements télématiques et l'import les utilisent tous.
- **Départ.** Un trajet ne démarre qu'avec une autorisation de départ accordée, tant que le module « départs » est actif. Les contrôles de l'autorisation sont figés au moment de la décision.
- **Clôture.** Un trajet ne se clôture pas tant qu'il reste des écarts d'itinéraire à qualifier. Il ne se termine pas sans le relevé du compteur d'arrivée.
- **Quatre yeux.** Une décision qui engage (retenue sur écart de consommation, décision sur un document de l'entreprise) est refusée si son auteur est celui qui l'a proposée. La comparaison se fait sur le code utilisateur, jamais sur le nom.
- **Alertes.** Les signaux sont recalculés à chaque lecture (`alertSignals`), sous une clé stable `catégorie.numéro` qui ne contient jamais d'état. Les règles d'alerte (une par catégorie) fixent les destinataires et le délai d'escalade.
- **Formations.** Une formation n'est jamais créée par un calcul. Elle naît d'une action : clôture d'une infraction avec la suite « formation », sinistre, ou proposition depuis le score d'un conducteur.
- **Une seule définition par indicateur.** La consommation (`averageLitersPer100` : total des litres sur total des kilomètres), le score et les montants sont calculés une fois ; le tableau de bord et les rapports les réutilisent.

### Positions et temps

- Les dates de démonstration sont recalées sur aujourd'hui (§ 4). Les specs fixent l'horloge sur le 4 septembre 2026 à 10 h (`createTestServer`).
- La position d'un véhicule n'est ni stockée ni simulée par un minuteur : `positionOnTrip` la calcule à partir des arrêts du trajet en cours et de l'heure. Les zones sans couverture (`fixtures/fleet/deadZones.ts`) produisent les pertes de signal.
- La carte interroge `GET /fleet/live/positions` toutes les 10 secondes. Le minuteur appartient à la page et s'arrête quand on la quitte. Aucun store ne lance de minuteur.
- La seule formule de distance de l'application est `distanceKm` (`src/utils/geo.ts`).

### Fichiers, imports et exports

- Les pièces jointes (documents, reçus, photos) passent par le stockage de fichiers simulé (`src/mocks/files/`), avec une liste de types autorisés et une taille maximale (`src/utils/fileRules.ts`). Aucun fichier n'est stocké en base64 dans un enregistrement.
- L'import des pleins (`POST /fleet/fuel-refills/import`) passe chaque ligne par la même fonction que la saisie manuelle (`buildRefill`). Le navigateur se contente de lire le CSV. La lecture (`src/core/utils/csvImport.ts`), le dialogue (`CsvImportDialog`) et la boucle serveur qui rend compte de chaque ligne refusée (`src/mocks/http/importRows.ts`) sont partagés avec l'import de l'historique de maintenance.
- Les exports de listes sont produits par le serveur (`POST <base>/export`). Les rapports sont exportés en Excel et en PDF dans le navigateur, à partir des tableaux traduits affichés à l'écran (`reports/services/reportExport.ts`).

### Points d'extension pour les phases suivantes

| Phase | Branchement prévu |
|---|---|
| 3. Maintenance | Fait : causes `maintenance` et `service` dans `vehicleStatus` ; ordre de travail ouvert depuis un sinistre, une check-list, une visite ou un défaut télématique (§ 12) |
| 4. Planification | Ordres de transport qui référencent un trajet ; famille « qualité de livraison » du score conducteur |

## 12. Le domaine maintenance

Le domaine `maintenance` couvre l'atelier, de la panne déclarée à sa réparation validée, ainsi que l'entretien préventif, le stock de pièces, les pneus et les indicateurs. Il a un seul menu « Maintenance ». Ses entités suivent le modèle des § 3 et 9. Cette section décrit ce qui lui est propre.

### Entités et responsabilités

| Groupe | Entités (`src/modules/maintenance/`) |
|---|---|
| Pilotage | `reliability` (tableau de bord, indicateurs, coût de possession d'un véhicule) |
| Atelier | `work-orders` (diagnostic, temps, pièces, atelier externe, planification), `downtimes`, `workshop-load` |
| Préventif | `maintenance-plans`, `service-due` (échéances dérivées, passages) |
| Contrôles | `vehicle-checks`, `mobile-interventions` |
| Pièces | `stock-items` (stock et mouvements), `purchase-requests` |
| Pneumatiques | `tyres`, `tyre-layouts` |
| Référentiels | `technicians` (compétences des employés de maintenance), `competences`, `failure-codes` (systèmes, sous-systèmes, modes, causes), `downtime-codes`, `mission-types`, `vehicle-check-points` |
| Réglages | `maintenance-settings` : capacité de l'atelier, main-d'œuvre, coût d'immobilisation, préavis et tolérance d'entretien, seuils pneus, objectifs de l'équipe mobile |

Trois choix structurent le domaine :
- **Un technicien est un employé RH.** La maintenance ajoute ses compétences, sous son matricule. Toute personne (équipe mobile, temps pointé, technicien qui valide une rotation) est désignée par son matricule, jamais par un nom saisi.
- **L'ordre de travail est la porte unique.** Une panne déclarée à la main, un contrôle véhicule, une intervention mobile non résolue, un sinistre, une check-list, une visite, un défaut télématique, un entretien dû et l'import d'historique passent tous par `createWorkOrder` (`src/mocks/handlers/maintenance/workOrders.ts`). Les mêmes contrôles s'appliquent partout. L'origine (`origin`) et la source (`originNo`) sont stockées sur l'ordre, jamais sur la source ; celle-ci retrouve son ordre à la lecture (`workOrdersBySource`).
- **Rien ne se recopie.** Le coût d'un ordre, le stock d'un article, l'état d'une échéance ou d'un pneu sont calculés à la lecture à partir des faits enregistrés (temps, mouvements, passages, relevés).

### Statuts dérivés

| Statut | Fonction | Déduit de |
|---|---|---|
| Ordre de travail | `workOrderStatus` | diagnostic, démarrage, fin déclarée, validation, annulation |
| Indisponibilité | `downtimeStatus` | date de fin |
| Échéance d'entretien | `serviceDue` | dernier passage, intervalles km et jours, préavis, tolérance, plan provisoire |
| Stock d'un article | `stockQuantity`, `stockStatus` | somme des mouvements, seuil d'alerte |
| Demande d'achat | `purchaseRequestStatus` | dates de commande, de réception, d'annulation |
| Contrôle véhicule | `vehicleCheckOutcome` | résultats figés, points bloquants |
| Intervention mobile | `mobileInterventionStatus` | arrivée, clôture, résolution |
| Pneu | `tyreStatus` (mock), `safetyAlert`, `rotationDue` | passages sur les véhicules, rechapage, rebut, dernier relevé |

Deux causes d'immobilisation s'ajoutent à `vehicleStatus` (§ 11) : `maintenance` (une indisponibilité ouverte) et `service` (un entretien dépassé au-delà de la tolérance, sur un plan confirmé). Plusieurs indisponibilités peuvent être ouvertes en même temps sur un véhicule, une par cause.

### Règles qui traversent plusieurs entités

- **Immobilisation selon la gravité.** Une panne majeure ou critique ouvre l'indisponibilité dès la déclaration ; une panne mineure ou un entretien, au démarrage du travail. L'indisponibilité d'un travail confié à un garage s'arrête au retour du véhicule, pas à la validation.
- **Quatre yeux.** La validation d'une fin de travaux est refusée à qui a déclaré la fin, saisi du temps ou fait partie des techniciens (`fourEyesBlock`, comparaison sur les codes).
- **Le serveur vérifie ce que l'écran filtre.** Garage autorisé, fournisseur de pièces ou de pneus autorisé, technicien actif et compétent pour le sous-système, position libre dans le plan de pneus, véhicule en service.
- **Stock.** Toute variation passe par `addMovement` (`stockLedger.ts`), qui refuse un stock négatif. Une réception d'achat fait entrer la pièce, puis la sort vers l'ordre qui l'attendait. La fin d'un ordre attend toutes ses pièces achetées.
- **Passages d'entretien.** La validation d'un ordre préventif enregistre un passage par opération couverte, au kilométrage de fin.
- **Sinistre.** Un sinistre ne se clôture pas tant que sa réparation est en cours (`closureBlocks`, motif `repairOpen`).

### Indicateurs

Une seule fonction calcule les indicateurs d'une période, `reliabilityKpis` (`reliability/domain/reliability.ts`), selon les définitions validées :
- MTTR sur les ordres correctifs, de la déclaration à la fin déclarée ;
- MTBF égal aux km du parc divisés par le nombre de pannes ;
- coût au km égal au coût des ordres validés dans la période divisé par les km de la période ;
- disponibilité égale aux jours-véhicules non perdus, en fractions de jour.

L'historique importé compte dans les coûts, pas dans la fiabilité. Les km d'une période se lisent entre toutes les mesures de compteur d'un véhicule (relevés, pleins, trajets, ordres) par interpolation (`kmAt`, `kmInPeriod`). Le tableau de bord, la page de fiabilité et le coût de possession les réutilisent.

### Imports et alertes

- L'historique de maintenance s'importe en CSV (`POST /maintenance/work-orders/import`). Le mécanisme est le même que pour les pleins (§ 11) : chaque ligne devient un ordre clôturé, porteur de son coût d'origine (`historicalCost`).
- Les pneus remontent dans les alertes de la flotte (catégorie `tyre`) : critique pour un relevé sous les seuils de sécurité, information pour une rotation due.

### Points d'extension pour les phases suivantes

| Phase | Branchement prévu |
|---|---|
| 4. Planification | La disponibilité d'un véhicule pour un transport lit `vehicleStatus`, qui inclut déjà les causes de maintenance ; un ordre de transport ne recopie pas l'état de l'atelier |
| 5. Réglages restants | Les réglages de l'atelier sont déjà dans `maintenance-settings` ; seuls les paramètres transverses restent à migrer |
