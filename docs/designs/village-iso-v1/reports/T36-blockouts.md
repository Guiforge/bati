# T36-blockouts : maquettes des lots D, F et G à l'échelle de leur toile

Statut proposé : prêt pour revue
Auteur : blender
Tour de revue : 1

## Fait
- `scripts/iso/iso_blockout.py` : un spec peut porter `pxScale` et `anchorPx` (priment sur ceux du canevas, cas `cellCenter` et `footprintBottom`) ; `pxScale` est recopié dans l'`anchor.json`. Sans ces champs, rien ne change (les 57 stades et les pièces existantes ne sont pas rerendus).
- `scripts/iso/exports/accroches.py` : `screen()` lit `info["pxScale"]` avant celui du canevas.
- `scripts/iso/blockouts/gen_peinture.py` : écrit 18 specs dans `scripts/iso/blockouts/peinture/` (dossier à part : `heights.py check()` refuse dans `pieces/` tout `decor_` inconnu et tout préfixe hors liste ; aucun blockout de bâtiment ni de `pieces/` touché). Il calcule lui-même `pxScale` et `anchorPx` pour centrer le sujet dans la toile à 80 % de la hauteur (largeur au plus 94 %), encre d'environ 12 px.
- `scripts/iso/blockouts/render_peinture.py` : `render` (exports complets via `stage_exports.export`, maquettes webp dans `renders/peinture-maquettes/`, pas dans `assets/`) et `sheet` (une planche par lot).
- Lot D : 7 villageois de face (forgeron, guetteur, sage, champion, herboriste, ménestrel, fermier) : le corps de `pieces/villageois_<role>_face` plus un outil lisible (marteau levé, longue-vue, bâton à anneau, épée, botte d'herbes et panier, luth, fourche). Outils tenus à moins d'une tête au-dessus du corps.
- Lot G : chat `dort`, `assis`, `etire`, `marche` ; poule `picore`, `marche`, `sursaute`, `ailes` (premier clip de chaque `aPeindre` de `vieAnimaux.ts` ; `gratte` est une variante de `picore`, non retenu pour rester à 4).
- Lot F : `decor_tas_bois` (4 rangs de bûches, billot et hache), `decor_cloture` (4 poteaux, 3 lisses), `decor_lanterne` (poteau, bras, lanterne à noyau `amber` émissif), sur `decor1x1`, dans leur case, sous 0,9 de haut.
- Exports de chaque pièce dans `scripts/iso/blockouts/renders/peinture/<slug>.*` : `.anchor.json` (ancrage, ombres grille et px, flaques, volumes, points d'accroche, exports), `.rgba/.png/.dark/.green`, `.mask`, `.classes`, `.emissive`, `.roof`.
- Planches : `docs/designs/village-iso-v1/evidence/T36/blockouts/{D-villageois,G-animaux,F-premier-plan}.png` (fond vert, remplissage de chaque pièce écrit sur la vignette).

## Preuves
- `python3 scripts/iso/blockouts/gen_peinture.py` : 18 pièces, aucune hors de sa case, décors sous 0,9.
- Remplissage mesuré sur l'alpha (`render_peinture.py sheet`), hauteur / largeur de la toile : villageois 80-81 % / 36-68 % ; chat dort 78 / 94, assis 80 / 65, etire 80 / 75, marche 80 / 75 ; poule picore 80 / 81, marche 80 / 88, sursaute 80 / 64, ailes 80 / 66 ; décors : lanterne 80 / 60, tas de bois 55 / 94, clôture 57 / 94 (limités par la largeur de 512 px).
- Reproductibilité : sha256 des 18 `.rgba.png` identique sur deux rendus (`17347c47...0250` les deux fois).
- Ancrage : `accroches.screen` donne l'ancre de l'`anchor.json` à 0,00 px sur les 18 ; sommets des volumes projetés = boîte du masque à 4-6 px près (demi-épaisseur de l'encre), sauf sage (11 px en haut, pointe de bâton).
- Masque émissif non vide pour la lanterne seule, vide pour les autres (aucun foyer ni fenêtre).
- `python3 scripts/iso/exports/test_accroches.py` : passe (1368 sommets, écart 0,00001 px).
- Même angle et même lumière que les villageois : canevas `villager` ou `decor1x1`, caméra de `isoSpec.json`, `light` [0.55, 0.55, 0.63] sur villageois et animaux.
- Coût FLUX : 0 $.

## Douteux ou non fait
- Une exécution de `render_peinture.py` est passée une fois hors de `heavy.sh` (erreur de ma part, ajustement d'échelle au début) ; reproductible et sans effet sur le résultat, mais le plafond de 2 commandes lourdes n'a pas été tenu pour ce rendu.
- `test_exports.py` et `heights.py` échouent déjà, pour une autre raison que moi : `pieces/statue_*` (travail d'un autre coéquipier) n'a pas de `.emissive.png` ni de préfixe dans `PIECES`. Non touché.
- Le chat qui dort reste le moins lisible (une miche grise, tête à droite, queue enroulée en bas) ; les corps sont des troncs de cône, donc un peu massifs. Les chats `etire` et `marche` ont une queue bien visible.
- Les poses larges (chat dort, étiré, marche ; poule picore) sont limitées par la largeur à 94 % : une pose à 80 % de hauteur existe pour toutes sauf le tas de bois et la clôture (55-57 %, toile de décor de 512 px).
- L'échelle de chaque pièce est propre à la pièce (un chat qui dort et un chat qui marche n'ont pas le même `pxScale`) : la recoupe doit lire `pxScale` et `anchor` du `anchor.json`, pas supposer ceux du canevas. L'ancre du lanterne est hors toile (y = 901 sur 768) car le coin de la case est sous le dessin agrandi.
- Les maquettes ne sont pas dans `assets/` (pas d'affichage dans l'app) et les pièces ne sont pas dans `pieces/` : ni l'index des sprites ni `heights.json` ne les connaissent.
- Taille par rapport aux pièces de la carte : ces maquettes ne servent qu'à peindre ; le sprite peint est à recadrer à l'échelle de la carte avant de remplacer `pieces/`.

## Pour la suite
- Détourage : sur l'alpha du candidat, pas sur le masque (le sujet remplit sa toile).
- Si une pièce change : modifier `gen_peinture.py`, relancer `python3 scripts/iso/blockouts/gen_peinture.py`, puis `scripts/iso/team/heavy.sh python3 scripts/iso/blockouts/render_peinture.py render` et `... sheet`.
- Slug pour `iso_loop` : `peinture/<nom>` (ex. `peinture/animal_chat_marche`).
