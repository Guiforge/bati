# T36, spec de la repeinture (décision de Guillaume du 31/10)

Guillaume, mot pour mot (LOG 31/10) : « pour la repeinture on sui ta reco tu peux loop et spec ». La reco est celle de la page https://claude.ai/artifact/GdDmUhjsz4MrJu7k1sTS4U. Cette spec dit quoi peindre, dans quel ordre, et quand c'est fini. La fiche T36.md garde les règles.

## Ce qu'on peint, dans l'ordre

| Lot | Quoi | Sprites | Référence | Pourquoi |
| --- | --- | --- | --- | --- |
| A | Essai de modèles | 3 sprites : villageois forgeron, tente grand, chat (pose de repos) | images de l'app et sprites actuels | choisir le modèle avant de repeindre le reste (reco de la roadmap) |
| B | Palette de nuit | armory (rough, solid), heroes_hall (3 stades), tent (3), watchtower (rough, solid), wizard_tower (3), druid_grove (solid, grand) | sprite actuel en image d'entrée, même forme, palette assourdie | toits rouge vif, dalles bleu clair, murs violacés (reviews/T27-paires.md) |
| C | Stades restés en maquette | archery_range rough, dragon_lair rough, druid_grove rough, fountain rough, observatory rough, high_road solid | blockout du stade + stade peint voisin du même bâtiment | un stade gris se voit au premier palier |
| D | Lot 7 n° 10, villageois | les 7 métiers, une pose de face par métier | sprites actuels, planche du lot 7 | vraies silhouettes BD ; T26 les multiplie (habitants recolorés à partir d'eux) |
| E | Lot 7 n° 3, forêt | 3 variantes d'arbre (feuillu, conifère, bouleau ou chêne mort) | `decor/arbre_*`, planche 1-sol-et-routes | fin du pochoir aux silhouettes noires |
| F | Lot 7 n° 1, premier plan du palier 1 | tas de bois, clôture courte, lanterne sur poteau | blockout à faire par iso-blender d'abord | le premier écran d'un nouveau joueur est vide |
| G | Clips des animaux (T31 point 3) | chat et poule : les poses du champ `aPeindre` de vieAnimaux.ts, au plus 4 par bête | sprite de repos actuel | les comportements de T31 n'ont que des poses provisoires |

Hors V1 (décision) : training_dummy, high_road (lisibilité de la croissance), le reste du lot 7 (2 jour, 7 et 9 hors palette, 13 bulle), le rat (après G si le budget reste).

## La boucle, par sprite
1. iso-artist peint par le garde-budget, avec la référence du tableau, détoure, mesure (audit A), monte la planche (candidat à côté de la référence et du blockout, et pour B et C les autres stades du même bâtiment).
2. Un iso-art-reviewer neuf juge avec REVUE-PROMPT.md tel quel. Les types de la CHECKLIST : B et C « Bâtiment (série de stades) », D « Villageois », E « Décor (bosquet, rochers) », F « Décor », G « Villageois (planche de dessins) ».
3. Échec : un nouveau tour avec la raison du regard neuf dans la consigne, 3 tours au plus par sprite ; on garde le meilleur tour. Au plafond, le sprite passe à Guillaume avec sa planche.
4. Accepté : entrée dans l'index des sprites (maquettes et `assets/images/village/iso/`), provenance écrite, BOARD.md à jour.
5. Après chaque lot : une planche « Ensemble posé sur le sol » du lot à l'écran (qa, dev-iso) et un regard neuf : un sprite juste seul qui jure dans l'ensemble repart.

## Budget et ordre
- Plafond de la tâche : 10 $ (dépensé V1 avant : environ 6 $ ; plafond V1 : 40 $). Ordre A, B, C, D, E, F, G : si le budget tombe, on s'arrête là, et ce qui reste passe après la V1.
- Le modèle gagnant de A sert à B à G ; un lot ne change pas de modèle en cours.

## Fini quand
- Chaque sprite des lots A à G est accepté, ou rendu à Guillaume au plafond avec sa planche.
- La planche « Ensemble posé sur le sol » de chaque lot passe.
- `npx jest iso- --testPathIgnorePatterns=/node_modules/` vert (maquettes, détail, mémoire de décodage : un nouveau sprite ne fait pas passer la pire zone au-dessus de son budget).
- budget.json, BOARD.md, provenance et rapport `reports/T36.md` à jour.
