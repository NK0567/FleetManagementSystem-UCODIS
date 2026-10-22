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
