# Revue des corrections du monde, tour 3 (iso-code-reviewer, neuf, 30/10)

VERDICT : PASS. Aucun bloquant ni important. jest ciblé par heavy.sh : 35 suites, 408 tests.
- Reflets par bande : `refletsPar` teste chaque case contre `vues.slice(i+1, fin+1)` hors eau ; le test « nothing sorted between » vérifie les 3 stades, « the rule bites » prouve le retrait.
- Petits îlots : bandes calculées sur les `vues` filtrées (IsoCarteDemo.tsx:1103), au plus 5, plafond tenu.
- dev-iso monte `Ciel` une seule fois (app/dev-iso.tsx:281).
- `lisiereMontree` garde gx+gy >= TAILLE-2.
Mineurs : `m.set` de iso-maquettes.test.ts écrase en silence une collision peint/peint (ajouter un expect) ; le rat et les marcheurs ne sont pas dans `vues`, un reflet peut passer sur eux (déjà le cas avant, visuel minime).
