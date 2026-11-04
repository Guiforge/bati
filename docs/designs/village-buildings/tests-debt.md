# Dette de tests du chantier bâtiments

## Session 2, 03/11/2026

**`__tests__/fdroid-scanignore.test.ts` rouge :** résolu. La cause était `node_modules` : après `npm ci` dans le worktree, le test passe, sans autre changement.

## Session 3, 04/11/2026 (piste CLEAN)

`fdroid-scanignore.test.ts` : vert sous Node 24 avec le `node_modules` du dépôt, rien à corriger. La suite complète est verte, voir `docs/designs/village/clean/tests-debt.md`.
