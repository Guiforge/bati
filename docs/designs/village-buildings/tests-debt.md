# Dette de tests du chantier bâtiments

## Session 2, 03/11/2026

**`__tests__/fdroid-scanignore.test.ts` rouge :** résolu. La cause était `node_modules` : après `npm ci` dans le worktree, le test passe, sans autre changement.
