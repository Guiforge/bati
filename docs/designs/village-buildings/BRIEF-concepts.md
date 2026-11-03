# Commande de l'étape C, planche de concepts d'un bâtiment

Pour un peintre. Travaille sur place dans `/home/guiforge/Documents/code/bati/.claude/worktrees/iso`, sans commit. Le bâtiment et ses 2 directions gardées sont donnés dans ton envoi.

Lis `docs/designs/village-buildings/<bâtiment>/ideas.md` puis `<bâtiment>/audit.md`. Les corrections d'`audit.md` passent avant `ideas.md`. Modèle de spec : `scripts/bld/concepts/tent.json`. Écris `scripts/bld/concepts/<bâtiment>.json` : une description de l'objet par stade (rough, grand, mythic), en anglais, en formes et matières concrètes, avec les interdits forts dans le texte, car FLUX oublie ce qui reste vague. Les mots du prompt ne nomment jamais un jeu, un studio, un film, une BD ou un artiste.

Défauts déjà vus sur les 5 premières planches, à interdire dans chaque description :
- Cuivre, laiton et or qui brillent : « matte, dull, no shine ». Aucune dorure.
- Tissu qui pend : toute toile est tendue sur un cadre, « no hanging cloth ».
- Bâtiment qui flotte sur le fond sans contact au sol, dalle de sol à bord dur : « a small feathered patch of ground under it, no hard-edged slab ».
- Fumée grise et ombres portées peintes.
- Petites figures en bouillie : au plus 1 ou 2 figures, grandes et nettes.
- Vue de face : garder le trois quarts du dessus.

Commandes, toujours **au premier plan**, sous `flock ~/.cache/bati-flux.lock` :
- `python3 scripts/bld/concepts.py klein <bâtiment> --dirs a,b` (les 2 directions gardées)
- `python3 scripts/bld/concepts.py f3 <bâtiment> --pick da.rough=N ...` (numéro de variante, un par stade et direction)
- `python3 scripts/bld/concepts.py board <bâtiment>`

Choisis la meilleure variante de chaque stade d'après les planches `concepts/sheet_*` : celle dont la forme suit le mieux le texte, sans erreur d'image (bruit, brillance, fausses lettres, angle faux, foule, membres en trop). Ne juge pas l'idée. Si le signe central d'une direction manque sur toutes les variantes d'un stade, renforce le texte et refais ce stade une fois, avec `--stages <stade> --try 2`.

Vérifie `python3 scripts/iso/iso_loop.py budget` avant chaque lot. Plafond pour cette tâche : 0,80 $. Pour compter ton coût, additionne les images (Klein 0,009 $, FLUX 3 0,048 $) : le registre compte aussi les autres peintres. N'édite `scripts/bld/concepts.py` que s'il bloque, au plus court : d'autres peintres l'utilisent.

Ne rends la main qu'après `board`. Une commande qui attend le verrou peut être longue : garde-la au premier plan avec un `timeout` de 590 s et relance-la au besoin, sans boucle sur `pgrep -f`. Si `ls` rend vide, utilise `find`.

Interdits : `docs/designs/village-loop/loupes/`, `git clean`, l'émulateur, `.claude/agents/`, toute référence d'image qui ne vienne pas de Bati.

Réponds en français, court : coût, tes 6 choix en une ligne chacun avec leurs défauts, signes centraux visibles ou non, ce qui a raté.
