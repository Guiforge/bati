# Dette de tests du chantier bâtiments

## Session 2, 03/11/2026

**`__tests__/fdroid-scanignore.test.ts` rouge** : `node_modules/@maplibre/maplibre-react-native/android/build.gradle` est signalé comme à neutraliser pour F-Droid.

- Cause probable, non vérifiée : l'état de `node_modules` dans ce worktree. La session a touché des scripts, des docs et `components/village/iso/ombres.ts`, ni `package.json`, ni le paquet, ni la recette F-Droid, et la suite était verte sur `02d73f33`.
- À faire : `npm ci` dans le worktree puis relancer ce test. S'il reste rouge, suivre le message du test, car F-Droid supprimerait le module.
- Pas de correction cette session : tu as demandé de finir les concepts.
