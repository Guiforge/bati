verdict: pass

Revue courte du tour 2 de L1-T17 (iso-code-reviewer, neuf). Les bâtiments vérifiés dérivent de `buildingCodes` (`@/db/schema`), `DERRIERE` est typé, l'assertion inverse resserre le cliquet, le test du voile compare les identifiants. 2 suites, 39 tests verts.

Sortie brute :

verdict: pass

Revue du tour 2 de L1-T17. Les deux tests ciblés passent : `heavy.sh npx jest iso-layout iso-dev-screen` donne 2 suites et 39 tests au vert.

**Ce qui est juste**
- Liste vérifiée (`__tests__/iso-layout.test.ts:367-371`) : le test filtre `buildingCodes`, importé de `@/db/schema` à la ligne 16. Un bâtiment qu'on ajoute au schéma est donc contrôlé d'office, et la liste écrite à la main ne sert plus qu'aux exceptions.
- `DERRIERE` (`iso-layout.test.ts:347`) est typé `readonly BuildingCode[]`. Un code faux ne compile pas.
- Assertion inverse (`iso-layout.test.ts:372-374`) : `DERRIERE.filter(servieDevant)` doit rester vide. Si une exception reçoit un chemin devant au bon palier, `servieDevant` renvoie vrai et le test rougit. Le cliquet ne peut donc que se resserrer.
- `servieDevant` (`iso-layout.test.ts:358-365`) regarde les bords `+gx` et `+gy` de l'emprise, et compare le palier de la case de chemin à celui de la parcelle. C'est bien ce que l'important demandait.
- Test du voile (`__tests__/iso-dev-screen.test.tsx:333-338`) : il compare les identifiants triés `iso-voile-*` à la liste des cases d'eau (`PIECES` hors décor), et non plus des effectifs. Un voile posé sur un décor, ou un voile qui manque, le fait échouer.

**Mineur, non bloquant**
- `iso-layout.test.ts:362` : avec `?? 99`, une case hors de la grille compte comme impossible à servir. C'est cohérent, sans effet aujourd'hui.

Ce que je n'ai pas fait : je n'ai pas cassé les tests exprès pour les voir rougir. Le raisonnement suffit ici, la logique est directe.
