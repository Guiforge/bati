# T36 lots B et C (31/10)

Rien écrit dans `assets/` ni dans l'index. Lot B changé de méthode par le chef (FLUX recopie les couleurs de l'image 2) : recoloration par script, 0 $. Lot C : FLUX 3 comme prévu.

## Coût
Lot BC FLUX : **3,162 $** sur 4 $ (lot B FLUX abandonné après 10 sprites : 1,968 $ ; lot C : 1,194 $). Lot B recoloré : 0 $. Alerte des 10 $ acquittée par le chef.

## Lot B : recoloration (`scripts/iso/recolor_night.py`, une seule table pour les 15)
Rouges vifs vers brun brique sombre (teinte 22, S max 0,42, V max 0,50), bleus clairs et violets vers gris froid (teinte 205, S max 0,16, V max 0,60), lissé par rampes ; encre (V < 0,16 à 0,30) et fenêtres chaudes claires intactes ; alpha inchangé. Réglée sur heroes_hall solid et armory solid.
Audit A (sprite recoloré posé sur vert, découpe et mesure identiques) : PASS pour armory solid, heroes_hall solid et grand, tent ×3, watchtower solid, wizard_tower rough et solid, druid_grove grand. Échecs : armory rough (light), heroes_hall rough (detail), watchtower rough (holes), wizard_tower grand (palette), druid_grove solid (detail). Non vérifié : si ces échecs viennent déjà du sprite d'origine.
Planches (ancien, recoloré, autres stades) : `docs/designs/village-iso-v1/evidence/T36/lotB-recolor/<slug>_planche.png`, sprites `<slug>.recolor.png`, `audit.json`.
Les planches FLUX du lot B (10 sprites) restent dans `evidence/T36/lotB/` pour mémoire : elles ne comptent plus.

## Lot C : FLUX 3, image 2 = stade peint voisin (solid ; rough pour high_road solid), 3 candidats
| Sprite | c0 | c1 | c2 |
| --- | --- | --- | --- |
| archery_range rough | palette | PASS | holes |
| dragon_lair rough | palette | palette | palette |
| druid_grove rough | PASS | PASS | palette |
| fountain rough | PASS | palette | palette |
| observatory rough | palette | detail | palette |
| high_road solid | palette, detail | palette, detail | palette, detail |
Planches : `evidence/T36/lotC/<slug>_planche.png`. Script : `evidence/T36/lotBC.py`.

## Entrée (feu vert du chef, 31/10)
Entrés : lot B recoloré armory solid, heroes_hall grand, tent solid et grand, watchtower rough et solid, wizard_tower rough, solid et grand, druid_grove solid (`recolor_night.py --enter`, provenance : entrée FLUX conservée, `edited: "script"`, champ `recolour`) ; lot C archery_range rough c1, druid_grove rough c0, fountain rough c0 (`iso_loop.accept`). Index régénéré, listes de `iso-maquettes.test.ts` et `iso-socle.test.ts` complétées. `couvre_fenetres.py` relancé, son test rc 0, `UPDATE_ACCROCHES=1 npx jest iso-accroches` ; `jest iso-` 680 tests verts. Pas de ligne T36 dans BOARD.md : non modifié.

## Tour 2 (0 $ recoloration, 0,21 $ FLUX ; lot BC total 3,372 $)
Planches : `evidence/T36/round2/`. Recoloration `--r2` : armory_rough (light), heroes_hall_rough (detail), tent_rough PASS, druid_grove_grand (light), dragon_lair_rough c0 (detail), high_road_solid c0 et c2 (detail). FLUX 3 observatory_rough : c0 PASS, c1 detail, c2 light. La table r2 change les pixels des 10 entrés et fait échouer watchtower_rough (holes, light) et wizard_tower_rough (detail) : ils gardent la table du tour 1. heroes_hall_solid : laissé, après V1.
