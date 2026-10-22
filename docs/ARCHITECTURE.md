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
