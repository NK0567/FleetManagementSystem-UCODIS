# Revue du code d'origine de fms-webapp

> Ce document s'adresse au développeur qui a écrit la première version de l'application. Il recense, un par un, les défauts relevés pendant la refonte, explique pourquoi ce sont des défauts et montre comment ils ont été corrigés. Les références `legacy/src/...` renvoient au code d'origine, conservé dans le dépôt pendant la refonte ; les références `src/...` renvoient au nouveau code.
>
> L'objectif n'est pas de juger mais d'apprendre : chaque fiche se termine par une règle simple à appliquer sur les prochains projets. Le modèle de référence est le front P247 (`P247_FD_LWL_APP`), dont l'architecture est décrite dans [ARCHITECTURE.md](ARCHITECTURE.md).

## Comment lire chaque fiche

- **Constat** : ce qui a été trouvé.
- **Exemple** : où on le voit dans le code d'origine.
- **Pourquoi c'est un problème** : le principe en jeu.
- **Correction** : ce qui a été fait dans le nouveau code.
- **Règle à retenir** : la consigne à appliquer à l'avenir.

## Sommaire

1. [Outillage et hygiène du projet](#1-outillage-et-hygiène-du-projet)

---

## 1. Outillage et hygiène du projet

### 1.1 Deux gestionnaires de paquets en même temps

**Constat.** Le projet était installé à la fois avec npm et avec pnpm.

**Exemple.**
- `package-lock.json` (npm) était versionné.
- `pnpm-lock.yaml` existait aussi, mais n'était pas versionné, alors que c'est lui qui avait réellement servi à installer `node_modules`.
- Le README demandait `npm install`.
- `pnpm-workspace.yaml` contenait encore le texte d'exemple généré par pnpm : `core-js: set this to true or false`.

**Pourquoi c'est un problème.** Un lockfile garantit que tout le monde installe exactement les mêmes versions. Avec deux lockfiles, chacun installe un arbre de dépendances différent selon l'outil qu'il lance, et les bugs « chez moi ça marche » apparaissent. Un fichier de configuration laissé avec un texte d'exemple montre qu'il a été validé sans être lu.

**Correction.**
- Seul pnpm est conservé, comme sur P247 : `package-lock.json` est supprimé et `pnpm-lock.yaml` est versionné.
- Le champ `packageManager` est déclaré dans `package.json`.
- `pnpm-workspace.yaml` est renseigné.

**Règle à retenir.** Un projet = un gestionnaire de paquets = un lockfile versionné. Lire et compléter tout fichier généré avant de le committer.

### 1.2 Des scripts `lint` et `format` qui ne pouvaient pas fonctionner

**Constat.** `package.json` déclarait `lint` (ESLint + oxlint) et `format` (Prettier), mais aucun fichier de configuration n'existait.

**Exemple.**
- Pas d'`eslint.config.*`, pas de `.oxlintrc.json`, pas de `.prettierrc`.
- Le script `lint:eslint` était `eslint . --fix --cache` : un script de vérification qui modifie les fichiers au lieu de signaler les erreurs.
- Prettier, sans configuration, applique ses valeurs par défaut (points-virgules, guillemets doubles). Lancer `format` aurait réécrit tous les fichiers dans un style différent de celui du code.

**Pourquoi c'est un problème.** Un outil de qualité non configuré donne une fausse impression de sécurité : le script existe, mais il ne protège de rien. Et un `lint` qui corrige tout seul masque les problèmes au lieu de les montrer, notamment en intégration continue.

**Correction.**
- `eslint.config.ts` reprend la configuration de P247 (règles Vue + TypeScript recommandées, formatage délégué à Prettier).
- On y ajoute deux règles propres au projet : seul `src/main.ts` peut importer le backend simulé, et le backend simulé ne peut importer ni Vue, ni Pinia, ni composants.
- `.prettierrc` est identique à P247 et `.gitattributes` force les fins de ligne LF.
- Les scripts sont ceux de P247 : `lint` vérifie, `lint:fix` corrige.

**Règle à retenir.** Un outil n'est en place que lorsqu'il est configuré et qu'il passe. Séparer *vérifier* (`lint`) et *corriger* (`lint:fix`).

### 1.3 Aucun test

**Constat.** Le projet ne contenait aucun test, ni aucun outil pour en écrire (pas de Vitest, pas de script `test`). Seul `tsconfig.app.json` excluait un dossier `__tests__` qui n'a jamais existé.

**Pourquoi c'est un problème.** Le code contient beaucoup de règles métier : calcul des soldes de congés, jours ouvrés, transitions de statut, contrôles de vraisemblance du carburant. Sans test, chaque modification peut casser une règle sans que personne ne s'en aperçoive. Les 31 « vagues » de corrections décrites dans l'ancien README en sont la conséquence directe : des bugs corrigés puis réintroduits, par exemple le bug de date « récurrent » de la vague 16.

**Correction.**
- Vitest est configuré comme sur P247 (`vitest.config.ts`, environnement node, stockage web simulé dans `src/test/setup.ts`).
- Chaque règle métier, chaque utilitaire du core et chaque handler du backend simulé a sa spec `*.spec.ts`, placée à côté du fichier testé.

**Règle à retenir.** Toute règle métier s'écrit dans une fonction pure et testée. Un bug corrigé s'accompagne d'un test qui l'aurait détecté.

### 1.4 Des dépendances installées mais jamais utilisées

**Constat.** Plusieurs bibliothèques figuraient dans `package.json` sans être importées nulle part.

**Exemple.**
- `axios`, `vue-i18n`, `@vueuse/core` et `@vue-leaflet/vue-leaflet` : 0 import dans `legacy/src`.
- `clsx` et `tailwind-merge` : utilisés uniquement par `legacy/src/lib/utils.ts`, un fichier lui-même jamais importé.

**Pourquoi c'est un problème.** Chaque dépendance alourdit l'installation, élargit la surface de failles de sécurité à surveiller et trompe le lecteur. Voir `vue-i18n` dans les dépendances laisse croire que l'application est traduite, alors que tous les textes étaient écrits en dur (voir la section i18n).

**Correction.**
- `@vue-leaflet/vue-leaflet`, oxlint et npm-run-all2 sont retirés.
- `axios`, `vue-i18n`, `@vueuse/core`, `clsx` et `tailwind-merge` sont désormais réellement utilisés par la nouvelle architecture.

**Règle à retenir.** On n'installe une dépendance qu'au moment où on l'utilise, et on la retire dès qu'elle ne sert plus.

### 1.5 Un alias `@` configuré mais jamais utilisé

**Constat.** `vite.config.ts` et `tsconfig.app.json` déclaraient l'alias `@` → `src`, mais tout le code utilisait des chemins relatifs.

**Exemple.** 1 797 imports de la forme `from '../...'` et 0 import `from '@/...'`, par exemple `import { usePersonnelStore } from '../../stores/personnel'`.

**Pourquoi c'est un problème.** Les chemins relatifs profonds (`../../../`) sont difficiles à lire. Ils cassent dès qu'on déplace un fichier et ne disent pas d'où vient le code importé.

**Correction.** Comme sur P247 :
- tout import qui traverse les dossiers passe par `@/...` ;
- les imports relatifs sont réservés aux fichiers voisins d'un même module (`./`, `../types/...`) ;
- entre modules, on importe le `index.ts` du module, qui en est l'API publique.

**Règle à retenir.** `@/` pour sortir de son module, `./` pour rester à l'intérieur.

### 1.6 Le README transformé en journal de bord

**Constat.** Le README faisait 1 191 lignes. Il racontait 31 « vagues » de modifications au lieu d'expliquer comment utiliser et faire évoluer le projet.

**Exemple.**
- `legacy/README.md:5-9` affirme que seul le module Administration est construit, alors que les modules Flotte, Maintenance et Planification existent.
- Les vagues décrivent des corrections (« le vrai bug du bouton retour, trouvé et corrigé ») que l'historique git sait déjà raconter.

**Pourquoi c'est un problème.** Un README sert à démarrer sur le projet en quelques minutes. Un historique de modifications y vieillit immédiatement, et un nouveau développeur ne sait pas quelles informations sont encore vraies. L'historique, c'est le rôle de git et des messages de commit.

**Correction.** Le nouveau README est court : présentation, démarrage, scripts et liens vers la documentation. L'architecture est décrite dans `docs/ARCHITECTURE.md`. L'ancien README reste consultable dans `legacy/README.md` pendant la refonte.

**Règle à retenir.** Le README dit *comment utiliser le projet aujourd'hui*. Les messages de commit disent *ce qui a changé et pourquoi*.
