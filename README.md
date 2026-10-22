# FMS UCODIS

Fleet Management System pour UCODIS Transport : ressources humaines, flotte, maintenance et planification des transports.

L'application suit l'architecture du front P247 (Vue 3, TypeScript, Vite, Pinia, Vue Router, vue-i18n, Tailwind CSS 4). Tant qu'aucun backend n'est disponible, les données sont servies par un backend simulé embarqué (`src/mocks/`).

## Démarrer

```sh
pnpm install
pnpm dev
```

Comptes de démonstration : sur l'écran de connexion, choisir un compte ; le mot de passe est `demo`.

## Scripts

| Commande | Rôle |
|---|---|
| `pnpm dev` | Serveur de développement |
| `pnpm build` | Build de production |
| `pnpm type-check` | Vérification des types (`vue-tsc`) |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm format` | Prettier |
| `pnpm test` | Tests unitaires (Vitest) |
| `pnpm i18n:check` | Parité des clés de traduction fr / en |

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) : architecture, conventions, guide d'ajout d'une entité.
- [docs/CODE_REVIEW_NOTES.md](docs/CODE_REVIEW_NOTES.md) : revue du code d'origine et corrections appliquées.

## Refonte en cours

L'ancien code est conservé dans `legacy/` comme référence, hors build. Chaque module y est supprimé une fois migré.
