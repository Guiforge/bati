# T25-exports : les rendus statue_* font échouer test_exports.py et heights.py

## Cause
- `test_exports.py` : les 6 specs `blockouts/pieces/statue_*.json` (suivies par git) étaient rendues (.png, .anchor.json) mais jamais exportées : `.emissive.png` et `.roof.png` absents, maquette `assets/.../blockout/pieces/statue_*.webp` absente. Export incomplet.
- `heights.py` : `PIECES` ne connaissait pas `statue_` (ni `animal_`). Test qui ignorait les statues.

## Correction
- `scripts/iso/team/heavy.sh python3 scripts/iso/exports/stage_exports.py pieces/statue_{cerf,cheval,hermine,ours,sanglier,saumon}` (6 slugs seulement).
- `heights.py` : `PIECES` += `statue_`, `animal_`. Aucune règle de hauteur ni d'écart affaiblie (le contrôle de préfixe reste).

## Preuves
- `heights.py` : ok, 21 bâtiments, 57 stades.
- `test_exports.py` : les 6 statues passent (ombre, 8 exports, maquette). Restent rouges, hors T25 : maquettes `pieces/animal_*` (9, "mock-up differs from the render") et `forge_grand` (point d'accroche, `accroches.py` modifié par un autre).

## Git
Les rendus `renders/pieces/statue_*` doivent entrer dans git, comme decor_/eau_/villageois_ : les tests les lisent, ce sont les exports des specs suivies. Les `.webp/.json` de maquette aussi (nouveaux, non suivis).

## Suite (test_exports.py entièrement vert : "ok: 102 stages, 8 exports each")
- forge_grand : ni le test ni l'export n'étaient à assouplir, `visible()` (T38) déplaçait `px` de la fenêtre 2 sans toucher `grid`, donc les deux ne désignaient plus le même point. Corrigé à la source : `visible()` reçoit `to` et recalcule `grid` (glisse le centre le long du mur et en hauteur, résolution 2x2 de `px = to(grid)`), `keep_seen` et `stage_exports.export` passent `to`. `forge_grand.anchor.json` : seule `fenetres[2].grid` change ([1.33, 1.44, 0.52] -> [1.33, 1.4681, 0.5622]), recalculée par la même formule sans rendre Blender (`couvre` conservé). Contrôle px = grid à 0,05 px inchangé.
- animal_* (9) : le test exigeait une maquette lossless pleine toile. `recadrer_animaux.py` (L4-T08c) écrit exprès un recadrage serré, WebP q90, commun aux 3 poses, avec ancre décalée dans le .json. Côté test périmé. Pour `pieces/animal_*` il vérifie maintenant : taille = sidecar, recadrage (décalage = ancre du rendu - ancre du sidecar) sans rien couper de l'alpha du rendu, écart moyen au rendu <= 1,5 (mesuré 0,5 à 0,8). Rien d'autre assoupli.
