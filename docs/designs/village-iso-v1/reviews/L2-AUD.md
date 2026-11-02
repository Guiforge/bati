verdict: fail

Audit de fin du lot 2 réduit (iso-tech-auditor, neuf), sur `3eedb7fb`. Corrections du chef : BOARD corrigé (L2-T04, L2-T05, L2-T06 ne sont plus marquées faites pour la revue d'ensemble et les captures), pages H1, H2, H2b archivées sous `evidence/`, point budget du lot 2 dans KNOWLEDGE, tâches L2-T11 (captures), L2-T12 (revue d'ensemble), L2-T13 (provenance des revues), L3-T01 (ombre du socle par l'app).

Sortie brute (texte des points, condensé par le chef sans en changer le sens) :

verdict: fail

## BLOQUANTS
B1. La revue d'ensemble « Ensemble posé sur le sol » n'a été faite pour aucune famille, et le BOARD la donnait pour faite (`PROMPT-EQUIPE-V1.md:167`, critère 1 ; `BOARD.md:92-93` « terminée » ; `rg -i "ensemble|tier_3|tier_6|item 15" reviews/L2-* reports/L2-*` vide). forge_solid (FLUX.2 pro, POC, fond magenta) jamais jugé à côté de forge_rough et forge_grand. Mesures HSV (alpha > 200) : feu de camp saturation 73 au grand contre 126 au solid ; forge saturation 118 à 139, valeur 66 à 82 ; valeur de 54 (`well/solid`) à 83 (`farm/solid`). Correction : captures du quart peint (paliers 1, 3, 6, zoom 1,0 et 0,6), revue « Ensemble posé sur le sol » par famille avec tier_3 et tier_6, BOARD corrigé, familles qui détonnent à Guillaume.
B2. Personne n'a vu le quart peint sur la carte : L2-T06 « terminée » (`BOARD.md:94`) mais `reports/L2-T06.md:18` « Rien vérifié sur appareil », émulateur arrêté. Correction : captures et remesure courte (Native Heap, PSS à froid, pan, repos).

## IMPORTANTS
I1. L'ombre propre du socle décidée à H1 n'a pas de tâche ; `rg -i socle components/village/iso app/dev-iso.tsx` vide ; les 16 sprites du lot 2 en sont dépourvus, `windmill/solid` (28/10) et `forge/solid` (POC) la portent probablement peinte, risque de double ombre.
I2. Provenance de `forge/solid` : le sha256 de `scripts/iso/blockouts/renders/forge_solid.png` ne correspond plus (les 18 autres oui) ; IoU alpha / masque actuel 0,976 (forge_grand 0,996, windmill_solid 0,998).
I3. `human_override` seulement quand l'audit A échoue (`scripts/iso/iso_loop.py:956-970`), 6 entrées ; 7 sprites acceptés malgré un regard neuf en échec sans marque (campfire_rough, campfire_grand, tent_grand, well x3, farm_rough) ; 7 jamais revus (tent_rough c1, tent_solid c1, forge_rough, windmill_rough, farm_solid, farm_grand, windmill_sails) ; seuls forge_grand et windmill_grand ont passé A et le regard neuf. Correction : champ `review` à l'`accept`.
I4. Validations H2 et H2b réduites à « reco » renvoyant à une page hors dépôt ; identifiants bien recopiés dans LOG ; `VALIDATIONS.md` sans ligne. Correction : archiver le texte des pages.
I5. Pas de point budget par famille (§5) : débuts 0,481 $ (0,080 $ par sprite), muscle 0,681 $ pour 11 images (0,062 $), lot 2 1,162 $, V1 1,711 $ ; projection des 39 stades restants 2,5 à 3,2 $ ; `KNOWLEDGE.md:39` (28 à 43 $) périmé.
I6. Fichiers figés toujours non suivis (commit de lancement en attente).
I7. Franges vertes possibles (item 6) : 222 à 408 pixels de bord verdâtres sur well/rough, well/solid, forge/rough, forge/grand, tent/grand, les trois windmill, campfire/solid ; 0 sur forge/solid ; mesure grossière, à trancher sur captures.
I8. Seuls 2 des 17 nouveaux stades passent audit A et regard neuf ; pour les 39 restants, Guillaume serait seul juge sauf changement de prompt, de consigne de palette ou de modèle.

## MINEURS
BOARD contradictoire (`BOARD.md:88-89` contre `:44-45`) ; L2-AUD sans L2-T07 à L2-T10 dans ses dépendances ; maquettes et sprites dans le bundle (2,76 Mo) ; `accepted_by` prouvé par LOG seulement.

## Ce qui est solide
19 entrées `accepted_by: Guillaume`, licence BFL, originaux signés présents ; modèle Klein sauf forge/solid ; `human_override` sur les 6 qui ratent A ; les 18 originaux correspondent par hash aux identifiants de LOG (H2, H2b, windmill_solid) ; budget.json V1 1,711 $, solde 3630,2, somme des 45 lots 1,711, sondes 0,457 / 0,50 et 0,804 / 5 ; audit gelé intact ; test_budget, test_audit PASS ; test_exports 87 stades, light 53/53 ; jest iso- 79/79 ; tsc ; IoU ≥ 0,99 des sprites Klein contre leur blockout ; boucle honnête sur les échecs (LOG, verdicts bruts, 3 tentatives avant HUMAN).

## Questions pour Guillaume
1. Revue d'ensemble des deux familles sur captures, avec remesure, avant le lot 3 ?
2. Repeindre forge_solid avec Klein (environ 0,1 $) s'il détonne ?
3. Ombre propre du socle par l'app en première tâche du lot 3 ?
4. Revoir la consigne de palette du prompt Klein avant les 39 stades restants, ou rester juge final de chacun ?
5. Commit de lancement ?
6. Archiver le texte des pages H2 et H2b ?
