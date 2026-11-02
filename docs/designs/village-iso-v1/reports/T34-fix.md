# T34-fix : trois causes du job `verify`

1. react-compiler-coverage
   - `useSonVillage.ts` (L17) : "Cannot access refs during render", cause `dernier.current = lire;` dans le corps. Écriture déplacée dans un `useEffect` sans dépendances, déclaré avant l'effet qui lit `relire`.
   - `IsoVillage.tsx` (L86) : "Cannot access variable before it is declared", cause l'effet `useEffect(() => { if (etape === 2) reveler(); })` placé avant `const reveler`. Effet déplacé juste après la déclaration de `reveler`. Aucun diff non commité n'y existait (git status), donc touché.
2. iso-worklets sous `--coverage` : la fermeture des worklets capture les compteurs d'Istanbul (`cov_…`), des fonctions sans `__workletHash`. `fautifs()` les ignore (`f.name.startsWith("cov_")`). La couverture reste active.
3. iso-dev-screen : 35 tests verts, machine calme, avec couverture. Le plus lent dure 6,7 s (un test à 15 s explicite), plusieurs entre 1,5 et 3,9 s, donc le défaut de 5 s est trop juste. `jest.setTimeout(20_000)` ajouté en tête du fichier, avec la mesure.

Commandes
- `rtk proxy npx jest react-compiler-coverage iso-worklets iso-dev-screen iso-son --coverage --testPathIgnorePatterns=/node_modules/` : Test Suites: 6 passed, Tests: 54 passed (reporters de couverture coupés pour la lisibilité).
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : propre.
- `npx biome check` sur les 4 fichiers : propre.

Fichiers : components/village/iso/useSonVillage.ts, components/village/iso/IsoVillage.tsx, __tests__/iso-worklets.test.tsx, __tests__/iso-dev-screen.test.tsx.
Non vérifié : `npm test -- --coverage` complet.
