# Inventaire des animations du village (01/11)

Demandé par Guillaume : pour chaque animation, est-elle dessinée (peinte comme les bâtiments) ou non ? Lecture du code à la tête 891f6da2. Fichiers dans `components/village/iso/`, assets dans `assets/images/village/iso/`. Une case fait 48 dp de large.

| # | Animation | Fichier | Quand | Dessinée ? | Taille | À reprendre |
|---|---|---|---|---|---|---|
| 1 | Ailes du moulin | IsoCarteDemo.tsx:838 | vague | oui (`windmill_sails.webp`) | moulin | non |
| 2 | Croissance (fondu, échafaudage) | IsoCroissance.tsx:108 | montée | oui | bâtiment | non |
| 3 | Marcheurs (villageois) | IsoCarteDemo.tsx:1407, marcheurs.ts | vague, 4 au plus | face peinte ; **dos en maquette** (`blockout/pieces/villageois_*_dos`) | ~19 dp | oui, 7 dos |
| 4 | Habitants posés | habitants.ts, reposTable.ts | repos | oui (10 poses) | ~19 dp | non |
| 5 | Chat, poule, corbeau au sol | IsoCarteDemo.tsx:1251, vieAnimaux.ts | vague, 2 bêtes | **8 images sur 9 en maquette** (seul `animal_chat_repos` peint) | ~11 dp | oui |
| 6 | Rat | petitsDetails.tsx:167, vivant.ts:154 | une vague sur deux, 1 seul | **non** (4 formes SVG, sans pattes) | 29 x 14,5 dp | oui |
| 7 | Oiseaux en V | petitsDetails.tsx:36, vivant.ts:56 | une traversée par vague, jour | **non** (un Path SVG de 4 oiseaux écrasé en Y) | 138 x 66 dp | oui |
| 8 | Corbeau posé sur un toit | CorbeauxToits.tsx:122 | repos | **non** (SVG) | 11 x 8 dp | oui |
| 9 | Corbeau qui s'envole | CorbeauxToits.tsx:156 | au toucher, jour | **non** (SVG) | 18 x 10 dp | oui |
| 10 | Flammes des foyers | FeuxDessines.tsx:109, feux.ts | vague, nuit | **non** (SVG) | ≥ 12 dp | oui |
| 11 | Fumées de cheminée | FeuxDessines.tsx:121, feux.ts | vague | **non** (SVG) | 26 dp, montée 36 | oui |
| 12 | Lucioles | petitsDetails.tsx:108 | vague, nuit | non (points SVG) | 1-3 dp | peu visible |
| 13 | Effets de métier (runes, lucioles du druide, braise, étoile, gouttes, étincelles) | Effets.tsx:83, effets.ts | 2 par vague | **non** (SVG) | 100 dp réduit | oui, 6 effets |
| 14 | Lueur « prêt à réclamer » | Reclame.tsx:79 | vague | **non** (SVG) | ≥ 22 dp | oui |
| 15 | Marteau (réclame) | Marteau.tsx | bâtiment prêt | **non** (icône SVG) | petite | oui |
| 16 | Éclat légendaire | Fierte.tsx:189 | vague | **non** (étoile SVG) | 14 dp | oui |
| 17 | Bannières qui ondulent | Fierte.tsx:150 | vague | **non** (tissu SVG) | 24 x 27 dp | oui |
| 18 | Fenêtres allumées | VeillesDessinees.tsx:133 | nuit | **non** (polygones SVG sur le sprite) | vitres | oui |
| 19 | Porte allumée | VeillesDessinees.tsx:215 | nuit | **non** (SVG) | 68 dp | oui |
| 20 | Vitres de fierté | Fierte.tsx:90 | nuit | **non** (SVG) | vitres | oui |
| 21 | Flaques de lueur au sol | lueurs.ts, AmbianceCarte.tsx | nuit, fixes | **non** (ellipses) | 0,85 à 1,5 case | oui (bord dur, dessinées sur les bâtiments) |
| 22 | Reflets de l'eau | IsoCarteDemo.tsx:~960, reflets.ts | vague | **non** (traits de 2 dp ; l'eau elle-même est peinte) | 6 dp | oui |
| 23 | Cascade | `pieces/eau_cascade_*.webp` | repos | oui (immobile) | pièce | non |
| 24 | Poussière de chantier | Chantier.tsx:124 | chantier | **non** (SVG) | 72 x 36 dp | oui |
| 25 | Bouffée de pose | Chantier.tsx:201 | pose | **non** (SVG) | 72 x 36 dp | oui |
| 26 | Éclat de révélation | Revelation.tsx:52 | révélation | **planche factice** + SVG | 64 dp | oui |
| 27 | Onde et poussière de révélation | Revelation.tsx:182 | révélation | **non** (SVG) | portée 700 dp | oui |
| 28 | Statue du blason | Statue.tsx | repos | oui | pièce | non |
| 29 | Forêt autour (fondu d'ouverture) | Monde.tsx:22 | ouverture | oui (`mondeTuiles/*`) | plein cadre | non |
| 30 | Feu de camp | `campfire/*.nuit.webp` | nuit | bâtiment peint, **flamme SVG** | pièce | la flamme |

## En bref
- **8 sur 30 sont dessinées** : moulin, croissance, habitants posés, statue, forêt, cascade, bâtiment du feu de camp, face des marcheurs.
- **22 sur 30 ne le sont pas** : tout ce qui bouge en dehors du moulin et de la croissance est en SVG ou en `View` colorée. S'y ajoutent des images peintes mais incomplètes : les dos des 7 villageois, 8 poses d'animaux sur 9 en maquette, et la planche factice de la révélation.
- **Souris** : un seul rat SVG de 29 dp, plus gros qu'un villageois, une vague sur deux, sur un seul trajet de 3 cases devant la ferme. Guillaume veut plusieurs souris peintes, beaucoup plus petites (environ 8 à 10 dp), rapides, à plusieurs endroits.
- **Oiseaux en V** : un seul Path SVG de 138 dp (4 oiseaux qui s'écrasent ensemble), tiré hors de la couche caméra. Guillaume les voit passer sous la carte au lieu de passer au-dessus.
- **À reprendre d'abord** : dos des marcheurs, poses d'animaux, flammes et fumées, fenêtres et portes de nuit, souris et oiseaux.
