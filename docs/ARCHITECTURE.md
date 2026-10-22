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

*(Les sections sont complétées au fil de la refonte.)*

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
│   └── ui/                 Primitives sans logique métier (Button, Input, OptionsSelect, TableLookup…)
├── composables/            Logique réutilisable liée à Vue (permissions, routes de fiche, export…)
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

Les listes de référence (entités, catégories, types de congé, sites, employés…) sont chargées une fois par `GET /reference/all` dans `referenceStore`, puis lues par `ReferenceLookup` dans les formulaires et par `referenceLabel(...)` dans les colonnes.

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
| `handlers/` | Endpoints par domaine (`options`, `reference`, `hr/*`, `settings/*`) |
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

`GET /auth/permissions` renvoie une ligne par fonctionnalité : `{ feature, read, insert, update, delete, execute, export, myOnly?, myTeam? }`. `myOnly` et `myTeam` restreignent automatiquement les listes aux données de l'utilisateur ou de son unité (`src/core/listAccessScope.ts`).

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
